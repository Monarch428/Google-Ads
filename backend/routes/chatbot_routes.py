from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from services.chatbot_service import chatbot_response

router = APIRouter(
    # prefix="/chatbot",
    tags=["Chatbot"]
)

# ✅ Request schema
class ChatbotRequest(BaseModel):
    message: str
    mode: str | None = "general"
    client_id: int | None = None

# ✅ Response schema
class ChatbotResponse(BaseModel):
    status: str
    reply: str

@router.post("/message", response_model=ChatbotResponse)
def chatbot_reply(request: ChatbotRequest, db: Session = Depends(get_db)):
    """
    💬 Chatbot endpoint — handles AI assistant conversations.
    """
    try:
        # reply_text = chatbot_response(db, request.message)
        reply_text = chatbot_response(
            db,
            user_message=request.message,
            mode=request.mode,
            client_id=request.client_id,
        )
        return {"status": "success", "reply": reply_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chatbot failed: {str(e)}")
