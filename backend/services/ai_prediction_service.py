# services/ai_prediction_service.py

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import IsolationForest
from sqlalchemy.orm import Session
from models.campaign_model import Campaign
from datetime import datetime
from openai import OpenAI
from config import settings  

# ✅ Initialize OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)

def train_predictive_model(
    db: Session, client_db_id: int, start_date: str, end_date: str
):
    """
    Train AI model using campaign data between selected calendar dates.
    Predict CTR/CPC, detect anomalies, and generate AI-powered performance insights + suggestions.
    """
    try:
        # Convert input strings to datetime
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    except Exception:
        return {"error": "Invalid date format. Please use YYYY-MM-DD"}

    # 🔹 Fetch campaign data for selected date range
    campaigns = (
        db.query(Campaign)
        .filter(Campaign.client_db_id == client_db_id)
        .filter(Campaign.date >= start_dt)
        .filter(Campaign.date <= end_dt)
        .all()
    )

    if not campaigns:
        return {
            "error": f"No campaign data found for client {client_db_id} between {start_date} and {end_date}"
        }

    # Convert to DataFrame
    df = pd.DataFrame(
        [
            {
                "campaign_name": c.name,
                "impressions": c.impressions or 0,
                "clicks": c.clicks or 0,
                "cost": c.cost or 0.0,
                "conversions": c.conversions or 0,
                "date": c.date,
            }
            for c in campaigns
        ]
    )

    # Derived metrics
    df["ctr"] = np.where(df["impressions"] > 0, (df["clicks"] / df["impressions"]) * 100, 0)
    df["cpc"] = np.where(df["clicks"] > 0, df["cost"] / df["clicks"], 0)

    # Features & Targets
    X = df[["impressions", "cost", "clicks"]]
    y_ctr = df["ctr"]
    y_cpc = df["cpc"]

    # Train regression models
    model_ctr = LinearRegression().fit(X, y_ctr)
    model_cpc = LinearRegression().fit(X, y_cpc)

    # Predictions
    df["predicted_ctr"] = model_ctr.predict(X)
    df["predicted_cpc"] = model_cpc.predict(X)

    # Anomaly detection
    iso = IsolationForest(contamination=0.15, random_state=42)
    df["anomaly_flag"] = iso.fit_predict(df[["ctr", "cpc", "cost"]])

    # Priority logic
    df["priority"] = np.where(
        (df["predicted_ctr"] < df["ctr"]) | (df["predicted_cpc"] > df["cpc"]),
        "High",
        "Normal",
    )

    insights = []
    for _, row in df.iterrows():
        insights.append(
            {
                "date": row.date.strftime("%Y-%m-%d"),
                "Campaign": row.campaign_name,
                "CTR_Actual": f"{row.ctr:.2f}%",
                "CTR_Predicted": f"{row.predicted_ctr:.2f}%",
                "CPC_Actual": f"{row.cpc:.2f}",
                "CPC_Predicted": f"{row.predicted_cpc:.2f}",
                "Priority": row.priority,
                "Anomaly": "Yes" if row.anomaly_flag == -1 else "No",
                "Insight": (
                    "CTR expected to drop"
                    if row.predicted_ctr < row.ctr
                    else "CPC expected to rise"
                    if row.predicted_cpc > row.cpc
                    else "Stable performance"
                ),
            }
        )

    # 🧠 Prepare summary before OpenAI
    summary = {
        "client_id": client_db_id,
        "data_range": f"{start_date} to {end_date}",
        "total_records": len(df),
        "anomalies_detected": int((df["anomaly_flag"] == -1).sum()),
        "high_priority": int((df["priority"] == "High").sum()),
        "insights": insights,
    }

    # 🧩 AI prompt for suggestion generation
    prompt = f"""
    Analyze the following Google Ads campaign performance data and provide expert-level optimization suggestions.

    Date Range: {start_date} to {end_date}
    Total Campaigns: {len(df)}
    Anomalies Detected: {summary['anomalies_detected']}
    High Priority Campaigns: {summary['high_priority']}

    Sample Data (first 5 rows):
    {df.head(5).to_dict(orient='records')}

    Please include in your analysis:
    - Keyword performance analysis
    - CTR and CPC improvement tips
    - Budget optimization recommendations
    - Audience targeting or scheduling improvements
    - Overall performance summary
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert Google Ads strategist and data analyst."},
                {"role": "user", "content": prompt},
            ],
        )

        ai_suggestions = response.choices[0].message.content.strip()
        summary["ai_suggestions"] = ai_suggestions

    except Exception as e:
        summary["ai_suggestions"] = f"AI Suggestion generation failed: {str(e)}"

    return summary
