from pydantic import BaseModel

class MeetingNotesInput(BaseModel):
    title: str
    content: str