# ---------------------------------------------------------
# routes/content_ai.py
# ---------------------------------------------------------
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional

# import your content AI module functions
from ..services.content_service import (
    extract_text_from_url,
    analyze_content,
    validate_content_placement
)

router = APIRouter(
    prefix="/content-ai",
    tags=["Content AI"]
)

# ---------------------------------------------------------
# Request Model
# ---------------------------------------------------------
class ContentAIRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None

    region: str = "US"                     # US or UK
    tone_rules: Optional[List[str]] = []   # ["friendly", "formal"]
    missing_notes: Optional[List[str]] = []
    meeting_notes: Optional[List[str]] = []

    sitemap: Optional[List[str]] = []      # ["home", "about", "services"]
    content_map: Optional[Dict[str, List[str]]] = {} 
    # e.g. { "home": ["hero text", "cta button"], "about": ["mission"] }

# ---------------------------------------------------------
# Route — Content AI Processing
# ---------------------------------------------------------
@router.post("/analyze")
async def analyze_content_ai(payload: ContentAIRequest):
    # 1. Validate input
    if not payload.url and not payload.text:
        raise HTTPException(
            status_code=400,
            detail="Either 'url' or 'text' must be provided."
        )

    # 2. Extract content from URL or use raw text
    if payload.url:
        extracted_text, error = extract_text_from_url(payload.url)
        if error:
            raise HTTPException(status_code=400, detail=error)
        text = extracted_text
    else:
        text = payload.text

    if not text or len(text.strip()) < 5:
        raise HTTPException(status_code=422, detail="No readable content found.")

    # 3. Run core content AI
    analysis = analyze_content(
        text=text,
        region=payload.region,
        tone_rules=payload.tone_rules,
        missing_notes=payload.missing_notes,
        meeting_notes=payload.meeting_notes
    )

    # 4. Optional content placement validation
    placement_result = {}
    if payload.content_map:
        # Build single-page content dict
        page_content = {"page": text}
        placement_result = validate_content_placement(page_content, payload.content_map)

    # 5. Build API response
    return {
        "status": "success",
        "source": payload.url if payload.url else "raw_text",
        "region": payload.region,
        "analysis": analysis,
        "placement_validation": placement_result
    }
