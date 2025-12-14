# models/campaign_asset_set_link.py
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class CampaignAssetSetLink(Base):
    __tablename__ = "campaign_asset_set_links"

    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)

    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    asset_set_id = Column(Integer, ForeignKey("asset_sets.id"), nullable=False, index=True)

    resource_name = Column(String(255), nullable=True)  # campaign_asset_set.resource_name
    status = Column(String(50), nullable=True)

    campaign = relationship("Campaign")
    asset_set = relationship("AssetSet", back_populates="campaign_links")
