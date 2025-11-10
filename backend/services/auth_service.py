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
UserModel = user_model.UserModel
# Use bcrypt_sha256 (pre-hash with SHA-256) to avoid 72-byte limit safely.
pwd_context = CryptContext(
    schemes=["bcrypt_sha256", "bcrypt"],  # bcrypt kept for legacy hashes if any
    deprecated="auto",
    bcrypt__truncate_error=False,         # avoid backend self-test crash on long inputs
    bcrypt__rounds=12,                    # optional tuning
)

def _ensure_password_length(password: str) -> str:
    """
    Optional guard: avoid absurdly large inputs (DoS protection),
    but don't enforce 72 bytes anymore.
    """
    if password is None:
        raise HTTPException(status_code=400, detail="Password is required")

    if len(password) > 256:
        raise HTTPException(status_code=400, detail="Password too long")

    return password


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
def _ensure_password_length(password: str) -> str:
    """Validate that the password does not exceed bcrypt's 72-byte limit."""

    if password is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required",
        )

    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be 72 bytes or fewer",
        )

    return password


def register_user(db: Session, user: UserCreate) -> UserResponse:
    existing_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    password_to_hash = _ensure_password_length(user.password)
    hashed_password = pwd_context.hash(password_to_hash)

    is_active = True if user.is_active is None else bool(user.is_active)

    new_user = UserModel(
        name=user.name,
        email=user.email,
        password_hash=hashed_password,
        role=user.role,
        is_active=is_active,
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

    try:
        password = _ensure_password_length(credentials.password)
    except HTTPException:
        # Avoid leaking whether the email exists for overlong passwords
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if not pwd_context.verify(password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    # ✅ Token expires in 24 hours
    access_token = create_access_token(sub=user.email)
    refresh_token = create_refresh_token(sub=user.email)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "company_name": getattr(user, "company_name", None),
            "company_email": getattr(user, "company_email", None),
            "company_phone": getattr(user, "company_phone", None),
            "company_website": getattr(user, "company_website", None),
            "company_address": getattr(user, "company_address", None),
        },
    }
