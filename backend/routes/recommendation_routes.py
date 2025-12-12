from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from services import recommendation_service
from utils.auth_dependencies import get_current_user, require_admin_user

router = APIRouter(
    # prefix="/recommendations",
    tags=["Recommendations"])


# 🧾 1. List all recommendations (Inbox)
@router.get("/")
def list_recommendations(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return recommendation_service.fetch_recommendations_for_user(db, current_user)


# ✅ 2. Approve recommendation
@router.post("/{rec_id}/approve")
def approve_recommendation(
    rec_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return recommendation_service.approve_recommendation(rec_id, current_user, db)


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
    return recommendation_service.modify_recommendation_action(
        rec_id,
        data.new_action,
        current_user,
        db,
    )


# ❌ 4. Dismiss recommendation
@router.post("/{rec_id}/dismiss")
def dismiss_recommendation(
    rec_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return recommendation_service.dismiss_recommendation(rec_id, current_user, db)


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
    return recommendation_service.create_comment(rec_id, req.text, current_user, db)


# 🤖 6. Agent creates a new recommendation
class AgentRecommendationRequest(BaseModel):
    client_id: int
    campaign_name: str
    suggestion: str
    data_snapshot: str
    predicted_impact: float
    action_proposal: str
    priority: str = "MEDIUM"
    customer_id: str | None = None


@router.post("/agent/create")
def agent_create_recommendation(
    req: AgentRecommendationRequest,
    _: None = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return recommendation_service.agent_create_recommendation(req.dict(), db)


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
    return recommendation_service.agent_update_recommendation(
        rec_id,
        req.dict(exclude_unset=True),
        db,
    )


# 📦 8. Generate Action Bundle for Approved Recommendation
@router.get("/{rec_id}/bundle")
def generate_action_bundle(
    rec_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return recommendation_service.generate_action_bundle(
        rec_id,
        current_user,
        db,
    )


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
    return recommendation_service.mark_recommendation_executed(
        rec_id,
        data.before_metric,
        data.after_metric,
        current_user,
        db,
    )
