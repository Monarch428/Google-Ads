from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from database import get_db
from schemas.user_schema import UserCreate, UserResponse, UserUpdate
from services import user_service
from services.auth_service import register_user


router = APIRouter(tags=["Users"])


@router.get("/", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return user_service.get_all_users(db)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    return user_service.get_user_by_id(db, user_id)


@router.post("/", response_model=UserResponse, status_code=201)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    return register_user(db, user_data)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, request: Request, db: Session = Depends(get_db)):
    try:
        payload = await request.json()
    except Exception as exc:  # pragma: no cover - defensive guard
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        ) from exc

    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Payload must be a JSON object",
        )

    update_data = UserUpdate.model_validate(payload)
    return user_service.update_user(db, user_id, update_data)
