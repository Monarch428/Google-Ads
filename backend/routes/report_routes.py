from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from database import get_db
from models.recommendation_model import Recommendation, ExecutionLog
from datetime import datetime
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
import pandas as pd
from fastapi.responses import FileResponse

router = APIRouter(
    tags=["Client Reports"])

@router.post("/client/{client_id}/export/pdf")
def export_client_report_pdf(
    client_id: int,
    brand_name: str = Query("AAA Agency"),
    logo: UploadFile | None = File(None),
    db: Session = Depends(get_db)
):
    recs = db.query(Recommendation).filter(
        Recommendation.client_id == client_id,
        Recommendation.status == "EXECUTED"
    ).all()

    if not recs:
        raise HTTPException(404, "No executed recommendations found for this client.")

    # Prepare PDF
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - inch
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(1 * inch, y, f"{brand_name} - Client Report")
    y -= 0.5 * inch
    pdf.setFont("Helvetica", 12)
    pdf.drawString(1 * inch, y, f"Client ID: {client_id} | Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    y -= 0.5 * inch

    # Table header
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(1 * inch, y, "Campaign")
    pdf.drawString(3.5 * inch, y, "Action")
    pdf.drawString(6.5 * inch, y, "Impact %")
    y -= 0.3 * inch

    pdf.setFont("Helvetica", 11)
    for rec in recs:
        logs = db.query(ExecutionLog).filter(ExecutionLog.recommendation_id == rec.id).all()
        improvement = f"{logs[-1].improvement:.2f}%" if logs else "-"
        pdf.drawString(1 * inch, y, rec.campaign_name[:25])
        pdf.drawString(3.5 * inch, y, rec.action_proposal[:30])
        pdf.drawString(6.5 * inch, y, improvement)
        y -= 0.3 * inch
        if y < 1 * inch:
            pdf.showPage()
            y = height - inch

    pdf.save()
    buffer.seek(0)

    filename = f"client_{client_id}_report.pdf"
    with open(filename, "wb") as f:
        f.write(buffer.getvalue())

    return FileResponse(filename, media_type="application/pdf", filename=filename)

@router.get("/client/{client_id}/export/csv")
def export_client_report_csv(client_id: int, db: Session = Depends(get_db)):
    recs = db.query(Recommendation).filter(
        Recommendation.client_id == client_id,
        Recommendation.status == "EXECUTED"
    ).all()

    if not recs:
        raise HTTPException(404, "No executed recommendations found for this client.")

    data = []
    for rec in recs:
        logs = db.query(ExecutionLog).filter(ExecutionLog.recommendation_id == rec.id).all()
        if logs:
            latest = logs[-1]
            data.append({
                "Campaign": rec.campaign_name,
                "Action": rec.action_proposal,
                "Before": latest.before_metric,
                "After": latest.after_metric,
                "Improvement (%)": round(latest.improvement, 2),
                "Recorded": latest.recorded_at
            })

    df = pd.DataFrame(data)
    filename = f"client_{client_id}_report.csv"
    df.to_csv(filename, index=False)
    return FileResponse(filename, media_type="text/csv", filename=filename)


# In your existing report_routes.py — extract the core logic into a standalone function
async def generate_pdf_bytes(report_id: int, db: Session) -> bytes:
    """Reusable function that returns raw PDF bytes for a given report ID."""
    report = db.query(YourReportModel).filter(YourReportModel.id == report_id).first()
    if not report:
        raise ValueError(f"Report {report_id} not found")
    
    # Whatever PDF generation you already do — WeasyPrint, ReportLab, etc.
    # Return the raw bytes instead of a Response
    pdf_bytes = your_existing_pdf_generation_logic(report)
    return pdf_bytes
