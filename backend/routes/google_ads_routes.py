# routes/google_ads_routes.py
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
import os

from database import get_db
from services.google_oauth_service import build_oauth_consent_url, exchange_code_for_tokens, save_google_account

router = APIRouter(
    # prefix="/google-ads", 
    tags=["Google Ads"])

# Step 1: Redirect user to Google consent screen
@router.get("/connect")
def connect_google_ads(client_db_id: int, db: Session = Depends(get_db)):
    """
    client_db_id: the id of your internal clients table (the client record)
    Redirects user to Google consent page. After grant, Google will call /callback
    """
    redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI")
    if not redirect_uri:
        raise HTTPException(status_code=500, detail="GOOGLE_OAUTH_REDIRECT_URI not configured")
    # You can pass state to validate the flow (e.g. client_db_id) but here we embed client_db_id as query param on redirect_uri
    # We'll append client_db_id to redirect_uri so callback will receive it
    # e.g. redirect_uri = http://localhost:8000/google-ads/callback?client_db_id=123
    redirect_with_client = f"{redirect_uri}?client_db_id={client_db_id}"
    consent_url = build_oauth_consent_url(redirect_with_client)
    return RedirectResponse(consent_url)


# Step 2: Callback - Google will redirect to this endpoint with ?code=...
@router.get("/callback")
def oauth_callback(request: Request, code: str = None, error: str = None, client_db_id: int = None, db: Session = Depends(get_db)):
    """
    Handles the OAuth callback and stores the refresh_token for the client (client_db_id).
    """
    redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI")
    if error:
        return JSONResponse({"error": error}, status_code=400)
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    # exchange code for tokens
    try:
        tokens = exchange_code_for_tokens(code=code, redirect_uri=redirect_uri + (f"?client_db_id={client_db_id}" if client_db_id else ""))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"token exchange failed: {e}")

    # Optionally: find login_customer_id using Google Ads API or read from tokens (not directly in tokens)
    login_customer_id = None
    # Save account
    save_google_account(db=db, client_db_id=client_db_id, tokens=tokens, login_customer_id=login_customer_id, developer_token=os.getenv("DEVELOPER_TOKEN"))
    return JSONResponse({"status": "connected", "client_db_id": client_db_id})
