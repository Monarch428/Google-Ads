# routes/accessibility.py

import asyncio
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

# Import your audit function
from ..services.accessibility_service import main_async

router = APIRouter(prefix="/audit", tags=["Accessibility Audit"])


class Breakpoint(BaseModel):
    width: int
    height: int

class AuditRequest(BaseModel):
    urls: List[str]
    wcag_level: str = "AA"               
    browsers: List[str] = ["chromium", "webkit", "firefox"]
    breakpoints: Optional[dict] = {
        "desktop": {"width": 1920, "height": 1080},
        "tablet": {"width": 768, "height": 1024},
        "mobile": {"width": 375, "height": 812}
    }



@router.post("/accessibility")
async def run_accessibility_audit(payload: AuditRequest):
    """
    Runs Accessibility + WCAG + Responsive audit for the given URLs.
    Returns:
        - Full JSON report path
        - CSV summary path
        - Screenshots path
    """

    try:
        json_path, csv_path = await main_async(
            urls=payload.urls,
            breakpoints=payload.breakpoints,
            browsers=payload.browsers,
            wcag_level=payload.wcag_level
        )

        return {
            "status": "success",
            "message": "Accessibility Audit Completed Successfully",
            "json_report": str(json_path),
            "csv_summary": str(csv_path)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AUDIT ERROR: {str(e)}")


