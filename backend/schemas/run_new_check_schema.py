from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Any


class SeoPageSchema(BaseModel):
    id: int
    page: str
    title: str
    description: str
    keywords: str
    index: bool


class RunNewCheckCreate(BaseModel):
    project_name: str
    website_url: str
    project_id: str

    client_region: Optional[str] = None
    project_type: Optional[str] = None
    language: Optional[str] = None

    content_placement: Optional[str] = None
    proofreading: Optional[str] = None
    missing_content: Optional[str] = None
    sitemap_url: Optional[str] = None
    skip_incomplete: bool = False

    meeting_notes: Optional[str] = None
    client_emails: Optional[str] = None
    special_requests: Optional[str] = None
    deadlines: Optional[str] = None
    overall_deadline: Optional[str] = None

    brand_notes: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_colors: Optional[str] = None
    primary_font: Optional[str] = None
    secondary_font: Optional[str] = None
    theme_demo_url: Optional[str] = None
    theme_desc: Optional[str] = None
    competitor_refs: Optional[str] = None
    design_prefs_desc: Optional[str] = None
    custom_layout: Optional[str] = None
    priority_pages: Optional[str] = None

    forms_list: Optional[str] = None
    form_fields: Optional[str] = None
    captcha_details: Optional[str] = None
    captcha_behavior: Optional[str] = None
    form_submission_flows: Optional[str] = None
    interactive_elements: List[str] = []
    interactive_behavior: Optional[str] = None
    third_party_integrations: Optional[str] = None

    seo_pages: List[Any] = []
    canonical_urls: Optional[str] = None
    alt_text: Optional[str] = None
    header_structure: Optional[str] = None
    sitemap_index_notes: Optional[str] = None
    og_tags: Optional[str] = None
    schema_markup: Optional[str] = None
    robots_txt: Optional[str] = None

    compression_rules: Optional[str] = None
    naming_conventions: Optional[str] = None
    priority_media: Optional[str] = None
    auto_optimize: bool = False

    accessibility_standard: Optional[str] = None
    custom_accessibility: Optional[str] = None
    device_sizes: List[str] = []
    custom_devices: Optional[str] = None
    browsers: List[str] = []
    browser_notes: Optional[str] = None

    alt_text_req: Optional[str] = None
    text_resizing: Optional[str] = None
    high_contrast: Optional[str] = None
    keyboard_nav: Optional[str] = None
    aria_labels: Optional[str] = None
    accessibility_priority_pages: Optional[str] = None
    accessibility_notes: Optional[str] = None

    ssl_enabled: bool = False
    ssl_details: Optional[str] = None
    redirects: Optional[str] = None
    redirects_verified: bool = False
    scripts_code: Optional[str] = None
    performance_notes: Optional[str] = None
    third_party_integrations_sec: Optional[str] = None

    custom_404: Optional[str] = None
    custom_500: Optional[str] = None
    other_errors: Optional[str] = None
    error_handling_notes: Optional[str] = None
    priority_technical_checks: Optional[str] = None
    backup_notes: Optional[str] = None

    report_recipients: Optional[str] = None
    report_format: Optional[str] = None
    severity_levels: List[str] = []
    kpi_selected: List[str] = []
    delivery_selected: List[str] = []
    auto_weekly: bool = False
    qa_comments: Optional[str] = None
    follow_up_notes: Optional[str] = None
    summary_metrics: Optional[str] = None


class RunNewCheckResponse(RunNewCheckCreate):
    id: int
    analysis_status: Optional[str] = None
    content_ai_result: Optional[Any] = None
    design_ai_result: Optional[Any] = None
    seo_ai_result: Optional[Any] = None
    accessibility_ai_result: Optional[Any] = None
    technical_ai_result: Optional[Any] = None
    report_result: Optional[Any] = None
    created_at: Optional[datetime] = None 
    updated_at: Optional[datetime] = None 

    class Config:
        from_attributes = True