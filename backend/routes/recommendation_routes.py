from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from database import get_db
from models.recommendation_model import Recommendation, Comment, ExecutionLog

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


# 🧾 1. List all recommendations (Inbox)
@router.get("/")
def list_recommendations(db: Session = Depends(get_db)):
    recs = db.query(Recommendation).order_by(Recommendation.created_at.desc()).all()
    return recs


# ✅ 2. Approve recommendation
@router.post("/{rec_id}/approve")
def approve_recommendation(rec_id: int, db: Session = Depends(get_db)):
    rec = db.query(Recommendation).get(rec_id)
    if not rec:
        raise HTTPException(404, "Recommendation not found")

    rec.status = "APPROVED"
    db.commit()
    db.refresh(rec)
    return {"message": f"Recommendation {rec.id} approved."}


# ✏️ 3. Modify recommendation
class ModifyRequest(BaseModel):
    new_action: str

@router.post("/{rec_id}/modify")
def modify_recommendation(rec_id: int, data: ModifyRequest, db: Session = Depends(get_db)):
    rec = db.query(Recommendation).get(rec_id)
    if not rec:
        raise HTTPException(404, "Recommendation not found")

    rec.status = "MODIFIED"
    rec.action_proposal = data.new_action
    db.commit()
    db.refresh(rec)
    return {"message": f"Recommendation {rec.id} modified.", "new_action": data.new_action}


# ❌ 4. Dismiss recommendation
@router.post("/{rec_id}/dismiss")
def dismiss_recommendation(rec_id: int, db: Session = Depends(get_db)):
    rec = db.query(Recommendation).get(rec_id)
    if not rec:
        raise HTTPException(404, "Recommendation not found")

    rec.status = "DISMISSED"
    db.commit()
    db.refresh(rec)
    return {"message": f"Recommendation {rec.id} dismissed."}


# 💬 5. Add a comment
class CommentRequest(BaseModel):
    text: str

@router.post("/{rec_id}/comment")
def add_comment(rec_id: int, req: CommentRequest, db: Session = Depends(get_db)):
    rec = db.query(Recommendation).get(rec_id)
    if not rec:
        raise HTTPException(404, "Recommendation not found")

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
def agent_create_recommendation(req: AgentRecommendationRequest, db: Session = Depends(get_db)):
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
def agent_update_recommendation(rec_id: int, req: AgentUpdateRequest, db: Session = Depends(get_db)):
    rec = db.query(Recommendation).get(rec_id)
    if not rec:
        raise HTTPException(404, "Recommendation not found")

    if req.new_impact is not None:
        rec.predicted_impact = req.new_impact
    if req.new_suggestion is not None:
        rec.suggestion = req.new_suggestion

    db.commit()
    db.refresh(rec)
    return {"message": f"Recommendation {rec.id} updated by agent."}


# 📦 8. Generate Action Bundle for Approved Recommendation
@router.get("/{rec_id}/bundle")
def generate_action_bundle(rec_id: int, db: Session = Depends(get_db)):
    rec = db.query(Recommendation).get(rec_id)
    if not rec:
        raise HTTPException(404, "Recommendation not found")

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
def mark_as_executed(rec_id: int, data: ExecutionData, db: Session = Depends(get_db)):
    rec = db.query(Recommendation).get(rec_id)
    if not rec:
        raise HTTPException(404, "Recommendation not found")

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
