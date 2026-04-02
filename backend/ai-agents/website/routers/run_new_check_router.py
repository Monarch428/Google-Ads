from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import os
from fastapi.responses import FileResponse
from ..services.pdf_service import generate_pdf_from_report_result
from models.run_new_check import RunNewCheck 
from database import get_db
from schemas.run_new_check_schema import (
    RunNewCheckCreate,
    RunNewCheckResponse
)

from ..services.run_new_check_service import RunNewCheckService

router = APIRouter(
    prefix="/run-new-checks",
    tags=["Run New Check"],
)

@router.get("/{record_id}/download-pdf")
def download_report_pdf(record_id: int, db: Session = Depends(get_db)):
    record = db.query(RunNewCheck).filter(RunNewCheck.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    if not record.report_result:
        raise HTTPException(status_code=404, detail="No report data found for this record")

    try:
        pdf_path = generate_pdf_from_report_result(record.report_result, record)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=500, detail="PDF file was not created")

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=f"beesure_report_{record.project_name}_{record_id}.pdf",
        background=None,
    )


@router.post("", response_model=dict)
def create_run_new_check(
    payload: RunNewCheckCreate,
    db: Session = Depends(get_db),
):
    try:
        return RunNewCheckService.create_run_new_check_with_analysis(db, payload)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=list[RunNewCheckResponse])
def list_run_new_checks(db: Session = Depends(get_db)):
    try:
        return RunNewCheckService.list_run_new_checks(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{record_id}", response_model=RunNewCheckResponse)
def get_run_new_check(record_id: int, db: Session = Depends(get_db)):
    try:
        return RunNewCheckService.get_run_new_check(db, record_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))