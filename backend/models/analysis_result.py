# models/analysis_result.py
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    file_id       = Column(String, unique=True, index=True, nullable=False)  # ChromaDB meeting_id
    file_name     = Column(String, nullable=False)
    project_name  = Column(String, default="Unassigned")
    file_type     = Column(String)
    line_count    = Column(Integer, default=0)
    word_count    = Column(Integer, default=0)
    is_code_file  = Column(Integer, default=0)  # boolean as int for SQLite compat

    # Score columns (easier to query/sort than nested JSON)
    score_overall      = Column(Float, default=0)
    score_seo          = Column(Float, default=0)
    score_accessibility= Column(Float, default=0)
    score_performance  = Column(Float, default=0)
    score_security     = Column(Float, default=0)

    # Issue counts
    issues_critical = Column(Integer, default=0)
    issues_high     = Column(Integer, default=0)
    issues_medium   = Column(Integer, default=0)
    issues_low      = Column(Integer, default=0)

    summary    = Column(String)
    raw_result = Column(JSON)   # full JSON blob as backup

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)