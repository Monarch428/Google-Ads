# seo_schema.py
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


# What frontend SENDS to backend
class SeoRequest(BaseModel):
    url: str  # "https://example.com"


# What backend RETURNS to frontend
class SeoReportResponse(BaseModel):
    id: int
    url: str
    status: str
    overall_score: Optional[int]
    results: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True 