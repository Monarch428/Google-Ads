# models/campaign_conversion_stat.py
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class CampaignConversionStat(Base):
    __tablename__ = "campaign_conversion_stats"

    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)

    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    conversion_action_id = Column(Integer, ForeignKey("conversion_actions.id"), nullable=True, index=True)

    conversion_action_resource_name = Column(String(255), nullable=True)
    date = Column(Date, nullable=False)

    conversions = Column(Float, default=0.0)
    conversions_value = Column(Float, default=0.0)
    all_conversions = Column(Float, default=0.0)
    all_conversions_value = Column(Float, default=0.0)
    view_through_conversions = Column(Float, default=0.0)
    cost_per_conversion = Column(Float, default=0.0)
    cost_per_all_conversions = Column(Float, default=0.0)

    campaign = relationship("Campaign", back_populates="conversion_stats")
    conversion_action = relationship("ConversionAction", back_populates="campaign_stats")
