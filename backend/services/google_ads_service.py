# services/google_ads_service.py
import os
import requests
from datetime import date
from typing import Dict, List

from sqlalchemy.orm import Session

from models.campaign_model import Campaign
from models.google_ads_account import GoogleAdsAccount

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_ADS_QUERY = """
    SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_micros
    FROM campaign
    WHERE segments.date DURING LAST_7_DAYS
"""

DEFAULT_LOOKBACK_DAYS = 30

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


def _scale_int(value: int | float | None, scale_factor: float) -> int:
    base_value = float(value or 0)
    return max(int(round(base_value * scale_factor)), 0)


def _scale_float(value: int | float | None, scale_factor: float) -> float:
    base_value = float(value or 0)
    return round(base_value * scale_factor, 2)


def _build_metrics_payload(
    client_db_id: int,
    start_date: date,
    end_date: date,
    campaigns: List[Campaign],
) -> Dict[str, object]:
    days_selected = (end_date - start_date).days + 1
    scale_factor = max(days_selected / DEFAULT_LOOKBACK_DAYS, 0)

    totals = {"impressions": 0, "clicks": 0, "conversions": 0, "cost": 0.0}
    breakdown = []

    for campaign in campaigns:
        impressions = _scale_int(campaign.impressions, scale_factor)
        clicks = _scale_int(campaign.clicks, scale_factor)
        conversions = _scale_int(campaign.conversions, scale_factor)
        cost = _scale_float(campaign.cost, scale_factor)

        ctr = round((clicks / impressions) * 100, 2) if impressions else 0.0
        cpc = round(cost / clicks, 2) if clicks else 0.0

        totals["impressions"] += impressions
        totals["clicks"] += clicks
        totals["conversions"] += conversions
        totals["cost"] += cost

        breakdown.append(
            {
                "id": campaign.id,
                "name": campaign.name,
                "impressions": impressions,
                "clicks": clicks,
                "conversions": conversions,
                "cost": round(cost, 2),
                "ctr": ctr,
                "cpc": cpc,
            }
        )

    totals["cost"] = round(totals["cost"], 2)

    return {
        "client_id": client_db_id,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "days": days_selected,
        "totals": totals,
        "campaigns": breakdown,
    }


def fetch_daily_metrics_for_client(db: Session, client_db_id: int, day: date) -> Dict[str, object]:
    """Return scaled campaign metrics for a single day."""

    campaigns = db.query(Campaign).filter(Campaign.client_id == client_db_id).all()
    if not campaigns:
        raise ValueError("No campaigns found for this client")

    return _build_metrics_payload(client_db_id, day, day, campaigns)


def fetch_custom_range_metrics_for_client(
    db: Session, client_db_id: int, start_date: date, end_date: date
) -> Dict[str, object]:
    """Return scaled campaign metrics for the requested date range."""

    if end_date < start_date:
        raise ValueError("End date cannot be before start date")

    campaigns = db.query(Campaign).filter(Campaign.client_id == client_db_id).all()
    if not campaigns:
        raise ValueError("No campaigns found for this client")

    return _build_metrics_payload(client_db_id, start_date, end_date, campaigns)
