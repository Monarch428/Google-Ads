from pydantic import BaseModel

class InsightBase(BaseModel):
    metric: str
    trend: str
    prediction: str
    priority: str
    impact: str
    recommendation: str

class InsightCreate(InsightBase):
    pass

class InsightResponse(InsightBase):
    id: int
    class Config:
        from_attributes = True



