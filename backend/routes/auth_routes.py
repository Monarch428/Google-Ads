# routes/auth_routes.py

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from database import get_db
from schemas.user_schema import UserCreate, UserLogin, UserResponse
from services.auth_service import register_user, login_user, create_access_token, create_refresh_token, decode_token
import requests
import urllib.parse
import os, secrets, json

# ✅ IMPORTANT: Remove prefix from router if it's added in main.py
router = APIRouter(
    tags=["Authentication"]
)

# Google OAuth Configuration (from environment variables)
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
    is_local = ("localhost" in (os.getenv("FRONTEND_BASE_URL","") + os.getenv("GOOGLE_REDIRECT_URI",""))) \
               or ("127.0.0.1" in (os.getenv("FRONTEND_BASE_URL","") + os.getenv("GOOGLE_REDIRECT_URI","")))
    cookie_args = dict(
        httponly=True,
        secure=not is_local,     # ✅ Secure=False for localhost, True in prod
        samesite="none" if not is_local else "lax",  # Lax works locally without HTTPS
        path="/",
    )
    resp.set_cookie("access_token", access_token, max_age=60*60*24, **cookie_args)
    resp.set_cookie("refresh_token", refresh_token, max_age=60*60*24*30, **cookie_args)

@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    user = register_user(db, user_data)
    if "error" in user:
        raise HTTPException(status_code=400, detail=user["error"])
    return user


@router.post("/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    token_data = login_user(db, user_data)
    if "error" in token_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=token_data["error"])
    return token_data


# ✅ Step 1: Generate Google Auth URL and REDIRECT
@router.get("/google-connect")
async def google_connect():
    """
    Redirects user to Google OAuth consent screen.
    After authorization, Google will redirect to /auth/google-callback
    """
    print("🚀 /google-connect endpoint hit!")
    
    if not all([CLIENT_ID, CLIENT_SECRET, REDIRECT_URI]):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Google OAuth not configured",
                "details": {
                    "client_id": "SET" if CLIENT_ID else "MISSING",
                    "client_secret": "SET" if CLIENT_SECRET else "MISSING",
                    "redirect_uri": REDIRECT_URI or "MISSING"
                }
            }
        )
    state = secrets.token_urlsafe(24)
    # response.set_cookie("oauth_state", state, httponly=True, secure=True, samesite="none", max_age=600, path="/")
    params = {
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT_URI,
            "response_type": "code",
            "scope": SCOPE,
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
            "state": state,
    }
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    # return RedirectResponse(url=auth_url)
    #     print(f"✅ Redirecting to: {auth_url[:100]}...")
    #     return RedirectResponse(url=auth_url)
        
    # except Exception as e:
    #     print(f"❌ Error in google_connect: {str(e)}")
    #     raise HTTPException(
    #         status_code=500, 
    #         detail=f"Failed to generate Google Auth URL: {str(e)}"
    #     )
    resp = RedirectResponse(url=auth_url, status_code=302)

    is_local = "localhost" in (REDIRECT_URI or "") or "127.0.0.1" in (REDIRECT_URI or "")
    cookie_args = dict(
        httponly=True,
        secure=not is_local,                 # False on localhost
        samesite="none" if not is_local else "lax",  # lax for localhost http
        path="/",
        max_age=600,
    )
    resp.set_cookie("oauth_state", state, **cookie_args)
    return resp

# ✅ Step 2: Google Callback — Exchange code for refresh token
@router.get("/google-callback")
async def google_callback(
    request: Request, 
    # response: Response,   
    code: str | None = None, 
    state: str | None = None, 
    db: Session = Depends(get_db)
    ):
    """
    Handle callback from Google OAuth.
    Exchanges authorization code for access_token and refresh_token.
    """
    print(f"🔄 /google-callback hit! Code: {code[:20] if code else 'None'}")
    
    # if error:
    #     raise HTTPException(
    #         status_code=400, 
    #         detail=f"Google OAuth error: {error}"
    #     )
    
    if not code:
        return RedirectResponse(f"{FRONTEND_BASE}/login?error=missing_code")
    
    if not state or request.cookies.get("oauth_state") != state:
        return RedirectResponse(f"{FRONTEND_BASE}/login?error=state_mismatch")
    
    try:
        token_res = requests.post(
            TOKEN_URL,
            data = {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": REDIRECT_URI
        },
        timeout=10,
        )
    except requests.RequestException:
        return RedirectResponse(f"{FRONTEND_BASE}/login?error=token_exchange_failed")
    
    if token_res.status_code != 200:
        return RedirectResponse(f"{FRONTEND_BASE}/login?error=token_exchange_bad_status")
    
    tokens = token_res.json()
    access_token_google = tokens.get("access_token")
    if not access_token_google:
        return RedirectResponse(f"{FRONTEND_BASE}/login?error=no_google_access_token")
    
    # Get userinfo to read verified email
    ui_res = requests.get(USERINFO_URL, headers={"Authorization": f"Bearer {access_token_google}"}, timeout=10)
    if ui_res.status_code != 200:
        return RedirectResponse(f"{FRONTEND_BASE}/login?error=userinfo_failed")
    info = ui_res.json()
    email = info.get("email")
    email_verified = info.get("email_verified", False)
    if not email or not email_verified:
        return RedirectResponse(f"{FRONTEND_BASE}/login?error=email_unverified")

    # Validate email exists in DB
    from models import user_model
    user = db.query(user_model.UserModel).filter(user_model.UserModel.email == email).first()
    if not user:
        return RedirectResponse(f"{FRONTEND_BASE}/login?error=not_registered")

    # Mint our app tokens (same as password login)
    app_access = create_access_token(sub=user.email, extra={
        "google": {
            "sub": info.get("sub"),
            "name": info.get("name"),
            "picture": info.get("picture"),
            "hd": info.get("hd"),
        }
    })
    app_refresh = create_refresh_token(sub=user.email)

    user_payload = {
        "id": user.id,
        "name": getattr(user, "name", None),
        "email": user.email,
        "role": getattr(user, "role", None),
        "is_active": getattr(user, "is_active", True),
        "company_name": getattr(user, "company_name", None),
        "company_email": getattr(user, "company_email", None),
        "company_phone": getattr(user, "company_phone", None),
        "company_website": getattr(user, "company_website", None),
        "company_address": getattr(user, "company_address", None),
    }

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
    resp.set_cookie("access_token", app_access, max_age=60*60*24, **cookie_args)
    resp.set_cookie("refresh_token", app_refresh, max_age=60*60*24*30, **cookie_args)

    # clear one-time state cookie
    resp.delete_cookie("oauth_state", path="/")
    return resp

    # # Set HttpOnly cookies so frontend can just call /auth/me
    # _set_session_cookies(response, app_access, app_refresh)
    # response.delete_cookie("oauth_state", path="/")

    # # Redirect to dashboard
    # response.status_code = 302
    # response.headers["Location"] = FRONTEND_DASHBOARD_URL
    # return response

# ---------- Who am I (reads access_token cookie or Authorization header) ----------
@router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        # allow Authorization: Bearer
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

    return {
        "id": user.id,
        "email": user.email,
        "name": getattr(user, "name", None),
        "role": getattr(user, "role", None),
        "company_name": getattr(user, "company_name", None),
        "company_email": getattr(user, "company_email", None),
        "company_phone": getattr(user, "company_phone", None),
        "company_website": getattr(user, "company_website", None),
        "company_address": getattr(user, "company_address", None),
        "google": data.get("google"),
    }

# ---------- Refresh access token using refresh_token cookie or body ----------
@router.post("/refresh")
def refresh(request: Request):
    token = request.cookies.get("refresh_token")
    if not token:
        # optional: accept JSON body { "refresh_token": "..." }
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
    # also rotate access cookie for cookie-based auth
    resp.set_cookie("access_token", new_access, httponly=True, secure=True, samesite="none", path="/", max_age=60*60*24)
    return resp


# ✅ Test endpoint
@router.get("/google-config-test")
async def test_google_config():
    """Test endpoint to verify Google OAuth configuration."""
    return {
        "client_id_set": bool(CLIENT_ID),
        "client_id_preview": CLIENT_ID[:30] + "..." if CLIENT_ID else None,
        "client_secret_set": bool(CLIENT_SECRET),
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPE,
        "status": "✅ Configuration OK" if all([CLIENT_ID, CLIENT_SECRET, REDIRECT_URI]) else "❌ Missing credentials"
    }