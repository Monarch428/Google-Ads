# models/client_model.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    developer_token = Column(String(255))
    client_id = Column(String(255))
    client_secret = Column(String(255))
    refresh_token = Column(String(500))
    customer_id = Column(String(255))
    customer_ids = Column(JSON, default=list)
    login_customer_id = Column(String(255))
    currency_code = Column(String(10), default="USD")

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    campaigns = relationship(
        "Campaign",
        back_populates="client",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    # NEW: related Google Ads structures
    assets = relationship(
        "Asset",
        back_populates="client",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    asset_sets = relationship(
        "AssetSet",
        back_populates="client",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    conversion_actions = relationship(
        "ConversionAction",
        back_populates="client",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    bidding_strategies = relationship(
        "BiddingStrategy",
        back_populates="client",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    creator = relationship("UserModel", foreign_keys=[created_by_id], backref="created_clients")
    assigned_manager = relationship(
        "UserModel",
        foreign_keys=[assigned_manager_id],
        backref="managed_clients",
    )

    def __repr__(self):
        return f"<Client id={self.id} name={self.name}>"
