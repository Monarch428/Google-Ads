# models/campaign_model.py
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)

    # Link to your internal client
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)

    # Google Ads identifiers
    google_campaign_id = Column(String(50), index=True, nullable=True)   # campaign.id
    resource_name = Column(String(255), index=True, nullable=True)       # "customers/.../campaigns/..."

    # Basic info
    name = Column(String(255), nullable=False)
    status = Column(String(50), nullable=True)                           # ENABLED / PAUSED / REMOVED
    advertising_channel_type = Column(String(50), nullable=True)         # SEARCH / DISPLAY / SHOPPING / PERFORMANCE_MAX / DEMAND_GEN / APP / LOCAL_SERVICES
    advertising_channel_sub_type = Column(String(50), nullable=True)     # SEARCH_STANDARD / DISPLAY_SMART / ...

    # Bidding
    bidding_strategy_type = Column(String(50), nullable=True)
    bidding_strategy_resource_name = Column(String(255), nullable=True)  # "customers/.../biddingStrategies/..."
    campaign_budget_resource_name = Column(String(255), nullable=True)

    # Lifecycle / status
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    serving_status = Column(String(50), nullable=True)
    optimization_score = Column(Float, nullable=True)                    # 0.0 - 1.0

    # Metrics (per-date aggregated row)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    conversions = Column(Float, default=0.0)
    ctr = Column(Float, default=0.0)
    average_cpc = Column(Float, default=0.0)
    cost = Column(Float, default=0.0)
    conversion_value = Column(Float, default=0.0)
    cost_per_conversion = Column(Float, default=0.0)

    all_conversions = Column(Float, default=0.0)
    all_conversions_value = Column(Float, default=0.0)
    view_through_conversions = Column(Float, default=0.0)

    # Date of the metrics row (segments.date)
    date = Column(Date, nullable=True)

    client = relationship(
        "Client",
        back_populates="campaigns",
        lazy="joined"
    )

    # Links to additional stats
    asset_performance_rows = relationship(
        "CampaignAssetPerformance",
        back_populates="campaign",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    conversion_stats = relationship(
        "CampaignConversionStat",
        back_populates="campaign",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self):
        return f"<Campaign id={self.id} name={self.name} client_id={self.client_id}>"
