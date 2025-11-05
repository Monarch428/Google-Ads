# services/google_oauth_service.py
import os
import requests
from urllib.parse import urlencode
from sqlalchemy.orm import Session
from typing import Optional
from models.google_ads_account import GoogleAdsAccount

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

def build_oauth_consent_url(redirect_uri: str, state: Optional[str] = None) -> str:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    scope = os.getenv("GOOGLE_ADS_SCOPE", "https://www.googleapis.com/auth/adwords")
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": scope,
        "access_type": "offline",   # important to get refresh_token
        "prompt": "consent",        # forces refresh_token on repeated auths
        "include_granted_scopes": "true",
    }
    if state:
        params["state"] = state
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def exchange_code_for_tokens(code: str, redirect_uri: str) -> dict:
    """
    Exchange authorization code for access_token + refresh_token
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")

    payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    resp = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=15)
    resp.raise_for_status()
    return resp.json()  # contains access_token, expires_in, refresh_token (if granted), scope, token_type


def save_google_account(db: Session, client_db_id: int, tokens: dict, login_customer_id: Optional[str] = None, developer_token: Optional[str] = None):
    """
    Upsert GoogleAdsAccount record storing refresh_token and related info.
    """
    refresh_token = tokens.get("refresh_token")
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")

    existing = db.query(GoogleAdsAccount).filter(GoogleAdsAccount.client_id == client_db_id).first()
    if existing:
        if refresh_token:
            existing.refresh_token = refresh_token
        if login_customer_id:
            existing.login_customer_id = login_customer_id
        if developer_token:
            existing.developer_token = developer_token
        existing.google_client_id = google_client_id
        existing.google_client_secret = google_client_secret
    else:
        account = GoogleAdsAccount(
            client_id=client_db_id,
            developer_token=developer_token,
            google_client_id=google_client_id,
            google_client_secret=google_client_secret,
            refresh_token=refresh_token,
            login_customer_id=login_customer_id
        )
        db.add(account)
    db.commit()
    return {"status": "ok"}
