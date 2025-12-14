# models/campaign_asset_performance.py
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class CampaignAssetPerformance(Base):
    __tablename__ = "campaign_asset_performance"

    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)

    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False, index=True)

    campaign_asset_resource_name = Column(String(255), nullable=True)
    status = Column(String(50), nullable=True)      # ENABLED / PAUSED / ...
    field_type = Column(String(50), nullable=True)  # SITELINK, CALLOUT, LEAD_FORM, etc.

    date = Column(Date, nullable=True)

    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    conversions = Column(Float, default=0.0)
    conversions_value = Column(Float, default=0.0)
    view_through_conversions = Column(Float, default=0.0)
    cost_micros = Column(Integer, default=0)

    campaign = relationship("Campaign", back_populates="asset_performance_rows")
    asset = relationship("Asset", back_populates="campaign_performance_rows")
