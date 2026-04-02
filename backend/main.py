import sys
import os
import asyncio

# ✅ ONE line only — no second sys.path for website
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "ai-agents"))

if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler

from routes.analysis import router as analysis_router

load_dotenv()

from database import get_db, SessionLocal, initialize_database
from models import (
    user_model, client_model, campaign_model,
    google_ads_account, recommendation_model,
    ai_insight_model, seo_model,
)
from routes import (
    auth_routes, client_routes, google_ads_routes,
    chatbot_routes, user_routes, campaign_routes,
    recommendation_routes, report_routes, system_routes,
    ai_insights_routes, ai_optimizer_routes,
    ai_prediction_routes, seo_routes,email_router
)
from services.google_ads_service import fetch_and_save_campaigns
from website.router import website_router

app = FastAPI(
    title="AAA AI Agent Backend",
    description="AI-powered Google Ads management, analytics, chatbot, and insights system.",
    version="1.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://aaa.brandingbeez.io",
        "http://localhost:3000",
        "http://localhost:5173",
        "https://google-ads-indol.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Registering routes...")
app.include_router(auth_routes.router,           prefix="/auth",            tags=["Authentication"])
app.include_router(client_routes.router,         prefix="/clients",         tags=["Clients"])
app.include_router(google_ads_routes.router,     prefix="/google-ads",      tags=["Google Ads"])
app.include_router(ai_optimizer_routes.router,   prefix="/analytics",       tags=["Daily AI predictions"])
app.include_router(ai_prediction_routes.router,  prefix="/ai",              tags=["Customized AI Prediction"])
app.include_router(ai_insights_routes.router,    prefix="/insights",        tags=["AI Insights & Reports"])
app.include_router(chatbot_routes.router,        prefix="/chatbot",         tags=["AI Chatbot"])
app.include_router(user_routes.router,           prefix="/users",           tags=["Users"])
app.include_router(campaign_routes.router,       prefix="/campaigns",       tags=["Campaigns"])
app.include_router(recommendation_routes.router, prefix="/recommendations", tags=["Recommendations"])
app.include_router(report_routes.router,         prefix="/reports",         tags=["Reports"])
app.include_router(system_routes.router,         prefix="/system",          tags=["System Monitoring"])
app.include_router(seo_routes.router,            prefix="/seo",             tags=["SEO Analysis"])
app.include_router(website_router)
app.include_router(analysis_router)  
app.include_router(email_router.router)
print("All routes registered successfully!\n")

scheduler = BackgroundScheduler()

def daily_google_ads_sync():
    print("Running scheduled Google Ads data sync...")
    db = SessionLocal()
    try:
        clients = db.query(client_model.Client).all()
        for client in clients:
            try:
                fetch_and_save_campaigns(db, client.id)
            except Exception as client_error:
                print(f"Error syncing client {client.id}: {client_error}")
        print(f"Google Ads sync completed for {len(clients)} clients.")
    except Exception as e:
        print("Error during Google Ads sync:", e)
    finally:
        db.close()

@app.get("/")
def health_check(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT NOW();"))
        server_time = result.scalar()
        return {
            "status": "API Running Successfully",
            "database": "Connected",
            "server_time": str(server_time),
            "message": "Welcome to AAA Agent — AI-Powered Ads Automation + Chatbot Engine",
        }
    except Exception as e:
        return {"status": "Database connection failed", "error": str(e)}

@app.get("/debug/routes")
def list_routes():
    routes = []
    for route in app.routes:
        if hasattr(route, "methods"):
            routes.append({"path": route.path, "methods": list(route.methods), "name": route.name})
    return {"total_routes": len(routes), "routes": routes}

@app.on_event("startup")
def on_startup():
    try:
        initialize_database()
    except Exception as e:
        print("Database initialization failed during startup:", e)
    try:
        if not scheduler.running:
            scheduler.add_job(daily_google_ads_sync, "cron", hour=2, minute=0)
            scheduler.start()
            print("Scheduler started successfully (runs daily at 2 AM).")
    except Exception as e:
        print("Failed to start scheduler:", e)

@app.on_event("shutdown")
def on_shutdown():
    try:
        if scheduler.running:
            print("Shutting down scheduler...")
            scheduler.shutdown()
    except Exception as e:
        print("Error while shutting down scheduler:", e)
    finally:
        print("Shutdown complete.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
