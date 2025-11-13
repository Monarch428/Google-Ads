"""Routes responsible for handling Google Ads authentication and reporting."""
from datetime import date
import os

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session

from database import get_db
from schemas.google_ads_schema import GoogleAdsCustomRangeRequest
from services.google_ads_service import (
    fetch_custom_range_metrics_for_client,
    fetch_daily_metrics_for_client,
)
from services.google_oauth_service import (
    build_oauth_consent_url,
    exchange_code_for_tokens,
    save_google_account,
)

router = APIRouter(tags=["Google Ads"])


@router.get("/connect")
def connect_google_ads(client_db_id: int, db: Session = Depends(get_db)):
    """Redirect the user to Google for OAuth consent."""

    redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI")
    if not redirect_uri:
        raise HTTPException(status_code=500, detail="GOOGLE_OAUTH_REDIRECT_URI not configured")

    redirect_with_client = f"{redirect_uri}?client_db_id={client_db_id}"
    consent_url = build_oauth_consent_url(redirect_with_client)
    return RedirectResponse(consent_url)


@router.get("/callback")
def oauth_callback(
    request: Request,
    code: str | None = None,
    error: str | None = None,
    client_db_id: int | None = None,
    db: Session = Depends(get_db),
):
    """Handle OAuth callback and store refresh tokens for the client."""

    redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI")

    if error:
        return JSONResponse({"error": error}, status_code=400)

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    try:
        tokens = exchange_code_for_tokens(
            code=code,
            redirect_uri=redirect_uri + (f"?client_db_id={client_db_id}" if client_db_id else ""),
        )
    except Exception as exc:  # pragma: no cover - surface upstream message
        raise HTTPException(status_code=500, detail=f"token exchange failed: {exc}") from exc

    login_customer_id = None

    save_google_account(
        db=db,
        client_db_id=client_db_id,
        tokens=tokens,
        login_customer_id=login_customer_id,
        developer_token=os.getenv("DEVELOPER_TOKEN"),
    )

    return JSONResponse({"status": "connected", "client_db_id": client_db_id})


@router.get("/metrics/daily")
def get_daily_metrics(
    client_id: int = Query(..., description="Internal client ID"),
    target_date: date = Query(
        default_factory=date.today,
        alias="date",
        description="ISO date to fetch (YYYY-MM-DD)",
    ),
    db: Session = Depends(get_db),
):
    """Fetch scaled Google Ads metrics for a single day."""

    try:
        return fetch_daily_metrics_for_client(db, client_id, target_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/metrics/custom")
def get_custom_range_metrics(payload: GoogleAdsCustomRangeRequest, db: Session = Depends(get_db)):
    """Fetch Google Ads metrics for an arbitrary date range."""

    try:
        return fetch_custom_range_metrics_for_client(
            db,
            payload.client_id,
            payload.start_date,
            payload.end_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
