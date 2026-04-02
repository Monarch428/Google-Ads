# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv() 
from routers import (content_router, 
                     design_router, 
                     functional_router, 
                     seo_router, 
                     accessibility_router, 
                     technical_router,
                     report_router, 
                     meeting_notes_router)

from fastapi.staticfiles import StaticFiles

# Load environment variables from .env file

app = FastAPI(
    title="AI Website QA Agent",
    description="An AI-Agent system.",
    version="1.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include router
app.include_router(content_router.router)
app.include_router(design_router.router)
app.include_router(functional_router.router)
app.include_router(seo_router.router)
app.include_router(accessibility_router.router)
app.include_router(technical_router.router)
app.include_router(report_router.router)
app.include_router(meeting_notes_router.router)

app.mount("/static", StaticFiles(directory="static"), name="static")
@app.get("/")
def home():
    return {"message": "AI QA Agent is running "}



