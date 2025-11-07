from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from database import Base


class CompanyProfile(Base):
    __tablename__ = "company_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    company_name = Column(String(150), nullable=True)
    company_email = Column(String(150), nullable=True)
    company_phone = Column(String(50), nullable=True)
    company_website = Column(String(255), nullable=True)
    company_address = Column(String(500), nullable=True)
    default_manager_role = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("UserModel", backref="company_profile", lazy="joined", uselist=False)
