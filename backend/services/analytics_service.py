# services/analytics_service.py
from sqlalchemy.orm import Session
from models.campaign_model import Campaign as CampaignModel
from datetime import datetime, timedelta

def calculate_campaign_metrics(db: Session, client_id: int, end_date: str):
    """
    Analyze campaign performance up to a user-given date.
    end_date must be in format: YYYY-MM-DD
    """

    # Convert string to datetime
    try:
        end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        return {"error": "Invalid date format. Use YYYY-MM-DD."}
    recent_data = db.query(CampaignModel).filter(
        CampaignModel.client_id == client_id,
        CampaignModel.date <= end_date_obj
    ).all()

    if not recent_data:
        return {"message": "No campaign data found for this client."}

    impressions = sum(d.impressions for d in recent_data)
    clicks = sum(d.clicks for d in recent_data)
    conversions = sum(d.conversions for d in recent_data)
    cost = sum(d.cost for d in recent_data)

    ctr = (clicks / impressions * 100) if impressions else 0
    cpa = (cost / conversions) if conversions else 0

    return {
        "end_date": end_date,
        "total_impressions": impressions,
        "total_clicks": clicks,
        "total_conversions": conversions,
        "total_cost": cost,
        "CTR (%)": round(ctr, 2),
        "CPA": round(cpa, 2),
    }
