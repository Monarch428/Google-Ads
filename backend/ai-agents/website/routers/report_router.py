# routers/report_router.py
# Router for generating the full BeeSure Website Analysis Report

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict

from ..services.report_service import BeeSureAIReport


router = APIRouter(
    prefix="/report",
    tags=["BeeSure Report"]
)


class ReportRequest(BaseModel):
    url: str

    # Content AI
    region: Optional[str] = "US"

    # SEO AI
    keyword_targets: Optional[List[str]] = []
    priority_pages: Optional[List[str]] = []

    # Design AI
    brand_colors: Optional[List[str]] = []
    brand_fonts: Optional[List[str]] = []
    competitors: Optional[List[str]] = []
    layout_rules: Optional[Dict[str, bool]] = {}


@router.post("/generate")
async def generate_report(payload: ReportRequest):

    if not payload.url:
        raise HTTPException(status_code=400, detail="URL is required to generate report.")

    report_engine = BeeSureAIReport()

    try:
        final_report = report_engine.generate_report(
            url=payload.url,
            region=payload.region,
            brand_colors=payload.brand_colors,
            brand_fonts=payload.brand_fonts,
            competitors=payload.competitors,
            layout_rules=payload.layout_rules,
            keyword_targets=payload.keyword_targets,
            priority_pages=payload.priority_pages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {e}")

    return {
        "status": "success",
        "message": "Website analysis report generated successfully.",
        "data": final_report
    }

@router.delete("/delete-report/{report_id}")
def delete_report(report_id: str):
    # Placeholder for report deletion logic
    try:
        # Implement deletion logic here
        return {"status": "success", "message": f"Report {report_id} deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete report: {e}")
    