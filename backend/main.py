# main.py

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from apscheduler.schedulers.background import BackgroundScheduler

# Internal imports
from database import (
    get_db,
    Base,
    engine,
    ensure_user_optional_columns,
    ensure_client_assignment_columns,
)
from models import user_model, client_model, campaign_model, google_ads_account, recommendation_model, ai_insight_model
from routes import (
    auth_routes,
    client_routes,
    google_ads_routes,
    # analytics_routes,
    # insights_routes,
    chatbot_routes,
    user_routes,
    campaign_routes,
    recommendation_routes,
    report_routes,
    system_routes,
    ai_insights_routes,
    ai_optimizer_routes,
    ai_prediction_routes,
)
# from services.google_ads_service import fetch_campaign_metrics_for_clients
from services.google_ads_service import fetch_and_save_campaigns

# Initialize database tables and backfill optional columns for legacy DBs
Base.metadata.create_all(bind=engine)
ensure_user_optional_columns()
ensure_client_assignment_columns()

# Initialize FastAPI app
app = FastAPI(
    title="AAA AI Agent Backend",
    description="AI-powered Google Ads management, analytics, chatbot, and insights system.",
    version="1.4.0",
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://google-ads-backend-ofxo.onrender.com",
        "https://google-ads-git-test-sathesh-projects.vercel.app",
        "https://google-ads-indol.vercel.app",
        "https://aaa.brandingbeez.io"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Register all routes - VERIFY THIS SECTION
print("Registering routes...")

app.include_router(auth_routes.router, prefix="/auth", tags=["Authentication"])
print(" /auth routes registered")

app.include_router(client_routes.router, prefix="/clients", tags=["Clients"])
print(" /clients routes registered")

app.include_router(google_ads_routes.router, prefix="/google-ads", tags=["Google Ads"])
print(" /google-ads routes registered")

# app.include_router(analytics_routes.router, prefix="/analytics", tags=["AI Optimization & Predictions"])
# print(" /analytics routes registered")

# app.include_router(insights_routes.router, prefix="/insights", tags=["AI Insights & Reports"])
# print(" /insights routes registered")

app.include_router(ai_optimizer_routes.router, prefix="/analytics", tags=["Daily AI predictions"])
app.include_router(ai_prediction_routes.router, prefix="/ai", tags=["customized  AI Prediction"])
app.include_router(ai_insights_routes.router, prefix="/insights", tags=["AI Insights & Reports"])

app.include_router(chatbot_routes.router, prefix="/chatbot", tags=["AI Chatbot"])
print(" /chatbot routes registered")

app.include_router(user_routes.router, prefix="/users", tags=["Users"])
print(" /users routes registered")

app.include_router(campaign_routes.router, prefix="/campaigns", tags=["Campaigns"])
print("/campaigns routes registered")

app.include_router(recommendation_routes.router, prefix="/recommendations", tags=["Recommendations"])
print("/recommendations routes registered")

app.include_router(report_routes.router, prefix="/reports", tags=["Reports"])
print("/reports routes registered")

app.include_router(system_routes.router, prefix="/system", tags=["System Monitoring"])
print("/system routes registered")

print("All routes registered successfully!\n")

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


# ✅ Debug endpoint to list all routes
@app.get("/debug/routes")
def list_routes():
    """List all registered routes for debugging"""
    routes = []
    for route in app.routes:
        if hasattr(route, "methods"):
            routes.append({
                "path": route.path,
                "methods": list(route.methods),
                "name": route.name
            })
    return {"total_routes": len(routes), "routes": routes}


# Background Scheduler
scheduler = BackgroundScheduler()

def daily_google_ads_sync():
    print("Running scheduled Google Ads data sync...")
    db = next(get_db())
    try:
        clients = db.query(client_model.Client).all()
        for client in clients:
            fetch_and_save_campaigns(db, client.id)
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
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)