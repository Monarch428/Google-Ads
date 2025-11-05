# models/campaign_model.py
from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    conversions = Column(Integer, default=0)
    
    # ✅ This line creates the link between Campaign and Client
    client_id = Column(Integer, ForeignKey("clients.id"))

    # ✅ Relationship back to Client
    client = relationship("Client", back_populates="campaigns")
