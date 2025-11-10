"""Business logic for recommendation endpoints.

This module centralizes the recommendation-related operations so the
API routes remain thin and focused on request/response handling.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.client_model import Client
from models.recommendation_model import Comment, ExecutionLog, Recommendation


def _serialize_datetime(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _serialize_comment(comment: Comment) -> Dict[str, Any]:
    return {
        "id": comment.id,
        "recommendation_id": comment.recommendation_id,
        "user_id": comment.user_id,
        "text": comment.text,
        "created_at": _serialize_datetime(comment.created_at),
    }


def _serialize_execution_log(log: ExecutionLog) -> Dict[str, Any]:
    return {
        "id": log.id,
        "recommendation_id": log.recommendation_id,
        "before_metric": log.before_metric,
        "after_metric": log.after_metric,
        "improvement": log.improvement,
        "recorded_at": _serialize_datetime(log.recorded_at),
    }


def _serialize_recommendation(rec: Recommendation) -> Dict[str, Any]:
    return {
        "id": rec.id,
        "client_id": rec.client_id,
        "campaign_name": rec.campaign_name,
        "suggestion": rec.suggestion,
        "data_snapshot": rec.data_snapshot,
        "predicted_impact": rec.predicted_impact,
        "action_proposal": rec.action_proposal,
        "priority": rec.priority,
        "status": rec.status,
        "created_at": _serialize_datetime(rec.created_at),
        "updated_at": _serialize_datetime(rec.updated_at),
        "comments": [_serialize_comment(comment) for comment in rec.comments],
        "execution_logs": [
            _serialize_execution_log(log) for log in rec.execution_logs
        ],
    }


def _get_recommendation(db: Session, rec_id: int) -> Recommendation:
    rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    return rec


def _ensure_recommendation_access(rec: Recommendation, user: Any, db: Session) -> None:
    role = getattr(user, "role", None)
    if (role or "").lower() == "admin":
        return

    if rec.client_id is None:
        raise HTTPException(status_code=403, detail="Access to recommendation denied")

    client = db.query(Client).filter(Client.id == rec.client_id).first()
    if not client or client.assigned_manager_id != getattr(user, "id", None):
        raise HTTPException(status_code=403, detail="Access to recommendation denied")


def fetch_recommendations_for_user(db: Session, user: Any) -> List[Dict[str, Any]]:
    query = db.query(Recommendation).order_by(Recommendation.created_at.desc())

    role = getattr(user, "role", None)
    if (role or "").lower() != "admin":
        query = query.join(Client, Client.id == Recommendation.client_id).filter(
            Client.assigned_manager_id == getattr(user, "id", None)
        )

    recommendations = query.all()
    return [_serialize_recommendation(rec) for rec in recommendations]


def approve_recommendation(rec_id: int, user: Any, db: Session) -> Dict[str, Any]:
    rec = _get_recommendation(db, rec_id)
    _ensure_recommendation_access(rec, user, db)

    rec.status = "APPROVED"
    db.commit()
    db.refresh(rec)
    return {"message": f"Recommendation {rec.id} approved."}


def modify_recommendation_action(
    rec_id: int, new_action: str, user: Any, db: Session
) -> Dict[str, Any]:
    rec = _get_recommendation(db, rec_id)
    _ensure_recommendation_access(rec, user, db)

    rec.status = "MODIFIED"
    rec.action_proposal = new_action
    db.commit()
    db.refresh(rec)
    return {"message": f"Recommendation {rec.id} modified.", "new_action": new_action}


def dismiss_recommendation(rec_id: int, user: Any, db: Session) -> Dict[str, Any]:
    rec = _get_recommendation(db, rec_id)
    _ensure_recommendation_access(rec, user, db)

    rec.status = "DISMISSED"
    db.commit()
    db.refresh(rec)
    return {"message": f"Recommendation {rec.id} dismissed."}


def create_comment(
    rec_id: int, text: str, user: Any, db: Session
) -> Dict[str, Any]:
    rec = _get_recommendation(db, rec_id)
    _ensure_recommendation_access(rec, user, db)

    comment = Comment(
        recommendation_id=rec_id,
        text=text,
        user_id=getattr(user, "id", None),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {"message": "Comment added", "comment_id": comment.id}


def agent_create_recommendation(payload: Dict[str, Any], db: Session) -> Dict[str, Any]:
    rec = Recommendation(
        client_id=payload.get("client_id"),
        campaign_name=payload.get("campaign_name"),
        suggestion=payload.get("suggestion"),
        data_snapshot=payload.get("data_snapshot"),
        predicted_impact=payload.get("predicted_impact"),
        action_proposal=payload.get("action_proposal"),
        priority=payload.get("priority", "MEDIUM"),
        status="PENDING",
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"message": "Recommendation created by agent", "rec_id": rec.id}


def agent_update_recommendation(
    rec_id: int, payload: Dict[str, Any], db: Session
) -> Dict[str, Any]:
    rec = _get_recommendation(db, rec_id)

    if payload.get("new_impact") is not None:
        rec.predicted_impact = payload["new_impact"]
    if payload.get("new_suggestion") is not None:
        rec.suggestion = payload["new_suggestion"]

    db.commit()
    db.refresh(rec)
    return {"message": f"Recommendation {rec.id} updated by agent."}


def generate_action_bundle(
    rec_id: int, user: Any, db: Session
) -> Dict[str, Any]:
    rec = _get_recommendation(db, rec_id)
    _ensure_recommendation_access(rec, user, db)

    if rec.status != "APPROVED":
        raise HTTPException(
            status_code=400,
            detail="Action Bundle can only be generated for approved items",
        )

    bundle = {
        "campaign_name": rec.campaign_name,
        "action_proposal": rec.action_proposal,
        "predicted_impact": rec.predicted_impact,
        "data_snapshot": rec.data_snapshot,
        "instructions": [
            "Review campaign data in Google Ads Manager.",
            "Apply recommended action manually.",
            "Monitor post-change performance.",
        ],
        "generated_at": datetime.utcnow().isoformat(),
    }

    return {"bundle": bundle}


def mark_recommendation_executed(
    rec_id: int, before_metric: float, after_metric: float, user: Any, db: Session
) -> Dict[str, Any]:
    rec = _get_recommendation(db, rec_id)
    _ensure_recommendation_access(rec, user, db)

    improvement = after_metric - before_metric
    impact_percent = (
        (improvement / before_metric) * 100 if before_metric != 0 else 0
    )

    rec.status = "EXECUTED"

    log = ExecutionLog(
        recommendation_id=rec.id,
        before_metric=before_metric,
        after_metric=after_metric,
        improvement=impact_percent,
    )
    db.add(log)
    db.commit()
    db.refresh(rec)
    db.refresh(log)

    return {
        "message": f"Recommendation {rec.id} marked as executed.",
        "before": before_metric,
        "after": after_metric,
        "improvement_percent": round(impact_percent, 2),
        "log_id": log.id,
    }
