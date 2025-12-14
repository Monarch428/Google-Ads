# models/asset_model.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)

    google_asset_id = Column(String(50), index=True, nullable=True)   # asset.id
    resource_name = Column(String(255), unique=True, nullable=True)   # "customers/.../assets/..."

    name = Column(String(255), nullable=True)
    type = Column(String(50), nullable=True)        # TEXT, IMAGE, VIDEO, MEDIA_BUNDLE, YOUTUBE_VIDEO, CALL_TO_ACTION, ...
    source = Column(String(50), nullable=True)      # ADVERTISER, GOOGLE, etc.

    # Payloads
    text = Column(Text, nullable=True)              # text_asset.text
    image_url = Column(String(1000), nullable=True) # image_asset.full_size.url
    image_file_size = Column(Integer, nullable=True)
    youtube_video_id = Column(String(100), nullable=True)
    youtube_video_title = Column(String(500), nullable=True)
    call_to_action = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="assets")

    # Links
    campaign_performance_rows = relationship(
        "CampaignAssetPerformance",
        back_populates="asset",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    asset_set_links = relationship(
        "AssetSetAsset",
        back_populates="asset",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
