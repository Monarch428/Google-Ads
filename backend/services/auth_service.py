from datetime import timedelta, datetime
from sqlalchemy.orm import Session
import bcrypt
from fastapi import HTTPException, status
from jose import jwt
from models import user_model
from schemas.user_schema import UserCreate, UserLogin, UserResponse
from config import settings

# ✅ Password hashing setup
BCRYPT_MAX_BYTES = 72
UserModel = user_model.UserModel

# ✅ JWT Config
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"

ACCESS_EXPIRES = timedelta(hours=24)
REFRESH_EXPIRES = timedelta(days=30)

# -------------------------------------------------------
# 🔐 Helper — Create JWT Access Token
# -------------------------------------------------------

def _create_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + expires_delta})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_access_token(sub: str, extra: dict | None = None):
    payload = {"sub": sub, "typ": "access"}
    if extra:
        payload.update(extra)
    return _create_token(payload, ACCESS_EXPIRES)

def create_refresh_token(sub: str):
    return _create_token({"sub": sub, "typ": "refresh"}, REFRESH_EXPIRES)

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

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

    # bcrypt accepts only the first 72 bytes of a password
    password_bytes = user.password.encode("utf-8")[:BCRYPT_MAX_BYTES]
    hashed_password = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")

    new_user = UserModel(
        name=user.name,
        email=user.email,
        password_hash=hashed_password,
        role=user.role,
        is_active=user.is_active if user.is_active is not None else True,
        refresh_token=None,
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
        refresh_token=new_user.refresh_token,
    )


# -------------------------------------------------------
# 🔑 Login Existing User
# -------------------------------------------------------
def login_user(db: Session, credentials: UserLogin) -> dict:
    user = db.query(UserModel).filter(UserModel.email == credentials.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    password_bytes = credentials.password.encode("utf-8")[:BCRYPT_MAX_BYTES]
    stored_hash = (user.password_hash or "").encode("utf-8")
    if not stored_hash or not bcrypt.checkpw(password_bytes, stored_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    # ✅ Token expires in 24 hours
    access_token = create_access_token(sub=user.email)
    refresh_token = create_refresh_token(sub=user.email)

    # Persist the latest refresh token for the logged in user so it can be reused in the UI
    user.refresh_token = refresh_token
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "refresh_token": user.refresh_token,
        },
    }
