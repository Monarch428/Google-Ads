from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.campaign_model import Campaign

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])

# Get all campaigns
@router.get("/")
def get_campaigns(db: Session = Depends(get_db)):
    return db.query(Campaign).all()

# Get campaign by ID
@router.get("/{campaign_id}")
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

# Create campaign
@router.post("/")
def create_campaign(name: str, client_id: int, db: Session = Depends(get_db)):
    campaign = Campaign(name=name, client_id=client_id)
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign
