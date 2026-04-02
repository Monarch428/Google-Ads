from sqlalchemy.orm import Session
from models.website_settings_model import WebsiteSettings
from schemas.website_settings_schema import WebsiteSettingsCreate

SETTINGS_ID = "global"


def get_settings(db: Session):
    """Fetch the single website settings row."""
    return db.query(WebsiteSettings).filter(WebsiteSettings.id == SETTINGS_ID).first()


def save_settings(db: Session, payload: WebsiteSettingsCreate):
    """Upsert the website settings row."""
    settings = db.query(WebsiteSettings).filter(WebsiteSettings.id == SETTINGS_ID).first()

    if settings:
        for field, value in payload.model_dump().items():
            setattr(settings, field, value)
    else:
        settings = WebsiteSettings(id=SETTINGS_ID, **payload.model_dump())
        db.add(settings)

    db.commit()
    db.refresh(settings)
    return settings
