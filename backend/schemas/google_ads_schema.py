"""Pydantic schemas for Google Ads specific endpoints."""
from datetime import date
from pydantic import BaseModel, FieldValidationInfo, field_validator


class GoogleAdsCustomRangeRequest(BaseModel):
    """Request payload for fetching metrics for a custom date range."""

    client_id: int
    start_date: date
    end_date: date

    @field_validator("end_date")
    @classmethod
    def validate_date_order(cls, end_date: date, info: FieldValidationInfo) -> date:
        start_date = info.data.get("start_date")
        if start_date and end_date < start_date:
            raise ValueError("end_date must be greater than or equal to start_date")
        return end_date
