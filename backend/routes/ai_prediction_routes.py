# routers/ai_prediction_router.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from services.google_ads_service import fetch_and_save_campaigns
from services.ai_prediction_service import train_predictive_model
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/run")
def run_ai_prediction(
    client_db_id: int,
    start_date: str = Query(None, description="Start date in YYYY-MM-DD"),
    end_date: str = Query(None, description="End date in YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """
    Run full AI pipeline:
    1️⃣ Fetch Google Ads data between chosen calendar dates
    2️⃣ Train AI prediction model
    3️⃣ Return performance insights
    """
    try:
        # If calendar dates not provided, use last 30 days
        if not start_date or not end_date:
            end_date = datetime.utcnow().strftime("%Y-%m-%d")
            start_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")

        # Fetch Google Ads data for this range
        fetch_result = fetch_and_save_campaigns(
            db, client_db_id=client_db_id, start_date=start_date, end_date=end_date
        )

        if "error" in fetch_result:
            raise HTTPException(status_code=400, detail=fetch_result["error"])

        # Train AI Prediction model
        ai_result = train_predictive_model(
            db, client_db_id=client_db_id, start_date=start_date, end_date=end_date
        )

        return {
            "message": "✅ AI Prediction Completed Successfully",
            "fetch_summary": fetch_result,
            "ai_insights": ai_result,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
