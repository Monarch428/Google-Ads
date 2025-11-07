from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from services.ai_optimizer_service import generate_optimization_suggestions
from schemas.analytics_schema import CampaignAnalyticsRequest, CampaignAnalyticsResponse

router = APIRouter(
    # prefix="/analytics",
    tags=["Analytics"]
)

@router.post("/optimize", response_model=CampaignAnalyticsResponse)
def optimize_campaign(data: CampaignAnalyticsRequest, db: Session = Depends(get_db)):
    """
    🎯 Endpoint to generate AI-based optimization suggestions for a Google Ads campaign.
    Example Input:
    {
        "campaign_name": "Summer Sale Ads",
        "clicks": 520,
        "impressions": 20000,
        "ctr": 2.6,
        "cpc": 0.45,
        "conversions": 25,
        "budget": 300
    }
    """
    try:
        result = generate_optimization_suggestions(data.dict())
        return {
            "status": "success",
            "campaign_name": data.campaign_name,
            "suggestions": result["suggestions"]
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to optimize campaign: {str(e)}")
