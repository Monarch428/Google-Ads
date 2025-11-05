# models/google_ads_account.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from database import Base

class GoogleAdsAccount(Base):
    __tablename__ = "google_ads_accounts"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)   # references your clients table
    developer_token = Column(String(200), nullable=True)
    google_client_id = Column(String(200), nullable=True)
    google_client_secret = Column(String(200), nullable=True)
    refresh_token = Column(String(500), nullable=True)
    login_customer_id = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
