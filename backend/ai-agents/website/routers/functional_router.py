from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
from ..services.functional_service import run_functional_audit

router = APIRouter(prefix="/audit", tags=["Functional Audit"])

class FunctionalAuditRequest(BaseModel):
    base_url: str

    # CAPTCHA test mode keys
    captcha_keys: Optional[Dict[str, str]] = {
        "site_key": "",
        "secret_key": "",
        "mode": "test"      # test or live
    }

    # Form rules (required fields, patterns)
    form_rules: Dict[str, dict] = {
        "email_pattern": r"[^@]+@[^@]+\\.[^@]+",
        "phone_pattern": r"^[0-9\\-\\+\\(\\)\\s]{6,15}$"
    }

    # Expected flow: thank-you text, redirect url
    expected_flows: Dict[str, str] = {
        "thank_you_text": "thank",
        "success_keywords": "success",
        "redirect_contains": "thank-you"
    }

    # third-party forms to verify
    third_party_integrations: List[str] = [
        "mailchimp",
        "google_sheets",
        "hubspot",
        "zoho"
    ]


# ---------------------------------------------------------
# Route: Run Functional AI Audit
# ---------------------------------------------------------
@router.post("/functional")
def run_functional_scan(payload: FunctionalAuditRequest):
    """
    Functional AI Audit:
      - Form detection
      - Required/optional validation
      - Email/phone pattern matching
      - CAPTCHA (test mode)
      - Submission flow (redirect, thank-you)
      - Popups / Accordions / Carousels
      - Mailchimp / HubSpot / Zoho detection
    """

    try:
        audit_data, report_path = run_functional_audit(
            base_url=payload.base_url,
            captcha_keys=payload.captcha_keys,
            form_rules=payload.form_rules,
            expected_flows=payload.expected_flows,
            third_party_rules=payload.third_party_integrations
        )

        return {
            "status": "success",
            "message": "Functional Audit Completed Successfully",
            "report_file": str(report_path),
            "results": audit_data
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Functional Audit Failed: {str(e)}"
        )





