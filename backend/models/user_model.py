from enum import Enum

from sqlalchemy import Column, DateTime, Enum as SQLEnum, Integer, String, Boolean, func
from database import Base


class UserRole(str, Enum):
    ADMIN = "admin"
    SENIOR_MANAGER = "senior_manager"
    MANAGER = "manager"
    JUNIOR_MANAGER = "junior_manager"


def coerce_role(value) -> UserRole:
    """Return a valid UserRole, defaulting to manager for unknown values."""

    if isinstance(value, UserRole):
        return value

    if isinstance(value, str):
        normalized = value.strip().lower()
        try:
            return UserRole(normalized)
        except ValueError:
            pass

    return UserRole.MANAGER

class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        SQLEnum(
            UserRole,
            name="user_role",
            native_enum=False,
            values_callable=lambda obj: [role.value for role in obj],
            validate_strings=True,
        ),
        default=UserRole.MANAGER,
        nullable=False,
    )
    is_active = Column(Boolean, default=True)
    company_name = Column(String(255), nullable=True)
    company_email = Column(String(255), nullable=True)
    company_phone = Column(String(50), nullable=True)
    company_website = Column(String(255), nullable=True)
    company_address = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
