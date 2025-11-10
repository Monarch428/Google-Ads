"""Reusable authentication and authorization dependencies."""
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from database import get_db
from models.user_model import UserModel
from services.auth_service import decode_token

_bearer_scheme = HTTPBearer(auto_error=False)


def _resolve_bearer_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None,
) -> str | None:
    """Return the bearer token from Authorization header or cookies."""
    if credentials and credentials.scheme.lower() == "bearer":
        return credentials.credentials

    header_token = request.headers.get("Authorization")
    if header_token and header_token.lower().startswith("bearer "):
        return header_token.split(" ", 1)[1]

    cookie_token = request.cookies.get("access_token")
    return cookie_token


def _load_user_from_token(db: Session, token: str, expected_type: str) -> UserModel:
    try:
        payload = decode_token(token)
    except JWTError as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    token_type = payload.get("typ")
    if token_type != expected_type:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong token type")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if not getattr(user, "is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account disabled")

    return user


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> UserModel:
    """Return the authenticated user using the access token."""
    token = _resolve_bearer_token(request, credentials)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    return _load_user_from_token(db, token, expected_type="access")


def require_admin_user(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    """Ensure the current user has admin privileges."""
    if (current_user.role or "").lower() != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return current_user


def require_admin_refresh_user(
    request: Request,
    refresh_token: str | None = Header(default=None, alias="X-Refresh-Token"),
    db: Session = Depends(get_db),
) -> UserModel:
    """Validate the refresh token belongs to an admin user."""
    token = refresh_token or request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    user = _load_user_from_token(db, token, expected_type="refresh")
    if (user.role or "").lower() != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin refresh token required")
    return user
