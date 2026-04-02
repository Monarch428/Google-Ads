# routes/analysis.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas.analysis_result import AnalysisResultCreate, AnalysisResultOut
from services.analysis_service import (
    save_or_update_analysis,
    get_analysis_by_file_id,
    get_all_analysis_results,
)
from website.services.meeting_notes_service import MeetingNotesService, collection

router = APIRouter(prefix="/website/meeting-notes", tags=["analysis"])


@router.post("/analysis/{file_id}")
def save_analysis(
    file_id: str,
    payload: AnalysisResultCreate,
    db: Session = Depends(get_db),
):
    if payload.fileId != file_id:
        raise HTTPException(400, "file_id mismatch")
    result = save_or_update_analysis(db, payload)
    return {"message": "Analysis saved", "id": result.id}


@router.get("/analysis/{file_id}")
def get_analysis(file_id: str, db: Session = Depends(get_db)):
    result = get_analysis_by_file_id(db, file_id)
    if not result:
        raise HTTPException(404, "No analysis found for this file")
    return result


@router.get("/analysis")
def get_all_analysis(db: Session = Depends(get_db)):
    return get_all_analysis_results(db)


@router.patch("/{file_id}/status")
def update_status(file_id: str, body: dict):
    new_status = body.get("status", "Analysed")
    try:
        existing = collection.get(ids=[file_id])

        if not existing or not existing["ids"]:
            raise HTTPException(404, "File not found in ChromaDB")

        meta = existing["metadatas"][0]
        doc  = existing["documents"][0]

        meta["status"] = new_status
        collection.upsert(
            ids=[file_id],
            metadatas=[meta],
            documents=[doc],
        )
        return {"message": f"Status updated to {new_status}"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))