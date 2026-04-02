from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WebsiteSettingsCreate(BaseModel):
    company_name: str
    default_region: str
    email_notifs: bool
    weekly_reports: bool
    issue_alerts: bool
    accessibility_std: str
    page_load_target: str
    language_pref: str


class WebsiteSettingsResponse(WebsiteSettingsCreate):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
