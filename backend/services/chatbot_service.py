from openai import OpenAI
from config import settings
from fastapi import HTTPException
from sqlalchemy.orm import Session
from services.ai_optimizer_service import generate_optimization_suggestions
from services.ai_insight_service import generate_insights_from_campaign
from models.client_model import Client
from models.campaign_model import Campaign
import logging

# ✅ Initialize OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)

# ✅ Setup logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def chatbot_response(db: Session, user_message: str):
    """
    🤖 AAA Agent Advanced Chatbot:
    Handles questions related to Google Ads connection, optimization, campaign analytics, and AI insights.
    """
    try:
        # 🔍 Check if user is asking about Google Ads setup
        if "connect google ads" in user_message.lower() or "link account" in user_message.lower():
            return "🔗 To connect your Google Ads account, please go to `/google-ads/google-ads/connect`. Once authorized, you'll receive a refresh token that allows the agent to manage campaigns securely."

        # 🧩 Check if user wants to add or manage clients
        if "add client" in user_message.lower() or "register client" in user_message.lower():
            return "👤 You can register a new client using the `/clients/add` endpoint. Make sure to include your developer token, client ID, client secret, and refresh token."

        # 📊 Check if user wants campaign optimization
        if "optimize" in user_message.lower() or "improve campaign" in user_message.lower():
            sample_data = {
                "campaign_name": "Sample Campaign",
                "clicks": 500,
                "impressions": 20000,
                "ctr": 2.5,
                "cpc": 0.45,
                "conversions": 30,
                "budget": 300
            }
            ai_result = generate_optimization_suggestions(sample_data)
            return f"📈 Optimization Report Generated:\n\n{ai_result['suggestions']}"

        # 📈 Check if user wants AI Insights
        if "insight" in user_message.lower() or "analyze" in user_message.lower():
            insights = generate_insights_from_campaign(db, {
                "campaign_name": "Insight Test",
                "clicks": 450,
                "impressions": 15000,
                "ctr": 3.0,
                "cpc": 0.5,
                "conversions": 20,
                "budget": 250
            })
            return f"🧠 AI Insights Summary:\n{insights}"

        # 🗃️ Check if user wants to view database info
        if "show clients" in user_message.lower():
            clients = db.query(Client).all()
            if not clients:
                return "No clients found in the system yet."
            return "\n".join([f"👤 {c.name} ({c.email})" for c in clients])

        if "show campaigns" in user_message.lower():
            campaigns = db.query(Campaign).all()
            if not campaigns:
                return "No campaigns available yet."
            return "\n".join([f"📊 {c.name} - CTR: {c.ctr}%, CPC: ₹{c.cpc}" for c in campaigns])

        # 🧠 Default fallback — AI conversational reply
        prompt = f"""
        You are the official assistant of the AAA Ads Optimization Agent.
        You help users with:
        - Google Ads connection setup
        - Campaign optimization
        - Insights and recommendations
        - Budget analysis and targeting suggestions

        User: {user_message}
        Reply as a professional AI assistant with clear steps or answers.
        """

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are AAA Agent, a smart Google Ads assistant."},
                {"role": "user", "content": prompt}
            ]
        )

        ai_reply = response.choices[0].message.content.strip()
        logger.info("✅ Chatbot reply generated successfully.")
        return ai_reply

    except Exception as e:
        logger.error(f"Chatbot Error: {e}")
        raise HTTPException(status_code=500, detail=f"Chatbot failed: {str(e)}")
