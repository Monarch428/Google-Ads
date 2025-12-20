# from openai import OpenAI
# from config import settings
from typing import List, Tuple

import logging
from fastapi import HTTPException
from openai import OpenAI
from sqlalchemy.orm import Session
# from services.ai_optimizer_service import generate_daily_campaign_suggestions
# from services.ai_insight_service import generate_insights_from_campaign
# from models.client_model import Client

from config import settings
from models.campaign_model import Campaign
# import logging
from models.client_model import Client
from services.ai_insight_service import generate_insights_from_campaign
from services.ai_optimizer_service import generate_daily_campaign_suggestions

# ✅ Initialize OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)

# ✅ Setup logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# def chatbot_response(db: Session, user_message: str):
def _calculate_client_context(
    db: Session, client_id: int
) -> Tuple[Client, List[Campaign], dict, List[str]]:
    """Build a performance snapshot for a specific client."""

    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found for chatbot request")

    campaigns: List[Campaign] = db.query(Campaign).filter(Campaign.client_id == client_id).all()

    totals = {
        "impressions": 0,
        "clicks": 0,
        "conversions": 0.0,
        "cost": 0.0,
        "conversion_value": 0.0,
    }

    for campaign in campaigns:
        totals["impressions"] += int(campaign.impressions or 0)
        totals["clicks"] += int(campaign.clicks or 0)
        totals["conversions"] += float(campaign.conversions or 0)
        totals["cost"] += float(campaign.cost or 0)
        totals["conversion_value"] += float(campaign.conversion_value or 0)

    derived = {
        "ctr": (totals["clicks"] / totals["impressions"]) * 100 if totals["impressions"] > 0 else 0,
        "avg_cpc": (totals["cost"] / totals["clicks"]) if totals["clicks"] > 0 else 0,
        "cpa": (totals["cost"] / totals["conversions"]) if totals["conversions"] > 0 else 0,
        "roas": (totals["conversion_value"] / totals["cost"]) if totals["cost"] > 0 else 0,
    }

    improvement_signals: List[str] = []
    if totals["impressions"] == 0 or totals["clicks"] == 0:
        improvement_signals.append("No recent traffic data detected. Verify campaigns are active and tracking is configured.")
    if derived["ctr"] < 2 and totals["impressions"] > 0:
        improvement_signals.append("CTR is below 2% — test new ad copy, tighten keywords, and refresh creatives.")
    if totals["conversions"] < 5:
        improvement_signals.append("Low conversions — review landing page relevance and conversion tracking.")
    if derived["roas"] and derived["roas"] < 2:
        improvement_signals.append("ROAS is under 2x — shift budget toward top-performing campaigns and audiences.")
    if totals["cost"] > 0 and totals["conversion_value"] == 0:
        improvement_signals.append("Spend detected without recorded conversion value — validate tags and attribution.")
    if not improvement_signals:
        improvement_signals.append("Performance is stable — continue incremental tests on bids, audiences, and creatives.")

    return client, campaigns, {**totals, **derived}, improvement_signals


def _format_campaign_highlights(campaigns: List[Campaign]) -> str:
    if not campaigns:
        return "No campaigns found for this account yet."

    top_campaigns = sorted(campaigns, key=lambda c: (c.conversions or 0), reverse=True)[:3]
    lines = []
    for campaign in top_campaigns:
        lines.append(
            f"- {campaign.name}: {campaign.conversions or 0} conversions, "
            f"CTR {campaign.ctr or 0:.2f}%, CPC {campaign.average_cpc or 0:.2f}, Cost {campaign.cost or 0:.2f}"
        )

    return "\n".join(lines) if lines else "No campaigns with recorded conversions yet."


def chatbot_response(db: Session, user_message: str, mode: str | None = "general", client_id: int | None = None):
    """
    🤖 AAA Agent Advanced Chatbot:
    Handles questions related to Google Ads connection, optimization, campaign analytics, and AI insights.
    """
    try:
        lower_message = user_message.lower()

        # 🔍 Check if user is asking about Google Ads setup
        if "connect google ads" in lower_message or "link account" in lower_message:
            return "🔗 To connect your Google Ads account, please go to `/google-ads/google-ads/connect`. Once authorized, you'll receive a refresh token that allows the agent to manage campaigns securely."

        # 🧩 Check if user wants to add or manage clients
        if "add client" in lower_message or "register client" in lower_message:
            return "👤 You can register a new client using the `/clients/add` endpoint. Make sure to include your developer token, client ID, client secret, and refresh token."

        # 📊 Check if user wants campaign optimization
        if "optimize" in lower_message or "improve campaign" in lower_message:
            sample_data = {
                "campaign_name": "Sample Campaign",
                "clicks": 500,
                "impressions": 20000,
                "ctr": 2.5,
                "cpc": 0.45,
                "conversions": 30,
                "budget": 300
            }
            ai_result = generate_daily_campaign_suggestions(sample_data)
            return f"📈 Optimization Report Generated:\n\n{ai_result['suggestions']}"

        # 📈 Check if user wants AI Insights
        if "insight" in lower_message or "analyze" in lower_message:
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
        if "show clients" in lower_message:
            clients = db.query(Client).all()
            if not clients:
                return "No clients found in the system yet."
            return "\n".join([f"👤 {c.name} ({c.email})" for c in clients])

        if "show campaigns" in lower_message:
            campaigns = db.query(Campaign).all()
            if not campaigns:
                return "No campaigns available yet."
            # return "\n".join([f"📊 {c.name} - CTR: {c.ctr}%, CPC: ₹{c.cpc}" for c in campaigns])
            return "\n".join([f"📊 {c.name} - CTR: {c.ctr}% , CPC: ₹{c.cpc}" for c in campaigns])

        # 🧭 Account-specific guidance using live client data
        if (mode and mode.lower() == "account") or client_id:
            if not client_id:
                raise HTTPException(status_code=400, detail="client_id is required for account-specific chats")

            client_record, campaigns, metrics, improvement_signals = _calculate_client_context(db, client_id)
            campaign_highlights = _format_campaign_highlights(campaigns)
            improvement_block = "- " + "\n- ".join(improvement_signals)

            prompt = f"""
You are AAA Agent, a Google Ads strategist that tailors responses to the selected client.
Use the context below to answer the user and propose optimizations.

Client: {client_record.name} ({client_record.email})
Currency: {client_record.currency_code}
Performance Snapshot:
- Campaigns tracked: {len(campaigns)}
- Impressions: {metrics['impressions']:,}; Clicks: {metrics['clicks']:,}; CTR: {metrics['ctr']:.2f}%
- Conversions: {metrics['conversions']:.0f}; Cost: {metrics['cost']:.2f}; Conv. Value: {metrics['conversion_value']:.2f}; ROAS: {metrics['roas']:.2f}
- Avg CPC: {metrics['avg_cpc']:.2f}; CPA: {metrics['cpa']:.2f}

Top campaigns:
{campaign_highlights}

Improvement signals to consider:
{improvement_block}

User question: "{user_message}"

Respond with:
1) A brief acknowledgement that references the client name.
2) Two or three observations grounded in the metrics above.
3) Three prioritized action recommendations with clear rationale and expected lift when possible.
Keep the tone concise and focused on next steps.
"""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a pragmatic Google Ads strategist focused on actionable recommendations."},
                    {"role": "user", "content": prompt}
                ]
            )

            ai_reply = response.choices[0].message.content.strip()
            logger.info("✅ Account-specific chatbot reply generated successfully.")
            return ai_reply

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
