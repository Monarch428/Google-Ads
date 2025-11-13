# models/__init__.py
"""
Import all model modules here so that when `import models` is called,
SQLAlchemy mappers are registered for every model before create_all().
Add any new model modules to this file.
"""

# Import model modules so their classes are registered with SQLAlchemy
from . import user_model
from . import client_model
from . import campaign_model
from . import google_ads_account
from . import recommendation_model
from . import ai_insight_model

# Optionally export common names for convenience:
__all__ = [
    "user_model",
    "client_model",
    "campaign_model",
    "google_ads_account",
    "recommendation_model",
    "ai_insight_model",
]
