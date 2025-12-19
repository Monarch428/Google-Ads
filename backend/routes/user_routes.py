from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from schemas.user_schema import UserCreate, UserResponse, UserUpdate
from models.user_model import UserRole, coerce_role
from services import user_service
from utils.auth_dependencies import get_current_user, require_admin_user


router = APIRouter(tags=["Users"])


@router.get("/", response_model=List[UserResponse])
def get_users(
    _: None = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return user_service.get_all_users(db)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if coerce_role(current_user.role) != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this user")
    return user_service.get_user_by_id(db, user_id)


@router.post("/", response_model=UserResponse, status_code=201)
def create_user(
    user_data: UserCreate,
    _: None = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return user_service.create_user(db, user_data, can_assign_clients=True)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    update_data: UserUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if coerce_role(current_user.role) != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this user")
    can_manage_assignments = coerce_role(current_user.role) == UserRole.ADMIN
    return user_service.update_user(
        db,
        user_id,
        update_data,
        can_manage_assignments=can_manage_assignments,
    )


@router.delete("/{user_id}", status_code=200)
def delete_user(
    user_id: int,
    _: None = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return user_service.delete_user(db, user_id)
