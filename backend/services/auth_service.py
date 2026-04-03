from datetime import timedelta, datetime
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from fastapi import HTTPException, status
from jose import jwt
from models import user_model
from schemas.user_schema import UserCreate, UserLogin, UserResponse
from config import settings

# ── Password hashing ──────────────────────────────────────────────────────────
UserModel = user_model.UserModel

pwd_context = CryptContext(
    schemes=["bcrypt_sha256", "bcrypt"],
    deprecated="auto",
    bcrypt__truncate_error=False,
    bcrypt__rounds=12,
)

# ── JWT Config ────────────────────────────────────────────────────────────────
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"

ACCESS_EXPIRES = timedelta(hours=24)
REFRESH_EXPIRES = timedelta(days=30)


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


def _ensure_password_length(password: str) -> str:
    """Validate password is present and not absurdly long (DoS protection)."""
    if password is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required",
        )
    if len(password) > 256:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password too long",
        )
    return password


# ── Register ──────────────────────────────────────────────────────────────────
def register_user(db: Session, user: UserCreate) -> UserResponse:
    existing_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    password = _ensure_password_length(user.password)
    hashed_password = pwd_context.hash(password[:72])

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

    return UserResponse.from_orm_with_access(new_user)


# ── Login ─────────────────────────────────────────────────────────────────────
def login_user(db: Session, credentials: UserLogin) -> dict:
    user = db.query(UserModel).filter(UserModel.email == credentials.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    try:
        password = _ensure_password_length(credentials.password)
    except HTTPException:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if not pwd_context.verify(password[:72], user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    access_token = create_access_token(sub=user.email)
    refresh_token = create_refresh_token(sub=user.email)

    # ✅ Single "user" key using from_orm_with_access — includes module_access
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserResponse.from_orm_with_access(user).model_dump(),
    }
