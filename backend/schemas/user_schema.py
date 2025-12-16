from datetime import datetime
from typing import Iterable, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


def _coerce_client_ids(value: Optional[Iterable[object]]) -> Optional[List[int]]:
    if value is None:
        return None

    if isinstance(value, (str, bytes)):
        value = [value]

    coerced: List[int] = []
    for item in value:
        if item is None:
            continue

        if isinstance(item, str):
            item = item.strip()
            if not item:
                continue

        try:
            number = int(item)  # type: ignore[arg-type]
        except (TypeError, ValueError) as exc:
            raise ValueError("assigned_client_ids must contain integers") from exc

        if number <= 0:
            raise ValueError("assigned_client_ids must contain positive integers")

        if number not in coerced:
            coerced.append(number)

    return coerced


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "user"
    is_active: Optional[bool] = True
    assigned_client_ids: Optional[List[int]] = None

    _normalize_assigned_ids = field_validator("assigned_client_ids", mode="before")(
        _coerce_client_ids
    )


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    company_name: Optional[str] = None
    company_email: Optional[EmailStr] = None
    company_phone: Optional[str] = None
    company_website: Optional[str] = None
    company_address: Optional[str] = None
    assigned_client_ids: Optional[List[int]] = None

    @field_validator("company_email", mode="before")
    @classmethod
    def _empty_email_to_none(cls, value: Optional[str]):
        if isinstance(value, str) and not value.strip():
            return None
        return value

    _normalize_assigned_ids = field_validator("assigned_client_ids", mode="before")(
        _coerce_client_ids
    )


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: Optional[str] = None
    is_active: Optional[bool] = True
    company_name: Optional[str] = None
    company_email: Optional[EmailStr] = None
    company_phone: Optional[str] = None
    company_website: Optional[str] = None
    company_address: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    assigned_client_ids: Optional[List[int]] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("email", mode="before")
    @classmethod
    def _coerce_email(cls, value: Optional[str]):
        """Return a safe string for legacy records with malformed emails."""
        if value is None:
            return ""

        if isinstance(value, str):
            return value.strip()

        return str(value)

    @field_validator("company_email", mode="before")
    @classmethod
    def _coerce_company_email(cls, value: Optional[str]):
        if value in (None, ""):
            return None

        if isinstance(value, EmailStr):
            return value

        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return None

            try:
                return EmailStr(stripped)
            except Exception:
                return None

        return value
