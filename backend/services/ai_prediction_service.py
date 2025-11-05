# services/ai_prediction_service.py
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import IsolationForest
from sqlalchemy.orm import Session
from models.campaign_model import Campaign

def train_predictive_model(db: Session):
    """
    Train models to predict CTR and CPC, detect anomalies, and assign priority scores.
    """
   
    campaigns = db.query(Campaign).all()
    if not campaigns:
        return {"error": "No campaign data found"}

    df = pd.DataFrame([{
        "impressions": c.impressions,
        "clicks": c.clicks,
        "cost": c.cost,
        "conversions": c.conversions,
        "ctr": (c.clicks / c.impressions * 100) if c.impressions > 0 else 0,
        "cpc": (c.cost / c.clicks) if c.clicks > 0 else 0,
    } for c in campaigns])

    # Feature & target setup
    X = df[["impressions", "cost", "clicks"]]
    y_ctr = df["ctr"]
    y_cpc = df["cpc"]

    # Train models
    model_ctr = LinearRegression().fit(X, y_ctr)
    model_cpc = LinearRegression().fit(X, y_cpc)

    # Predictions
    df["predicted_ctr"] = model_ctr.predict(X)
    df["predicted_cpc"] = model_cpc.predict(X)

    # Anomaly detection (CPC & CTR deviations)
    iso = IsolationForest(contamination=0.1, random_state=42)
    df["anomaly_flag"] = iso.fit_predict(df[["ctr", "cpc", "cost"]])

    # Priority scoring logic
    df["priority_score"] = np.where(
        (df["predicted_ctr"] < df["ctr"]) | (df["predicted_cpc"] > df["cpc"]),
        "High", "Low"
    )

    insights = []
    for _, row in df.iterrows():
        insights.append({
            "CTR Prediction": f"{row.predicted_ctr:.2f}%",
            "CPC Prediction": f"{row.predicted_cpc:.2f}",
            "Priority": row.priority_score,
            "Anomaly": "Yes" if row.anomaly_flag == -1 else "No",
            "Reason": (
                "CTR expected to drop" if row.predicted_ctr < row.ctr
                else "CPC expected to rise" if row.predicted_cpc > row.cpc
                else "Stable performance"
            )
        })
    return insights


def generate_insights(db: Session):
    """
    Generate summarized insights based on campaign predictions.
    """
    predictions = train_predictive_model(db)
    if "error" in predictions:
        return predictions

    high_priority = [p for p in predictions if p["Priority"] == "High"]
    anomaly_count = sum(1 for p in predictions if p["Anomaly"] == "Yes")

    summary = {
        "total_campaigns": len(predictions),
        "high_priority_issues": len(high_priority),
        "anomalies_detected": anomaly_count,
        "insight_summary": [
            "High CPC fluctuation detected" if anomaly_count else "No major anomalies",
            "Some campaigns show CTR decline" if high_priority else "Performance stable",
        ],
        "detailed_insights": predictions
    }

    return summary
