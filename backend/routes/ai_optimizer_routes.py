# routers/ai_suggestion_router.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from services.ai_optimizer_service import generate_daily_campaign_suggestions

router = APIRouter()

@router.get("/generate-suggestions")
def generate_suggestions(client_db_id: int, db: Session = Depends(get_db)):
    """Fetch today's Google Ads campaigns and generate AI suggestions"""
    return generate_daily_campaign_suggestions(db, client_db_id)