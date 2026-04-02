# services/analysis_service.py
from sqlalchemy.orm import Session
from models.analysis_result import AnalysisResult
from schemas.analysis_result import AnalysisResultCreate


def save_or_update_analysis(db: Session, payload: AnalysisResultCreate) -> AnalysisResult:
    """
    Upsert: if analysis for file_id exists, update it.
    Otherwise create a new row.
    """
    existing = db.query(AnalysisResult).filter(
        AnalysisResult.file_id == payload.fileId
    ).first()

    data = dict(
        file_id            = payload.fileId,
        file_name          = payload.fileName,
        project_name       = payload.projectName,
        file_type          = payload.fileType,
        line_count         = payload.lineCount,
        word_count         = payload.wordCount,
        is_code_file       = int(payload.isCodeFile),
        score_overall      = payload.scores.overall,
        score_seo          = payload.scores.seo,
        score_accessibility= payload.scores.accessibility,
        score_performance  = payload.scores.performance,
        score_security     = payload.scores.security,
        issues_critical    = payload.issueCount.critical,
        issues_high        = payload.issueCount.high,
        issues_medium      = payload.issueCount.medium,
        issues_low         = payload.issueCount.low,
        summary            = payload.summary,
        raw_result         = payload.dict(),   # full JSON backup
    )

    if existing:
        for k, v in data.items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return existing

    record = AnalysisResult(**data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_analysis_by_file_id(db: Session, file_id: str):
    return db.query(AnalysisResult).filter(
        AnalysisResult.file_id == file_id
    ).first()


def get_all_analysis_results(db: Session):
    return db.query(AnalysisResult).order_by(
        AnalysisResult.updated_at.desc()
    ).all()