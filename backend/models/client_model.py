from sqlalchemy import Column, Integer, String, DateTime
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
    login_customer_id = Column(String(255))

    # ✅ Auto timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ✅ Relationship with Campaign table
    campaigns = relationship("Campaign", back_populates="client", cascade="all, delete")
