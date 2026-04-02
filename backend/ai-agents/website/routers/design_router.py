# ---------------------------------------------------------
# routers/design_router.py
# ---------------------------------------------------------
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional

from ..services.design_service import DesignCheckAgent

router = APIRouter(prefix="/design-ai", tags=["Design AI"])


# ---------------------------------------------------------
# Request Body Schema
# ---------------------------------------------------------
class DesignAIRequest(BaseModel):
    url: str
    brand_colors: List[str]
    brand_fonts: List[str]
    theme_refs: Optional[List[str]] = None
    competitor_urls: Optional[List[str]] = None
    custom_layout_rules: Optional[Dict[str, bool]] = None
    priority_pages: Optional[List[str]] = None


# ---------------------------------------------------------
# POST Route
# ---------------------------------------------------------
@router.post("/analyze")
async def analyze_design_ai(req: DesignAIRequest):

    agent = DesignCheckAgent()

    result = agent.run(
        url=req.url,
        brand_colors=req.brand_colors,
        brand_fonts=req.brand_fonts,
        theme_refs=req.theme_refs,
        competitor_urls=req.competitor_urls,
        custom_layout_rules=req.custom_layout_rules,
        priority_pages=req.priority_pages
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result
