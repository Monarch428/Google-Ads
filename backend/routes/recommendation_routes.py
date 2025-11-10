from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models.client_model import Client
from models.recommendation_model import Recommendation, Comment, ExecutionLog
from utils.auth_dependencies import get_current_user, require_admin_user

router = APIRouter(
    # prefix="/recommendations", 
    tags=["Recommendations"])


# 🧾 1. List all recommendations (Inbox)
def _get_recommendation(db: Session, rec_id: int) -> Recommendation:
    rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    return rec


def _ensure_recommendation_access(rec: Recommendation, user, db: Session) -> None:
    if (user.role or "").lower() == "admin":
        return

    if rec.client_id is None:
        raise HTTPException(status_code=403, detail="Access to recommendation denied")

    client = db.query(Client).filter(Client.id == rec.client_id).first()
    if not client or client.assigned_manager_id != user.id:
        raise HTTPException(status_code=403, detail="Access to recommendation denied")


# 🧾 1. List all recommendations (Inbox)
@router.get("/")
def list_recommendations(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Recommendation).order_by(Recommendation.created_at.desc())
    if (current_user.role or "").lower() != "admin":
        query = query.join(Client, Client.id == Recommendation.client_id).filter(
            Client.assigned_manager_id == current_user.id
        )
    return query.all()


# ✅ 2. Approve recommendation
@router.post("/{rec_id}/approve")
def approve_recommendation(
    rec_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = _get_recommendation(db, rec_id)
    _ensure_recommendation_access(rec, current_user, db)

    rec.status = "APPROVED"
    db.commit()
    db.refresh(rec)
    return {"message": f"Recommendation {rec.id} approved."}


# ✏️ 3. Modify recommendation
class ModifyRequest(BaseModel):
    new_action: str

@router.post("/{rec_id}/modify")
def modify_recommendation(
    rec_id: int,
    data: ModifyRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = _get_recommendation(db, rec_id)
    _ensure_recommendation_access(rec, current_user, db)

    rec.status = "MODIFIED"
    rec.action_proposal = data.new_action
    db.commit()
    db.refresh(rec)
    return {"message": f"Recommendation {rec.id} modified.", "new_action": data.new_action}


# ❌ 4. Dismiss recommendation
@router.post("/{rec_id}/dismiss")
def dismiss_recommendation(
    rec_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = _get_recommendation(db, rec_id)
    _ensure_recommendation_access(rec, current_user, db)

    rec.status = "DISMISSED"
    db.commit()
    db.refresh(rec)
    return {"message": f"Recommendation {rec.id} dismissed."}


# 💬 5. Add a comment
class CommentRequest(BaseModel):
    text: str

@router.post("/{rec_id}/comment")
def add_comment(
    rec_id: int,
    req: CommentRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = _get_recommendation(db, rec_id)
    _ensure_recommendation_access(rec, current_user, db)

    comment = Comment(recommendation_id=rec_id, text=req.text)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {"message": "Comment added", "comment_id": comment.id}


# 🤖 6. Agent creates a new recommendation
class AgentRecommendationRequest(BaseModel):
    client_id: int
    campaign_name: str
    suggestion: str
    data_snapshot: str
    predicted_impact: float
    action_proposal: str
    priority: str = "MEDIUM"

@router.post("/agent/create")
def agent_create_recommendation(
    req: AgentRecommendationRequest,
    _: None = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    rec = Recommendation(
        client_id=req.client_id,
        campaign_name=req.campaign_name,
        suggestion=req.suggestion,
        data_snapshot=req.data_snapshot,
        predicted_impact=req.predicted_impact,
        action_proposal=req.action_proposal,
        priority=req.priority,
        status="PENDING"
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"message": "Recommendation created by agent", "rec_id": rec.id}


# 🔁 7. Agent updates impact or suggestion text
class AgentUpdateRequest(BaseModel):
    new_impact: float | None = None
    new_suggestion: str | None = None

@router.post("/{rec_id}/agent/update")
def agent_update_recommendation(
    rec_id: int,
    req: AgentUpdateRequest,
    _: None = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    rec = _get_recommendation(db, rec_id)

    if req.new_impact is not None:
        rec.predicted_impact = req.new_impact
    if req.new_suggestion is not None:
        rec.suggestion = req.new_suggestion

    db.commit()
    db.refresh(rec)
    return {"message": f"Recommendation {rec.id} updated by agent."}


# 📦 8. Generate Action Bundle for Approved Recommendation
@router.get("/{rec_id}/bundle")
def generate_action_bundle(
    rec_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = _get_recommendation(db, rec_id)
    _ensure_recommendation_access(rec, current_user, db)

    if rec.status != "APPROVED":
        raise HTTPException(400, "Action Bundle can only be generated for approved items")

    bundle = {
        "campaign_name": rec.campaign_name,
        "action_proposal": rec.action_proposal,
        "predicted_impact": rec.predicted_impact,
        "data_snapshot": rec.data_snapshot,
        "instructions": [
            "Review campaign data in Google Ads Manager.",
            "Apply recommended action manually.",
            "Monitor post-change performance."
        ],
        "generated_at": datetime.utcnow().isoformat()
    }

    return {"bundle": bundle}


# 📊 9. Mark recommendation as executed & track results
class ExecutionData(BaseModel):
    before_metric: float
    after_metric: float

@router.post("/{rec_id}/executed")
def mark_as_executed(
    rec_id: int,
    data: ExecutionData,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = _get_recommendation(db, rec_id)
    _ensure_recommendation_access(rec, current_user, db)

    # Calculate improvement %
    improvement = data.after_metric - data.before_metric
    impact_percent = (improvement / data.before_metric) * 100 if data.before_metric != 0 else 0

    # Update status
    rec.status = "EXECUTED"

    # Create execution log record
    log = ExecutionLog(
        recommendation_id=rec.id,
        before_metric=data.before_metric,
        after_metric=data.after_metric,
        improvement=impact_percent
    )
    db.add(log)
    db.commit()
    db.refresh(rec)
    db.refresh(log)

    return {
        "message": f"Recommendation {rec.id} marked as executed.",
        "before": data.before_metric,
        "after": data.after_metric,
        "improvement_percent": round(impact_percent, 2),
        "log_id": log.id
    }
