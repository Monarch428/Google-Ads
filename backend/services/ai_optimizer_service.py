from openai import OpenAI
from config import settings
from fastapi import HTTPException
import logging

# ✅ Initialize OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)

# ✅ Setup logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def generate_optimization_suggestions(campaign_data: dict):
    """
    Generate AI-powered optimization suggestions for Google Ads campaigns.
    Input: campaign_data = {
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
        # 🧠 Prepare structured input prompt
        prompt = f"""
        Analyze this Google Ads campaign performance and suggest optimization ideas.
        
        Campaign Data:
        {campaign_data}

        Please include:
        - Keyword performance analysis
        - CTR and CPC improvement tips
        - Budget optimization recommendations
        - Audience targeting or scheduling improvements
        - Overall performance summary
        """

        # 🤖 Call OpenAI API (new syntax)
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # You can also use "gpt-4o" or "gpt-4-turbo"
            messages=[
                {"role": "system", "content": "You are an expert Google Ads strategist."},
                {"role": "user", "content": prompt}
            ]
        )

        # ✅ Extract AI suggestion
        suggestions = response.choices[0].message.content.strip()

        logger.info("✅ AI suggestions generated successfully.")
        return {"status": "success", "suggestions": suggestions}

    except Exception as e:
        logger.error(f"❌ AI Optimization Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Optimization failed: {str(e)}")
