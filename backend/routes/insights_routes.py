from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from services.ai_insight_service import generate_insights_from_campaign

router = APIRouter(
    prefix="/insights",
    tags=["AI Insights"]
)

@router.post("/generate")
def generate_insights(campaign_data: dict, db: Session = Depends(get_db)):
    """
    Generate AI-driven insights from campaign data
    """
    return generate_insights_from_campaign(db, campaign_data)
