from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from apscheduler.schedulers.background import BackgroundScheduler

# Internal imports
from database import get_db, Base, engine
from models import user_model, client_model, campaign_model
from routes import (
    auth_routes,
    client_routes,
    google_ads_routes,
    analytics_routes,
    insights_routes,
    chatbot_routes,
    user_routes,
    campaign_routes,
)
from services.google_ads_service import fetch_campaign_metrics_for_client

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="AAA AI Agent Backend",
    description="AI-powered Google Ads management, analytics, chatbot, and insights system.",
    version="1.4.0",
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routes
app.include_router(auth_routes.router, prefix="/auth", tags=["Authentication"])
app.include_router(client_routes.router, prefix="/clients", tags=["Clients"])
app.include_router(google_ads_routes.router, prefix="/google-ads", tags=["Google Ads"])
app.include_router(analytics_routes.router, prefix="/analytics", tags=["AI Optimization & Predictions"])
app.include_router(insights_routes.router, prefix="/insights", tags=["AI Insights & Reports"])
app.include_router(chatbot_routes.router, prefix="/chatbot", tags=["AI Chatbot"])
app.include_router(user_routes.router, prefix="/users", tags=["Users"])
app.include_router(campaign_routes.router, prefix="/campaigns", tags=["Campaigns"])

# Health check endpoint
@app.get("/")
def health_check(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT NOW();"))
        server_time = result.scalar()
        return {
            "status": "API Running Successfully",
            "database": "Connected",
            "server_time": str(server_time),
            "message": "Welcome to AAA Agent — AI-Powered Ads Automation + Chatbot Engine"
        }
    except Exception as e:
        return {"status": "Database connection failed", "error": str(e)}

# Background Scheduler
scheduler = BackgroundScheduler()

def daily_google_ads_sync():
    print("Running scheduled Google Ads data sync...")
    db = next(get_db())
    try:
        clients = db.query(client_model.Client).all()
        for client in clients:
            fetch_campaign_metrics_for_client(db, client.id)
        print(f"Google Ads sync completed for {len(clients)} clients.")
    except Exception as e:
        print("Error during Google Ads sync:", e)
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    try:
        scheduler.add_job(daily_google_ads_sync, "cron", hour=2, minute=0)
        scheduler.start()
        print("Scheduler started successfully (runs daily at 2 AM).")
    except Exception as e:
        print("Failed to start scheduler:", e)

@app.on_event("shutdown")
def on_shutdown():
    try:
        print("Shutting down scheduler...")
        scheduler.shutdown()
    except Exception as e:
        print("Error while shutting down scheduler:", e)
    finally:
        print("Shutdown complete.")

# Run command (for local debug)
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
