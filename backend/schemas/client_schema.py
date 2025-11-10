from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class ClientBase(BaseModel):
    name: str
    email: EmailStr
    developer_token: str
    client_id: str
    client_secret: str
    refresh_token: str
    login_customer_id: Optional[str] = None


class ClientCreate(ClientBase):
    assigned_manager_id: Optional[int] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    developer_token: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    refresh_token: Optional[str] = None
    login_customer_id: Optional[str] = None
    assigned_manager_id: Optional[int] = None


class ClientResponse(ClientBase):
    id: int
    created_by_id: Optional[int] = None
    assigned_manager_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # (formerly orm_mode)


class ClientAssignmentUpdate(BaseModel):
    manager_id: int
    client_ids: List[int]


class ClientAssignmentResponse(BaseModel):
    manager_id: int
    assigned_client_ids: List[int]
