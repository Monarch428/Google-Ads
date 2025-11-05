from config import settings
from models.ai_insight_model import AIInsight, PriorityLevel
from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime
from openai import OpenAI
import json
import logging

# Initialize OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)
logger = logging.getLogger(__name__)

def generate_insights_from_campaign(db: Session, campaign_data: dict):
    """
    Analyze campaign data using GPT and generate insights with priority and impact.
    """
    try:
        campaign_name = campaign_data.get("campaign_name", "Unnamed Campaign")

        prompt = f"""
        You are an expert digital marketing AI.
        Analyze this Google Ads campaign data and produce 3 to 5 insights.

        Campaign Data:
        {campaign_data}

        For each insight, provide a JSON object with:
        - category (string)
        - message (string)
        - priority ("High" / "Medium" / "Low")
        - expected_impact (string)

        Example output format:
        [
            {{
                "category": "CTR Optimization",
                "message": "CTR is low. Try updating ad copy.",
                "priority": "High",
                "expected_impact": "CTR +20%"
            }}
        ]
        """

        # Send request to GPT
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional Google Ads performance analyst."},
                {"role": "user", "content": prompt}
            ]
        )

        content = response.choices[0].message.content.strip()

        # Try to parse JSON safely
        insights = json.loads(content)

        # Validate and save each insight
        saved_insights = []
        for i in insights:
            new_insight = AIInsight(
                campaign_name=campaign_name,
                insight_category=i.get("category", "General"),
                message=i.get("message", "No message"),
                priority=PriorityLevel(i.get("priority", "Medium")),
                expected_impact=i.get("expected_impact", "Moderate"),
                created_at=datetime.now()
            )
            db.add(new_insight)
            saved_insights.append(new_insight)

        db.commit()

        return {
            "status": "success",
            "campaign_name": campaign_name,
            "insights": insights
        }

    except json.JSONDecodeError:
        logger.error("AI response is not valid JSON.")
        raise HTTPException(status_code=500, detail="AI response format error")
    except Exception as e:
        logger.error(f"AI Insight Generation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
