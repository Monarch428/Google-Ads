# schemas/analysis_result.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ScoresIn(BaseModel):
    overall:       float
    seo:           float
    accessibility: float
    performance:   float
    security:      float


class IssueCountIn(BaseModel):
    critical: int
    high:     int
    medium:   int
    low:      int


class AnalysisResultCreate(BaseModel):
    fileId:      str
    fileName:    str
    projectName: str
    fileType:    str
    lineCount:   int
    wordCount:   int
    isCodeFile:  bool
    scores:      ScoresIn
    issueCount:  IssueCountIn
    summary:     str


class AnalysisResultOut(BaseModel):
    id:          int
    file_id:     str
    file_name:   str
    score_overall: float
    created_at:  datetime

    class Config:
        from_attributes = True