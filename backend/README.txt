🚀 AI Google Ads Agent — User Guide
(Step-by-Step Instructions for Using the Agent)
🧩 1️⃣ Step 1 — Register a User (Admin)
🔹 Endpoint:

POST /auth/register

🔹 What it does:

Creates a new admin or client account.

🧠 Example Request:
{
  "name": "BrandingBeez",
  "email": "youdesign2020@gmail.com",
  "password": "DesignAug@2025",
  "role": "Admin"
}
✅ Response:
{
  "id": 1,
  "name": "BrandingBeez",
  "email": "youdesign2020@gmail.com",
  "role": "Admin"
}

🔑 2️⃣ Step 2 — Login to Get Access Token
🔹 Endpoint:

POST /auth/login

🔹 Purpose:

Generate an access token (JWT) for secure access.

🧠 Example Request:
{
  "email": "youdesign2020@gmail.com",
  "password": "DesignAug@2025"
}
✅ Response:
{
  "access_token": "<YOUR_TOKEN>",
  "token_type": "bearer"
}


➡️ Copy this token and use it for all other APIs in your Authorization Header:
Authorization: Bearer <YOUR_TOKEN>

🔗 3️⃣ Step 3 — Connect to Google Ads
🔹 Endpoint:

GET /auth/google-connect

🔹 Purpose:

This opens the Google OAuth screen to connect your Google Ads account.

1️⃣ Open this URL in browser → log in to Google → allow permissions.
2️⃣ You’ll be redirected to your REDIRECT_URI → copy the code.
3️⃣ Use that code to generate a refresh_token.

✅ Once generated, you can save your refresh_token in the next step.



"""🔑 Google Ads Refresh Token — Step-by-Step Guide
🧩 1️⃣ What is a Refresh Token?

A Refresh Token is a permanent authorization key that your system uses to get new access tokens automatically from Google Ads.

Access token → short-lived (expires in 1 hour)

Refresh token → long-lived (doesn’t expire until revoked)

The AI Agent stores this refresh token and uses it to access your Google Ads account anytime automatically — no need to log in again.

🌐 2️⃣ Create a Google Cloud Project

1️⃣ Go to 👉 https://console.cloud.google.com

🔹 Step 1 — Go to your connect endpoint

Browser-open :
👉 http://127.0.0.1:8000/auth/google-connect

"""



👥 4️⃣ Step 4 — Add a Client (Link Google Ads Account)
🔹 Endpoint:

POST /clients/add

🔹 Purpose:

Save Google Ads credentials into the system.

🧠 Example Request:
{
  "name": "BrandingBeez",
  "email": "youdesign2020@gmail.com",
  "developer_token": "n9_l9jHhJfk9Xtwru7MT1A",
  "client_id": "380822992004-n3lm7hbo8foscbaot7vu5e7t1eok1ta3.apps.googleusercontent.com",
  "client_secret": "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",
  "refresh_token": "1//0gFG0RsOEXDlzCgYIARAAGBASNwF-L9Ir...",
  "login_customer_id": "439-520-1423"
}
✅ Response:
{
  "message": "Client added successfully",
  "id": 1
}

📈 5️⃣ Step 5 — View All Clients
🔹 Endpoint:

GET /clients/all

Displays all connected clients and their details.

✅ Example Output:
[
  {
    "id": 1,
    "name": "BrandingBeez",
    "email": "youdesign2020@gmail.com",
    "login_customer_id": "439-520-1423"
  }
]
🤖 6️⃣ Step 6 — Run AI Optimization
🔹 Endpoint:

POST /analytics/optimize

🔹 Purpose:

Analyze campaign performance and get AI optimization suggestions.

🧠 Example Request:
{
  "campaign_name": "Diwali Sale Ads",
  "clicks": 420,
  "impressions": 18000,
  "ctr": 2.3,
  "cpc": 0.52,
  "conversions": 18,
  "budget": 250
}
✅ Response:
{
  "status": "success",
  "suggestions": "Your campaign CTR is below average. Increase ad relevance and test new creatives..."
}
✅ Behind the scenes:

GPT-4 model analyzes the campaign

Suggests CTR, CPC, Budget, and Keyword improvements

🧠 7️⃣ Step 7 — Generate Predictive Insights
🔹 Endpoint:

POST /insights/insights/generate

🔹 Purpose:

Get AI-driven insights with priority scores and anomaly detection.

✅ Example Response:
{
  "total_campaigns": 5,
  "high_priority_issues": 2,
  "anomalies_detected": 1,
  "detailed_insights": [
    {
      "CTR Prediction": "2.15%",
      "CPC Prediction": "0.65",
      "Priority": "High",
      "Anomaly": "Yes",
      "Reason": "CPC expected to rise"
    }
  ]
}

✅ What it does:

Detects CTR drop or CPC spike

Flags anomalies with "Anomaly": "Yes"

Assigns Priority: High / Medium / Low

📊 8️⃣ Step 8 — Review Full Analytics Report

When both /analytics/optimize and /insights/generate are used together,
the system can generate a Full AI Marketing Report:

✅ Example Combined Summary:
{
  "campaign": "Diwali Sale Ads",
  "summary": {
    "CTR": 2.3,
    "CPC": 0.52,
    "Conversions": 18
  },
  "ai_predictions": {
    "priority_issues": 2,
    "anomalies": 1
  },
  "ai_recommendations": "Increase budget by 15% during evening hours. Focus on long-tail keywords."
}
💡 9️⃣ Step 9 — Health Check
🔹 Endpoint:

GET /

Quick check to ensure the backend is running.

✅ Response:
{
  "status": "ok",
  "message": "Agent backend is running"
}
🧭 10️⃣ Step 10 — System Workflow Overview

Here’s the full process visualized:
[Register/Login]
        ↓
[Google Connect]
        ↓
[Client Added]
        ↓
[Campaign Data Stored]
        ↓
[AI Optimization (GPT-4o)]
        ↓
[AI Prediction (ML Models)]
        ↓
[Insight Report Generated]



DATABASE USE: