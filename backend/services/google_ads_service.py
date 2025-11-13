import os
import requests
from sqlalchemy.orm import Session
from datetime import date
import logging
from fastapi import HTTPException
from models.google_ads_account import GoogleAdsAccount
from models.campaign_model import Campaign

# -------------------- Google API Endpoints --------------------
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_ADS_QUERY = """
    SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_micros
    FROM campaign
    WHERE segments.date DURING LAST_7_DAYS
"""
GOOGLE_ADS_SEARCH_URL = "https://googleads.googleapis.com/v17/customers"

# -------------------- Logger Setup --------------------
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# -------------------- STEP 1: REFRESH ACCESS TOKEN --------------------
def refresh_access_token(refresh_token: str) -> str:
    """
    Refresh the access token using stored refresh token.
    """
    payload = {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    response = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=15)
    if response.status_code != 200:
        logger.error(f"❌ Failed to refresh token: {response.text}")
        raise HTTPException(status_code=400, detail="Failed to refresh Google token")

    data = response.json()
    logger.info("✅ Access token refreshed successfully.")
    return data["access_token"]


# -------------------- STEP 2: RUN GOOGLE ADS QUERY --------------------
def run_google_ads_query(access_token: str, customer_id: str, query: str):
    """
    Run a GAQL (Google Ads Query Language) query to fetch campaign data.
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "developer-token": os.getenv("DEVELOPER_TOKEN"),
        "Content-Type": "application/json",
        "login-customer-id": customer_id,
    }

    try:
        response = requests.post(
            f"{GOOGLE_ADS_SEARCH_URL}/{customer_id}/googleAds:searchStream",
            headers=headers,
            json={"query": query},
            timeout=30,
        )
        response.raise_for_status()
        logger.info("✅ Google Ads query executed successfully.")
        return response.json()
    except Exception as e:
        logger.error(f"❌ Google Ads API query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Google Ads query failed: {e}")


# -------------------- STEP 3: SAVE CAMPAIGN DATA --------------------
def save_campaign_data(db: Session, client_db_id: int, response_data):
    """
    Parse Google Ads API data and save/update Campaign records.
    """
    saved_count = 0

    for batch in response_data:
        for row in batch.get("results", []):
            cname = row["campaign"]["name"]
            impressions = int(row["metrics"].get("impressions", 0))
            clicks = int(row["metrics"].get("clicks", 0))
            conversions = int(row["metrics"].get("conversions", 0))
            cost_micros = int(row["metrics"].get("costMicros", 0))
            campaign_date = row["segments"]["date"]

            existing = (
                db.query(Campaign)
                .filter(
                    Campaign.name == cname,
                    Campaign.client_id == client_db_id,
                    Campaign.date == campaign_date,
                )
                .first()
            )

            if existing:
                existing.impressions = impressions
                existing.clicks = clicks
                existing.conversions = conversions
                existing.cost = cost_micros / 1_000_000
            else:
                new_campaign = Campaign(
                    client_id=client_db_id,
                    name=cname,
                    impressions=impressions,
                    clicks=clicks,
                    conversions=conversions,
                    cost=cost_micros / 1_000_000,
                    date=campaign_date,
                )
                db.add(new_campaign)
                saved_count += 1

    db.commit()
    return saved_count


# -------------------- STEP 4A: CALENDAR (Custom Date Range) --------------------
def fetch_and_save_campaigns(db: Session, client_db_id: int, start_date: str, end_date: str):
    """
    Fetch Google Ads campaign data for a user-selected date range.
    """
    logger.info(f"📅 Fetching Google Ads data for {client_db_id} ({start_date} → {end_date})")

    account = db.query(GoogleAdsAccount).filter(GoogleAdsAccount.client_id == client_db_id).first()
    if not account or not account.refresh_token:
        return {"error": "❌ No connected Google Ads account or missing refresh token"}

    access_token = refresh_access_token(account.refresh_token)

    query = f"""
        SELECT 
            campaign.id, 
            campaign.name, 
            metrics.impressions, 
            metrics.clicks, 
            metrics.ctr,
            metrics.average_cpc,
            metrics.conversions, 
            metrics.cost_micros, 
            segments.date
        FROM campaign
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
        ORDER BY segments.date
    """

    response_data = run_google_ads_query(
        access_token=access_token,
        customer_id=account.login_customer_id or os.getenv("LOGIN_CUSTOMER_ID"),
        query=query,
    )

    saved_count = save_campaign_data(db, client_db_id, response_data)

    return {
        "status": "success",
        "saved_records": saved_count,
        "period": f"{start_date} → {end_date}",
        "message": f"✅ Google Ads data fetched and saved between {start_date} and {end_date}",
    }


# -------------------- STEP 4B: DAILY AUTO FETCH --------------------
def fetch_and_save_daily_campaigns(db: Session, client_db_id: int):
    """
    ✅ Automatically fetch today's Google Ads data (based on current date)
    """
    today = date.today().strftime("%Y-%m-%d")
    logger.info(f"📆 Auto fetching Google Ads data for {today}")

    return fetch_and_save_campaigns(db, client_db_id, today, today)


# -------------------- STEP 5: FRONTEND / API INTEGRATION --------------------
# Example Routes:
#
# 1️⃣ Calendar Filter API
# GET /google-ads/fetch?client_id=123&start_date=2025-10-01&end_date=2025-10-31
#
# 2️⃣ Auto Daily API
# GET /google-ads/fetch-daily?client_id=123
#
# Both will use the same logic internally.
