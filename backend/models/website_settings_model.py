from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base  # ✅ matches your database.py export


class WebsiteSettings(Base):
    __tablename__ = "website_settings"

    id = Column(String, primary_key=True, default="global")  # single-row pattern
    company_name = Column(String, nullable=False, default="")
    default_region = Column(String, nullable=False, default="")
    email_notifs = Column(Boolean, nullable=False, default=True)
    weekly_reports = Column(Boolean, nullable=False, default=True)
    issue_alerts = Column(Boolean, nullable=False, default=True)
    accessibility_std = Column(String, nullable=False, default="WCAG 2.1 AA")
    page_load_target = Column(String, nullable=False, default="3")
    language_pref = Column(String, nullable=False, default="American English")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
