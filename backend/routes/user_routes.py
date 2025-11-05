from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user_model import UserModel

router = APIRouter(prefix="/users", tags=["Users"])

# Get all users
@router.get("/")
def get_users(db: Session = Depends(get_db)):
    users = db.query(UserModel).all()
    return users

# Get user by ID
@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Create user
@router.post("/")
def create_user(name: str, email: str, password_hash: str, db: Session = Depends(get_db)):
    user = UserModel(name=name, email=email, password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
