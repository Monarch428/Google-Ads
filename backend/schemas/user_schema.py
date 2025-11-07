# Add this to the bottom of schemas/user_schema.py

from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "user"


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

    @field_validator("company_email", mode="before")
    @classmethod
    def _empty_email_to_none(cls, value: Optional[str]):
        if isinstance(value, str) and not value.strip():
            return None
        return value

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: Optional[str] = None
    is_active: Optional[bool] = True
    company_name: Optional[str] = None
    company_email: Optional[EmailStr] = None
    company_phone: Optional[str] = None
    company_website: Optional[str] = None
    company_address: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

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