from openai import OpenAI
from config import settings
from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.campaign_model import Campaign
from datetime import date
import logging

# ✅ Initialize OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)

# ✅ Setup logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def generate_daily_campaign_suggestions(db: Session, client_db_id: int):
    """
    ✅ Fetch today's Google Ads data for the given client
    and generate AI-powered optimization suggestions automatically.
    """
    try:
        # 🔹 Get today's date
        today = date.today()

        logger.info(f"Fetching today's campaign data for Client ID {client_db_id} ({today})")

        # 🔹 Fetch campaign data for today only
        campaigns = (
            db.query(Campaign)
            .filter(Campaign.client_db_id == client_db_id)
            .filter(Campaign.date == today)
            .all()
        )

        if not campaigns:
            return {"message": f"No campaign data found for client {client_db_id} on {today}."}

        ai_suggestions = []

        # 🔹 Loop each campaign and generate suggestion
        for c in campaigns:
            campaign_data = {
                "campaign_name": c.name,
                "impressions": c.impressions or 0,
                "clicks": c.clicks or 0,
                "cost": c.cost or 0.0,
                "conversions": c.conversions or 0,
                "ctr": round((c.clicks / c.impressions * 100) if c.impressions else 0, 2),
                "cpc": round((c.cost / c.clicks) if c.clicks else 0, 2),
                "budget": c.budget or 0.0,
                "date": c.date.strftime("%Y-%m-%d")
            }

            # 🧠 AI Prompt for daily insight
            prompt = f"""
            You are a Google Ads strategist. Analyze today's campaign performance and give daily optimization advice.

            Campaign Data:
            {campaign_data}

            Please include:
            - Keyword & audience performance insights
            - CTR and CPC improvement suggestions
            - Budget/bid adjustments for tomorrow
            - Ad scheduling or targeting optimization
            - One-line daily performance summary
            """

            try:
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are an expert Google Ads data analyst."},
                        {"role": "user", "content": prompt}
                    ]
                )

                suggestion = response.choices[0].message.content.strip()

                ai_suggestions.append({
                    "campaign_name": c.name,
                    "date": c.date.strftime("%Y-%m-%d"),
                    "suggestion": suggestion
                })

            except Exception as e:
                logger.error(f"❌ AI failed for campaign {c.name}: {e}")
                ai_suggestions.append({
                    "campaign_name": c.name,
                    "date": c.date.strftime("%Y-%m-%d"),
                    "suggestion": f"AI Suggestion failed: {str(e)}"
                })

        logger.info(f"✅ AI suggestions generated for {len(ai_suggestions)} campaigns on {today}.")
        return {
            "status": "success",
            "client_db_id": client_db_id,
            "date": today.strftime("%Y-%m-%d"),
            "total_campaigns": len(campaigns),
            "ai_suggestions": ai_suggestions
        }

    except Exception as e:
        logger.error(f"❌ AI Campaign Suggestion Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
