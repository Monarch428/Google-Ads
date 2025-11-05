from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.chatbot_service import generate_chatbot_reply

router = APIRouter()

# Request schema
class ChatbotRequest(BaseModel):
    message: str

# Response schema
class ChatbotResponse(BaseModel):
    status: str
    reply: str

@router.post("/message", response_model=ChatbotResponse)
def chatbot_reply(request: ChatbotRequest):
    """
    💬 Chatbot endpoint — handles AI assistant conversations.
    """
    try:
        reply_text = generate_chatbot_reply(request.message)
        return {"status": "success", "reply": reply_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chatbot failed: {str(e)}")
