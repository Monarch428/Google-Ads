from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.user_model import UserModel
from schemas.user_schema import UserUpdate
from services.auth_service import pwd_context


def get_all_users(db: Session) -> List[UserModel]:
    """Return all users in the system."""

    return db.query(UserModel).all()


def get_user_by_id(db: Session, user_id: int) -> UserModel:
    """Fetch a single user or raise 404 if it does not exist."""

    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def update_user(db: Session, user_id: int, update_data: UserUpdate) -> UserModel:
    """Update mutable user attributes, hashing the password when provided."""

    user = get_user_by_id(db, user_id)

    if update_data.email and update_data.email != user.email:
        existing = db.query(UserModel).filter(UserModel.email == update_data.email).first()
        if existing and existing.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use",
            )

    data = update_data.model_dump(exclude_unset=True)

    # Password needs to be hashed before persisting
    password = data.pop("password", None)
    if password:
        user.password_hash = pwd_context.hash(password[:72])

    for key, value in data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user
