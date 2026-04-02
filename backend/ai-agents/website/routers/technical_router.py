# routes/technical.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional

from ..services.technical_service import run_technical_audit

router = APIRouter(prefix="/audit", tags=["Technical Audit"])


# -------------------------------------------------------
# Request Body Model
# -------------------------------------------------------
class TechnicalAuditRequest(BaseModel):
    base_url: str

    # old → new redirects
    redirect_rules: Dict[str, str] = {}

    # analytics, chatbot, pixel rules
    custom_script_rules: Optional[List[str]] = []

    # performance limits
    performance_limits: Dict[str, float] = {
        "max_load_time": 4.0,        # seconds
        "image_max_kb": 300          # KB
    }

    # required integrations
    integrations: List[str] = ["google_analytics", "payment_gateway", "crm"]

    # critical pages (URLs)
    critical_pages: Dict[str, str] = {
        "checkout": "",
        "login": "",
        "cart": ""
    }


# -------------------------------------------------------
# Route: Run Technical Audit
# -------------------------------------------------------
@router.post("/technical")
async def run_technical_scan(payload: TechnicalAuditRequest):
    import asyncio
    loop = asyncio.get_event_loop()
    audit_data, report_path = await loop.run_in_executor(
        None,
        lambda: run_technical_audit(
            base_url=payload.base_url,
            old_new_redirects=payload.redirect_rules,
            custom_script_rules=payload.custom_script_rules,
            performance_limits=payload.performance_limits,
            integrations=payload.integrations,
            critical_pages=payload.critical_pages
        )
    )
    return {
        "status": "success",
        "message": "Technical Audit Completed Successfully",
        "report_file": str(report_path),
        "results": audit_data
    }