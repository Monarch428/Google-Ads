# models/asset_set_asset_model.py
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class AssetSetAsset(Base):
    __tablename__ = "asset_set_assets"

    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)

    asset_set_id = Column(Integer, ForeignKey("asset_sets.id"), nullable=False, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False, index=True)

    resource_name = Column(String(255), nullable=True)  # asset_set_asset.resource_name
    status = Column(String(50), nullable=True)

    asset_set = relationship("AssetSet", back_populates="assets")
    asset = relationship("Asset", back_populates="asset_set_links")
