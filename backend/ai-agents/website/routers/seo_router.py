from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from ..services.seo_service import SEOAnalyzer

router = APIRouter(
    prefix="/seo",
    tags=["SEO AI"]
)

# Request Model
class SEORequest(BaseModel):
    url: str
    target_keywords: Optional[List[str]] = []
    priority_pages: Optional[List[str]] = []


@router.post("/analyze")
async def analyze_seo(payload: SEORequest):

    if not payload.url:
        raise HTTPException(status_code=400, detail="URL is required")

    seo_engine = SEOAnalyzer()

    try:
        result = seo_engine.analyze_url(
            url=payload.url,
            target_keywords=payload.target_keywords,
            priority_pages=payload.priority_pages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "status": "success",
        "data": result
    }
