from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from schemas.website_settings_schema import WebsiteSettingsCreate, WebsiteSettingsResponse
from website.services.settings_service import get_settings, save_settings

router = APIRouter(prefix="/settings", tags=["Website Settings"])

DEFAULT_SETTINGS = WebsiteSettingsCreate(
    company_name="BrandingBeez",
    default_region="United States",
    email_notifs=True,
    weekly_reports=True,
    issue_alerts=True,
    accessibility_std="WCAG 2.1 AA",
    page_load_target="3",
    language_pref="American English",
)


@router.get("/", response_model=WebsiteSettingsResponse)
def fetch_settings(db: Session = Depends(get_db)):
    settings = get_settings(db)
    if not settings:
        # Auto-create defaults on first load so frontend never gets 404
        settings = save_settings(db, DEFAULT_SETTINGS)
    return settings


@router.post("/", response_model=WebsiteSettingsResponse)
def update_settings(payload: WebsiteSettingsCreate, db: Session = Depends(get_db)):
    return save_settings(db, payload)
