# routes/system_routes.py
from fastapi import APIRouter
from sqlalchemy import text
from database import engine
from apscheduler.schedulers.background import BackgroundScheduler
import os, time, json, psutil

router = APIRouter(prefix="/system", tags=["System Monitoring"])

# store last sync timestamp
LAST_SYNC_FILE = "logs/last_sync.json"
scheduler = BackgroundScheduler()

def get_last_sync_time():
    if os.path.exists(LAST_SYNC_FILE):
        with open(LAST_SYNC_FILE, "r") as f:
            data = json.load(f)
            return data.get("last_sync_time")
    return "Never"

@router.get("/status")
def system_status():
    # 1️⃣ Check DB connection
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_status = "Connected ✅"
    except Exception as e:
        db_status = f"Error ❌ ({e})"

    # 2️⃣ Get scheduler job list
    jobs = [job.name for job in scheduler.get_jobs()] if scheduler.running else []

    # 3️⃣ Server details
    uptime = time.strftime("%Hh %Mm %Ss", time.gmtime(time.time() - psutil.boot_time()))
    cpu_usage = psutil.cpu_percent(interval=0.5)
    memory = psutil.virtual_memory()
    mem_usage = f"{memory.percent}% of {round(memory.total/(1024**3), 2)} GB"

    # 4️⃣ Logs summary
    log_files = os.listdir("logs") if os.path.exists("logs") else []
    error_logs = [f for f in log_files if "error" in f.lower()]

    return {
        "database": db_status,
        "last_sync": get_last_sync_time(),
        "scheduler_jobs": jobs,
        "system_uptime": uptime,
        "cpu_usage": f"{cpu_usage}%",
        "memory_usage": mem_usage,
        "log_files": log_files,
        "error_logs": error_logs,
        "server_time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "status": "🟢 System Healthy" if "Connected" in db_status else "🔴 Check System"
    }
