from datetime import timedelta, datetime
from typing import Optional
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from fastapi import HTTPException, status
from jose import jwt
from models import user_model
from schemas.user_schema import UserCreate, UserLogin, UserResponse
from config import settings

# ✅ Password hashing setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
UserModel = user_model.UserModel

# ✅ JWT Config
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"

# -------------------------------------------------------
# 🔐 Helper — Create JWT Access Token
# -------------------------------------------------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Generates a signed JWT access token for a user.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=24))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# -------------------------------------------------------
# 👤 Register New User
# -------------------------------------------------------
def register_user(db: Session, user: UserCreate) -> UserResponse:
    existing_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # bcrypt accepts only first 72 characters of a password
    password_to_hash = user.password[:72]
    hashed_password = pwd_context.hash(password_to_hash)

    new_user = UserModel(
        name=user.name,
        email=user.email,
        password_hash=hashed_password,
        role=user.role,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserResponse(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        role=new_user.role,
        is_active=new_user.is_active,
    )


# -------------------------------------------------------
# 🔑 Login Existing User
# -------------------------------------------------------
def login_user(db: Session, credentials: UserLogin) -> dict:
    user = db.query(UserModel).filter(UserModel.email == credentials.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if not pwd_context.verify(credentials.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    # ✅ Token expires in 24 hours
    access_token_expires = timedelta(hours=24)
    token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
    }
