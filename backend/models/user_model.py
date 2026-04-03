from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from database import Base


class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="manager")
    is_active = Column(Boolean, default=True)
    company_name = Column(String(255), nullable=True)
    company_email = Column(String(255), nullable=True)
    company_phone = Column(String(50), nullable=True)
    company_website = Column(String(255), nullable=True)
    company_address = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ── G-Ads module page access ──────────────────────────────────────────────
    gads_dashboard  = Column(Boolean, default=False, nullable=False)
    gads_inputs     = Column(Boolean, default=False, nullable=False)
    gads_projects   = Column(Boolean, default=False, nullable=False)
    gads_reports    = Column(Boolean, default=False, nullable=False)
    gads_settings   = Column(Boolean, default=False, nullable=False)

    # ── SEO module page access ────────────────────────────────────────────────
    seo_dashboard   = Column(Boolean, default=False, nullable=False)
    seo_inputs      = Column(Boolean, default=False, nullable=False)
    seo_projects    = Column(Boolean, default=False, nullable=False)
    seo_reports     = Column(Boolean, default=False, nullable=False)
    seo_settings    = Column(Boolean, default=False, nullable=False)

    # ── Website module page access ────────────────────────────────────────────
    website_dashboard = Column(Boolean, default=False, nullable=False)
    website_inputs    = Column(Boolean, default=False, nullable=False)
    website_projects  = Column(Boolean, default=False, nullable=False)
    website_reports   = Column(Boolean, default=False, nullable=False)
    website_settings  = Column(Boolean, default=False, nullable=False)
