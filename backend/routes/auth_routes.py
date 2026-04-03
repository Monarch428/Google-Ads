# routes/auth_routes.py

import os
import json
import base64
import secrets
import urllib.parse
import logging
import requests

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session

from database import get_db
from schemas.user_schema import UserCreate, UserLogin, UserResponse
from services.auth_service import (
    register_user,
    login_user,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from services.google_oauth_service import (
    get_global_mcc_credentials,
    propagate_refresh_token_to_all_clients,
    save_google_account,
)
from utils.auth_dependencies import require_admin_user
from models.client_model import Client
from models.google_ads_account import GoogleAdsAccount

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter(tags=["Authentication"])

# ── Google OAuth Configuration ────────────────────────────────────────────────
CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
SCOPE = "openid email profile https://www.googleapis.com/auth/adwords"
FRONTEND_DASHBOARD_URL = os.getenv("FRONTEND_DASHBOARD_URL", "http://localhost:3000/")
FRONTEND_BASE = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

print(f"🔍 OAuth Config Loaded:")
print(f"   CLIENT_ID: {CLIENT_ID[:20] if CLIENT_ID else 'NOT SET'}...")
print(f"   CLIENT_SECRET: {'SET' if CLIENT_SECRET else 'NOT SET'}")
print(f"   REDIRECT_URI: {REDIRECT_URI}")


def _set_session_cookies(resp: Response, access_token: str, refresh_token: str):
    is_local = (
        "localhost" in (os.getenv("FRONTEND_BASE_URL", "") + os.getenv("GOOGLE_REDIRECT_URI", ""))
        or "127.0.0.1" in (os.getenv("FRONTEND_BASE_URL", "") + os.getenv("GOOGLE_REDIRECT_URI", ""))
    )
    cookie_args = dict(
        httponly=True,
        secure=not is_local,
        samesite="none" if not is_local else "lax",
        path="/",
    )
    resp.set_cookie("access_token", access_token, max_age=60 * 60 * 24, **cookie_args)
    resp.set_cookie("refresh_token", refresh_token, max_age=60 * 60 * 24 * 30, **cookie_args)


def _encode_state(nonce: str, client_db_id: str | None, mode: str | None = None) -> str:
    payload = {"nonce": nonce, "client_db_id": client_db_id, "mode": mode}
    raw = json.dumps(payload).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8")


def _decode_state(state_str: str) -> dict | None:
    try:
        raw = base64.urlsafe_b64decode(state_str.encode("utf-8"))
        return json.loads(raw.decode("utf-8"))
    except Exception:
        return None


# ── Register ──────────────────────────────────────────────────────────────────
@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    user = register_user(db, user_data)
    if isinstance(user, dict) and "error" in user:
        raise HTTPException(status_code=400, detail=user["error"])
    return user


# ── Login ─────────────────────────────────────────────────────────────────────
@router.post("/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    token_data = login_user(db, user_data)
    if isinstance(token_data, dict) and "error" in token_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=token_data["error"])
    return token_data


# ── Who am I ──────────────────────────────────────────────────────────────────
@router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("authorization") or request.headers.get("Authorization")
        if not auth or not auth.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        token = auth.split(" ", 1)[1]

    try:
        data = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    email = data.get("sub")
    from models import user_model
    user = db.query(user_model.UserModel).filter(user_model.UserModel.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # ✅ Use from_orm_with_access so module_access is included
    result = UserResponse.from_orm_with_access(user).model_dump()
    result["google"] = data.get("google")
    return result


# ── Refresh Token ─────────────────────────────────────────────────────────────
@router.post("/refresh")
def refresh(request: Request):
    token = request.cookies.get("refresh_token")
    if not token:
        try:
            body = request.json()
        except Exception:
            body = None
        if body and isinstance(body, dict):
            token = body.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    try:
        data = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if data.get("typ") != "refresh":
        raise HTTPException(status_code=401, detail="Wrong token type")

    email = data.get("sub")
    new_access = create_access_token(sub=email)
    resp = JSONResponse({"access_token": new_access, "token_type": "bearer"})
    resp.set_cookie(
        "access_token", new_access,
        httponly=True, secure=True, samesite="none", path="/", max_age=60 * 60 * 24
    )
    return resp


# ── Google OAuth: connect ─────────────────────────────────────────────────────
@router.get("/google-connect")
async def google_connect(client_db_id: str | None = None, mode: str | None = None):
    print("🚀 /google-connect endpoint hit!")

    if not all([CLIENT_ID, CLIENT_SECRET, REDIRECT_URI]):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Google OAuth not configured",
                "details": {
                    "client_id": "SET" if CLIENT_ID else "MISSING",
                    "client_secret": "SET" if CLIENT_SECRET else "MISSING",
                    "redirect_uri": REDIRECT_URI or "MISSING",
                },
            },
        )

    nonce = secrets.token_urlsafe(24)
    state_token = _encode_state(nonce, client_db_id, mode=mode)

    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state_token,
    }
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    resp = RedirectResponse(url=auth_url, status_code=302)

    is_local = "localhost" in (REDIRECT_URI or "") or "127.0.0.1" in (REDIRECT_URI or "")
    cookie_args = dict(
        httponly=True,
        secure=not is_local,
        samesite="none" if not is_local else "lax",
        path="/",
        max_age=600,
    )
    resp.set_cookie("oauth_state", state_token, **cookie_args)
    print(f" → Redirecting to Google OAuth URL (client_db_id={client_db_id})")
    return resp


# ── Google OAuth: callback ────────────────────────────────────────────────────
@router.get("/google-callback")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    db: Session = Depends(get_db),
):
    print(f"🔄 /google-callback hit! Code: {code[:20] if code else 'None'} state={state and state[:20]}")

    if not code:
        return RedirectResponse(f"{FRONTEND_BASE}/login?error=missing_code")

    cookie_state = request.cookies.get("oauth_state")
    if not state or not cookie_state or cookie_state != state:
        print("State mismatch or missing cookie. cookie_state:", cookie_state, "state:", state)
        return RedirectResponse(f"{FRONTEND_BASE}/login?error=state_mismatch")

    decoded = _decode_state(state)
    client_db_id = decoded.get("client_db_id") if decoded else None
    flow_mode = decoded.get("mode") if decoded else None
    is_client_connect_flow = bool(client_db_id)
    is_mcc_connect_flow = flow_mode == "mcc"

    if client_db_id:
        print(f"Decoded client_db_id from state: {client_db_id}")
    else:
        print("No client_db_id encoded in state; refresh token not persisted automatically")

    try:
        token_res = requests.post(
            TOKEN_URL,
            data={
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": REDIRECT_URI,
            },
            timeout=10,
        )
    except requests.RequestException as e:
        print("Token exchange network error:", str(e))
        return RedirectResponse(f"{FRONTEND_BASE}/login?error=token_exchange_failed")

    try:
        tokens = token_res.json()
    except Exception:
        tokens = None

    if token_res.status_code != 200:
        print("❌ Token exchange failed:", token_res.status_code, tokens)
        return RedirectResponse(f"{FRONTEND_BASE}/login?error=token_exchange_bad_status")

    try:
        print("TOKENS FROM GOOGLE (truncated 2000 chars):\n", json.dumps(tokens)[:2000])
    except Exception:
        print("TOKENS FROM GOOGLE: (could not JSONify tokens)")

    access_token_google = tokens.get("access_token")
    refresh_token_google = tokens.get("refresh_token")

    if not access_token_google:
        print("No access_token returned, response:", tokens)
        return RedirectResponse(f"{FRONTEND_BASE}/login?error=no_google_access_token")

    # Persist refresh token for client connect flow
    if refresh_token_google and client_db_id:
        try:
            save_google_account(
                db=db,
                client_db_id=int(client_db_id),
                tokens={"refresh_token": refresh_token_google},
                login_customer_id=None,
                developer_token=os.getenv("DEVELOPER_TOKEN"),
            )
            print(f"✅ Persisted refresh_token into google_ads_accounts for client_id={client_db_id}")
        except HTTPException as exc:
            print(f"❌ Failed to persist refresh token to DB for client_id={client_db_id}: {exc.detail}")

    # MCC flow
    if is_mcc_connect_flow:
        if not refresh_token_google:
            return RedirectResponse(f"{FRONTEND_BASE}/dashboard?mcc_oauth=error&reason=missing_refresh")

        try:
            result = propagate_refresh_token_to_all_clients(
                db=db,
                refresh_token=refresh_token_google,
                login_customer_id=os.getenv("LOGIN_CUSTOMER_ID"),
            )
            print("✅ Propagated MCC refresh token across clients", result)
        except HTTPException as exc:
            return RedirectResponse(f"{FRONTEND_BASE}/dashboard?mcc_oauth=error&reason={exc.detail}")

        redirect_target = f"{FRONTEND_BASE}/dashboard?mcc_oauth=success&updated={result.get('updated')}"
        resp = RedirectResponse(url=redirect_target, status_code=302)
        resp.delete_cookie("oauth_state", path="/")
        return resp

    # Client connect flow — finish early
    if is_client_connect_flow:
        redirect_target = f"{FRONTEND_BASE}/dashboard?google_auth=success&client_id={client_db_id}"
        resp = RedirectResponse(url=redirect_target, status_code=302)
        resp.delete_cookie("oauth_state", path="/")
        logger.info("Google OAuth callback completed for client connection (client_db_id=%s)", client_db_id)
        return resp

    # App login flow — fetch userinfo
    ui_res = requests.get(USERINFO_URL, headers={"Authorization": f"Bearer {access_token_google}"}, timeout=10)
    if ui_res.status_code != 200:
        print("Failed to fetch userinfo:", ui_res.status_code, ui_res.text[:500])
        return RedirectResponse(f"{FRONTEND_BASE}/login?error=userinfo_failed")

    info = ui_res.json()
    email = info.get("email")
    email_verified = info.get("email_verified", False)
    if not email or not email_verified:
        logger.warning("Email unverified or missing in userinfo: %s", info)
        return RedirectResponse(f"{FRONTEND_BASE}/login?error=email_unverified")

    from models import user_model
    user = db.query(user_model.UserModel).filter(user_model.UserModel.email == email).first()
    if not user:
        logger.info("User not registered in app: %s", email)
        return RedirectResponse(f"{FRONTEND_BASE}/login?error=not_registered")

    # Persist refresh token to clients table if email matches
    try:
        if refresh_token_google:
            client_row = db.query(Client).filter(Client.email == email).first()
            if client_row:
                client_row.refresh_token = refresh_token_google
                db.commit()
                logger.info("Saved refresh_token into clients table for client id=%s", client_row.id)
            else:
                logger.info("No client with email=%s found. Skipping auto-persist.", email)
        else:
            logger.info("No refresh_token returned by Google (tokens keys: %s)", list(tokens.keys()))
    except Exception as e:
        db.rollback()
        logger.exception("Failed to persist refresh token to DB: %s", e)

    # Mint app tokens
    app_access = create_access_token(
        sub=user.email,
        extra={
            "google": {
                "sub": info.get("sub"),
                "name": info.get("name"),
                "picture": info.get("picture"),
                "hd": info.get("hd"),
            }
        },
    )
    app_refresh = create_refresh_token(sub=user.email)

    # ✅ Use from_orm_with_access so module_access is included in Google login too
    user_payload = UserResponse.from_orm_with_access(user).model_dump()

    auth_payload = {
        "access_token": app_access,
        "refresh_token": app_refresh,
        "token_type": "bearer",
        "user": user_payload,
    }

    encoded_payload = urllib.parse.quote(json.dumps(auth_payload))
    redirect_target = f"{FRONTEND_BASE}/auth/google/callback?auth={encoded_payload}"

    resp = RedirectResponse(url=redirect_target, status_code=302)

    is_local = "localhost" in (REDIRECT_URI or "") or "127.0.0.1" in (REDIRECT_URI or "")
    cookie_args = dict(
        httponly=True,
        secure=not is_local,
        samesite="none" if not is_local else "lax",
        path="/",
    )
    resp.set_cookie("access_token", app_access, max_age=60 * 60 * 24, **cookie_args)
    resp.set_cookie("refresh_token", app_refresh, max_age=60 * 60 * 24 * 30, **cookie_args)
    resp.delete_cookie("oauth_state", path="/")

    logger.info("Google OAuth callback completed for user email=%s", email)
    return resp


# ── Config test ───────────────────────────────────────────────────────────────
@router.get("/google-config-test")
async def test_google_config():
    return {
        "client_id_set": bool(CLIENT_ID),
        "client_id_preview": CLIENT_ID[:30] + "..." if CLIENT_ID else None,
        "client_secret_set": bool(CLIENT_SECRET),
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPE,
        "status": "✅ Configuration OK" if all([CLIENT_ID, CLIENT_SECRET, REDIRECT_URI]) else "❌ Missing credentials",
    }


# ── MCC Status ────────────────────────────────────────────────────────────────
@router.get("/google-mcc-status")
async def google_mcc_status(
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_user),
):
    credentials = get_global_mcc_credentials(db)
    total_clients = db.query(Client).count()
    connected_accounts = (
        db.query(GoogleAdsAccount)
        .filter(GoogleAdsAccount.refresh_token.isnot(None))
        .count()
    )

    return {
        "connected": bool(credentials),
        "login_customer_id": credentials.get("login_customer_id") if credentials else None,
        "connected_clients": connected_accounts,
        "total_clients": total_clients,
    }
