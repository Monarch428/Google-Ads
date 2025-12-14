# models/asset_set_model.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class AssetSet(Base):
    __tablename__ = "asset_sets"

    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)

    google_asset_set_id = Column(String(50), index=True, nullable=True)
    resource_name = Column(String(255), unique=True, nullable=True)    # "customers/.../assetSets/..."

    name = Column(String(255), nullable=True)
    type = Column(String(50), nullable=True)       # AssetSetType
    status = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="asset_sets")

    assets = relationship(
        "AssetSetAsset",
        back_populates="asset_set",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    campaign_links = relationship(
        "CampaignAssetSetLink",
        back_populates="asset_set",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    customer_links = relationship(
        "CustomerAssetSetLink",
        back_populates="asset_set",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
