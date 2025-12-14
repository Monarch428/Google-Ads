# models/conversion_action_model.py
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class ConversionAction(Base):
    __tablename__ = "conversion_actions"

    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)

    google_conversion_action_id = Column(String(50), index=True, nullable=True)
    resource_name = Column(String(255), unique=True, nullable=True)

    name = Column(String(255), nullable=True)
    type = Column(String(50), nullable=True)
    category = Column(String(50), nullable=True)
    origin = Column(String(50), nullable=True)
    status = Column(String(50), nullable=True)

    include_in_conversions_metric = Column(Boolean, default=True)
    primary_for_goal = Column(Boolean, default=False)

    default_value = Column(Float, nullable=True)
    always_use_default_value = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="conversion_actions")
    campaign_stats = relationship(
        "CampaignConversionStat",
        back_populates="conversion_action",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
