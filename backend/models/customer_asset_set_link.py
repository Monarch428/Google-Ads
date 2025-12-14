# models/customer_asset_set_link.py
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class CustomerAssetSetLink(Base):
    __tablename__ = "customer_asset_set_links"

    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)

    asset_set_id = Column(Integer, ForeignKey("asset_sets.id"), nullable=False, index=True)

    resource_name = Column(String(255), nullable=True)  # customer_asset_set.resource_name
    status = Column(String(50), nullable=True)

    asset_set = relationship("AssetSet", back_populates="customer_links")
