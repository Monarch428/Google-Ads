from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class CompanyProfileBase(BaseModel):
    company_name: Optional[str] = None
    company_email: Optional[EmailStr] = None
    company_phone: Optional[str] = None
    company_website: Optional[str] = None
    company_address: Optional[str] = None
    default_manager_role: Optional[str] = None


class CompanyProfileUpdate(CompanyProfileBase):
    pass


class CompanyProfileResponse(CompanyProfileBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
