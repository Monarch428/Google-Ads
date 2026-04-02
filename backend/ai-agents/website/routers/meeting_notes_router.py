from fastapi import APIRouter, HTTPException
from ..services.meeting_notes_service import MeetingNotesService
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv
from fastapi.responses import JSONResponse
from ..services.meeting_notes_service import MeetingNotesService, collection

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))
print("OPENAI KEY LOADED:", os.getenv("OPENAI_API_KEY", "NOT FOUND")[:20])

class MeetingNotesInput(BaseModel):
    meeting_id: Optional[str] = None
    title: str
    date: Optional[str] = None
    attendees: Optional[List[str]] = []
    notes: str
    action_items: Optional[List[str]] = []
    project: Optional[str] = None

router = APIRouter(prefix="/meeting-notes", tags=["Meeting Notes"])

@router.post("/upload")
def upload_meeting_data(data: MeetingNotesInput):
    try:
        MeetingNotesService.save_metadata(data.dict())
        return {"status": "success", "message": "Meeting notes saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/files")
def list_meeting_files():
    try:
        return MeetingNotesService.list_all()
    except Exception as e:
        return {"files": []}

@router.get("/search")
def search_meeting_notes(q: str):
    try:
        return MeetingNotesService.search(q)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summarize/{meeting_id}")
def summarize_meeting(meeting_id: str):
    try:
        summary = MeetingNotesService.summarize(meeting_id)
        return {"meeting_id": meeting_id, "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
     
@router.delete("/delete/{meeting_id}")
def delete_meeting_notes(meeting_id: str):
    try:
        MeetingNotesService.delete(meeting_id)
        return {"status": "success", "message": f"Meeting notes {meeting_id} deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{meeting_id}")
def download_meeting_notes(meeting_id: str):
    try:
        result = collection.get(ids=[meeting_id])
        if result and result["documents"]:
            content = result["documents"][0]
            meta = result["metadatas"][0] if result.get("metadatas") else {}
            return {
                "meeting_id": meeting_id,
                "title": meta.get("title", "notes.txt"),
                "content": content
            }
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
