# models/bidding_strategy_model.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class BiddingStrategy(Base):
    __tablename__ = "bidding_strategies"

    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)

    google_bidding_strategy_id = Column(String(50), index=True, nullable=True)
    resource_name = Column(String(255), unique=True, nullable=True)

    name = Column(String(255), nullable=True)
    type = Column(String(50), nullable=True)
    status = Column(String(50), nullable=True)

    target_cpa_micros = Column(Integer, nullable=True)
    target_roas = Column(Float, nullable=True)
    maximize_conv_target_cpa_micros = Column(Integer, nullable=True)
    maximize_conv_value_target_roas = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="bidding_strategies")
