# Add this to the bottom of schemas/user_schema.py

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "user"
    is_active: Optional[bool] = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    refresh_token: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: Optional[str] = None
    is_active: Optional[bool] = True
    refresh_token: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
