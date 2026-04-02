from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from database import Base


class RunNewCheck(Base):
    __tablename__ = "run_new_checks"

    id = Column(Integer, primary_key=True, index=True)

    project_name = Column(String(255), nullable=False)
    website_url = Column(String(500), nullable=False)
    project_id = Column(String(100), nullable=False, unique=True, index=True)

    client_region = Column(String(100), nullable=True)
    project_type = Column(String(100), nullable=True)
    language = Column(String(100), nullable=True)

    content_placement = Column(Text, nullable=True)
    proofreading = Column(Text, nullable=True)
    missing_content = Column(Text, nullable=True)
    sitemap_url = Column(String(500), nullable=True)
    skip_incomplete = Column(Boolean, default=False)

    meeting_notes = Column(Text, nullable=True)
    client_emails = Column(Text, nullable=True)
    special_requests = Column(Text, nullable=True)
    deadlines = Column(Text, nullable=True)
    overall_deadline = Column(String(100), nullable=True)

    brand_notes = Column(Text, nullable=True)
    primary_color = Column(String(100), nullable=True)
    secondary_colors = Column(Text, nullable=True)
    primary_font = Column(String(100), nullable=True)
    secondary_font = Column(String(100), nullable=True)
    theme_demo_url = Column(String(500), nullable=True)
    theme_desc = Column(Text, nullable=True)
    competitor_refs = Column(Text, nullable=True)
    design_prefs_desc = Column(Text, nullable=True)
    custom_layout = Column(Text, nullable=True)
    priority_pages = Column(Text, nullable=True)

    forms_list = Column(Text, nullable=True)
    form_fields = Column(Text, nullable=True)
    captcha_details = Column(Text, nullable=True)
    captcha_behavior = Column(Text, nullable=True)
    form_submission_flows = Column(Text, nullable=True)
    interactive_elements = Column(JSONB, nullable=True)
    interactive_behavior = Column(Text, nullable=True)
    third_party_integrations = Column(Text, nullable=True)

    seo_pages = Column(JSONB, nullable=True)
    canonical_urls = Column(Text, nullable=True)
    alt_text = Column(Text, nullable=True)
    header_structure = Column(Text, nullable=True)
    sitemap_index_notes = Column(Text, nullable=True)
    og_tags = Column(Text, nullable=True)
    schema_markup = Column(Text, nullable=True)
    robots_txt = Column(Text, nullable=True)

    compression_rules = Column(Text, nullable=True)
    naming_conventions = Column(Text, nullable=True)
    priority_media = Column(Text, nullable=True)
    auto_optimize = Column(Boolean, default=False)

    accessibility_standard = Column(String(100), nullable=True)
    custom_accessibility = Column(Text, nullable=True)
    device_sizes = Column(JSONB, nullable=True)
    custom_devices = Column(Text, nullable=True)
    browsers = Column(JSONB, nullable=True)
    browser_notes = Column(Text, nullable=True)

    alt_text_req = Column(Text, nullable=True)
    text_resizing = Column(Text, nullable=True)
    high_contrast = Column(Text, nullable=True)
    keyboard_nav = Column(Text, nullable=True)
    aria_labels = Column(Text, nullable=True)
    accessibility_priority_pages = Column(Text, nullable=True)
    accessibility_notes = Column(Text, nullable=True)

    ssl_enabled = Column(Boolean, default=False)
    ssl_details = Column(Text, nullable=True)
    redirects = Column(Text, nullable=True)
    redirects_verified = Column(Boolean, default=False)
    scripts_code = Column(Text, nullable=True)
    performance_notes = Column(Text, nullable=True)
    third_party_integrations_sec = Column(Text, nullable=True)

    custom_404 = Column(Text, nullable=True)
    custom_500 = Column(Text, nullable=True)
    other_errors = Column(Text, nullable=True)
    error_handling_notes = Column(Text, nullable=True)
    priority_technical_checks = Column(Text, nullable=True)
    backup_notes = Column(Text, nullable=True)

    report_recipients = Column(Text, nullable=True)
    report_format = Column(String(100), nullable=True)
    severity_levels = Column(JSONB, nullable=True)
    kpi_selected = Column(JSONB, nullable=True)
    delivery_selected = Column(JSONB, nullable=True)
    auto_weekly = Column(Boolean, default=False)
    qa_comments = Column(Text, nullable=True)
    follow_up_notes = Column(Text, nullable=True)
    summary_metrics = Column(Text, nullable=True)

    content_ai_result = Column(JSON, nullable=True)
    design_ai_result = Column(JSON, nullable=True)
    seo_ai_result = Column(JSON, nullable=True)
    accessibility_ai_result = Column(JSON, nullable=True)
    technical_ai_result = Column(JSON, nullable=True)
    report_result = Column(JSON, nullable=True)
    analysis_status = Column(String, default="pending")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())