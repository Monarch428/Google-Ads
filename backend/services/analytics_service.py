# services/analytics_service.py
from sqlalchemy.orm import Session
from models.campaign_model import CampaignModel
from datetime import datetime, timedelta

def calculate_campaign_metrics(db: Session, client_id: int):
    """Analyze campaign performance over the last 7 days."""
    recent_data = db.query(CampaignModel).filter(
        CampaignModel.client_id == client_id,
        CampaignModel.date >= datetime.utcnow() - timedelta(days=7)
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
        "total_impressions": impressions,
        "total_clicks": clicks,
        "total_conversions": conversions,
        "total_cost": cost,
        "CTR (%)": round(ctr, 2),
        "CPA": round(cpa, 2),
    }
