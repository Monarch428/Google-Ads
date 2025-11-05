# services/google_ads_service.py
import os
import requests
from sqlalchemy.orm import Session
from models.google_ads_account import GoogleAdsAccount
from models.campaign_model import Campaign
from database import SessionLocal
from datetime import datetime, date

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_ADS_QUERY = """
    SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_micros
    FROM campaign
    WHERE segments.date DURING LAST_7_DAYS
"""

def refresh_access_token(refresh_token: str) -> dict:
    payload = {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    r = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=15)
    r.raise_for_status()
    return r.json()  # contains access_token and expires_in

def fetch_campaign_metrics_for_client(db: Session, client_db_id: int):
    account = db.query(GoogleAdsAccount).filter(GoogleAdsAccount.client_id == client_db_id).first()
    if not account or not account.refresh_token:
        return {"error": "No connected Google Ads account or missing refresh_token"}

    tokens = refresh_access_token(account.refresh_token)
    access_token = tokens.get("access_token")
    # Here you would use google-ads client or call Google Ads API with proper headers.
    # For real requests use the official google-ads client configured with developer token and login_customer_id.
    # This placeholder returns success to indicate token refresh works.
    return {"status": "ok", "access_token_expires_in": tokens.get("expires_in")}


def fetch_campaign_metrics_all(db: Session):
    # loop over all stored google accounts and fetch metrics
    accounts = db.query(GoogleAdsAccount).all()
    results = []
    for a in accounts:
        res = fetch_campaign_metrics_for_client(db, a.client_id)
        results.append({a.client_id: res})
    return results
