from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from database import Base

class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="manager")  # 'admin' or 'manager'
    is_active = Column(Boolean, default=True)
    company_name = Column(String(255), nullable=True)
    company_email = Column(String(255), nullable=True)
    company_phone = Column(String(50), nullable=True)
    company_website = Column(String(255), nullable=True)
    company_address = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
