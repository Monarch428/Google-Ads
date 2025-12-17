from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, field_validator


def _normalize_customer_ids(value: Optional[List[str] | str]) -> Optional[List[str]]:
    """Clean incoming customer IDs into a unique list of digit-only strings."""

    if value is None:
        return None

    # Accept comma-separated string or iterable input
    if isinstance(value, str):
        value = value.split(",")

    cleaned: list[str] = []
    for item in value:
        digits_only = "".join(ch for ch in str(item) if ch.isdigit())
        if digits_only:
            cleaned.append(digits_only)

    # Remove duplicates while preserving order
    seen = set()
    unique_ids: list[str] = []
    for cid in cleaned:
        if cid not in seen:
            seen.add(cid)
            unique_ids.append(cid)

    return unique_ids or None


class ClientBase(BaseModel):
    name: str
    email: EmailStr
    developer_token: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    refresh_token: Optional[str] = None
    customer_id: Optional[str] = None
    customer_ids: Optional[List[str]] = None
    login_customer_id: Optional[str] = None
    currency_code: str = "USD"

    @field_validator("customer_ids", mode="before")
    @classmethod
    def validate_customer_ids(cls, value: Optional[List[str] | str]) -> Optional[List[str]]:
        return _normalize_customer_ids(value)


class ClientCreate(ClientBase):
    assigned_manager_id: Optional[int] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    developer_token: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    refresh_token: Optional[str] = None
    customer_id: Optional[str] = None
    customer_ids: Optional[List[str]] = None
    login_customer_id: Optional[str] = None
    assigned_manager_id: Optional[int] = None
    currency_code: Optional[str] = None

    @field_validator("customer_ids", mode="before")
    @classmethod
    def validate_customer_ids(cls, value: Optional[List[str] | str]) -> Optional[List[str]]:
        return _normalize_customer_ids(value)


class ClientResponse(ClientBase):
    id: int
    created_by_id: Optional[int] = None
    assigned_manager_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    has_google_ads_auth: bool = False
    customer_ids: List[str] = []

    class Config:
        from_attributes = True  # (formerly orm_mode)


class ClientAssignmentUpdate(BaseModel):
    manager_id: int
    client_ids: List[int]


class ClientAssignmentResponse(BaseModel):
    manager_id: int
    assigned_client_ids: List[int]
