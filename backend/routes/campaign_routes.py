from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.campaign_model import Campaign
from models.client_model import Client
from models.user_model import UserRole, coerce_role
from utils.auth_dependencies import get_current_user, require_admin_user

router = APIRouter(
    # prefix="/campaigns", 
    tags=["Campaigns"])

# Get all campaigns
@router.get("/")
def get_campaigns(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Campaign)
    if coerce_role(current_user.role) != UserRole.ADMIN:
        query = query.join(Client).filter(Client.assigned_manager_id == current_user.id)
    return query.all()

# Get campaign by ID
@router.get("/{campaign_id}")
def get_campaign(
    campaign_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if coerce_role(current_user.role) != UserRole.ADMIN:
        client = campaign.client or db.query(Client).filter(Client.id == campaign.client_id).first()
        if not client or client.assigned_manager_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access to campaign denied")
    return campaign

# Create campaign
@router.post("/")
def create_campaign(
    name: str,
    client_id: int,
    _: None = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    campaign = Campaign(name=name, client_id=client_id)
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign
