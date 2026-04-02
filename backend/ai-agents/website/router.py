from fastapi import APIRouter
from .routers import (   
    accessibility_router,
    content_router,
    design_router,
    functional_router,
    meeting_notes_router,
    report_router,
    seo_router,
    technical_router,
    run_new_check_router,
    settings_router
    )

website_router = APIRouter(prefix="/website", tags=["Website AI Agent"])

website_router.include_router(report_router.router)
website_router.include_router(accessibility_router.router)
website_router.include_router(content_router.router)
website_router.include_router(design_router.router)
website_router.include_router(functional_router.router)
website_router.include_router(meeting_notes_router.router)
website_router.include_router(seo_router.router)
website_router.include_router(technical_router.router)
website_router.include_router(run_new_check_router.router)
website_router.include_router(settings_router.router)