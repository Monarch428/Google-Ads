# seo_routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from services.seo_service import run_seo_analysis
from models.seo_model import SeoReport
from schemas.seo_schema import SeoRequest
import json

router = APIRouter()


# ✅ Helper to serialize a report (avoids repeating yourself)
def serialize_report(r, include_results=False):
    data = {
        "id": r.id,
        "url": r.url,
        "status": r.status,
        "overall_score": r.overall_score,
        "scores": {
            "content": r.content_score,
            "technical": r.technical_score,
            "links": r.links_score,
            "performance": r.performance_score,
            "grade": r.grade,
        },
        "created_at": str(r.created_at),
    }
    if include_results:
        data["results"] = r.results
    return data

@router.post("/analyze")
def analyze_seo(request: SeoRequest, db: Session = Depends(get_db)):
    if not request.url.startswith("http"):
        raise HTTPException(
            status_code=400,
            detail="URL must start with http:// or https://"
        )
    try:
        report = run_seo_analysis(url=request.url, db=db)
        return serialize_report(report, include_results=True)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"SEO analysis failed: {str(e)}"
        )

@router.get("/reports")
def get_seo_reports(db: Session = Depends(get_db)):
    reports = (
        db.query(SeoReport)
        .order_by(SeoReport.created_at.desc())
        .limit(50)
        .all()
    )
    return [serialize_report(r) for r in reports]

@router.get("/reports/{report_id}")
def get_seo_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(SeoReport).filter(SeoReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return serialize_report(report, include_results=True)


# ─────────────────────────────────────────────
# GET /reports/{report_id}/ai-insights — Generate AI recommendations
# ─────────────────────────────────────────────
@router.get("/reports/{report_id}/ai-insights")
def get_ai_insights(report_id: int, db: Session = Depends(get_db)):
    from services.seo_service import generate_ai_insights

    result = generate_ai_insights(report_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Report not found")

    return {
        "report_id": report_id,
        "ai_insights": result
    }