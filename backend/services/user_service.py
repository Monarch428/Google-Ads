from typing import Iterable, List, Optional, Set

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.client_model import Client
from models.user_model import UserModel
from schemas.user_schema import UserCreate, UserUpdate
from services.auth_service import pwd_context


def _normalize_client_ids(raw_ids: Optional[Iterable[object]]) -> Set[int]:
    if raw_ids is None:
        return set()

    result: Set[int] = set()
    for raw in raw_ids:
        if raw is None:
            continue

        if isinstance(raw, str):
            raw = raw.strip()
            if not raw:
                continue

        try:
            value = int(raw)  # type: ignore[arg-type]
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client IDs must be integers",
            ) from exc

        if value <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client IDs must be positive integers",
            )

        result.add(value)

    return result


def _ensure_assignable_user(user: UserModel, desired_ids: Set[int]) -> None:
    if not desired_ids:
        return

    if (user.role or "").lower() == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign clients to admin users",
        )


def _apply_client_assignments(
    db: Session, user: UserModel, client_ids: Optional[Iterable[object]]
) -> Optional[List[int]]:
    if client_ids is None:
        return None

    desired_ids = _normalize_client_ids(client_ids)
    _ensure_assignable_user(user, desired_ids)

    if desired_ids:
        existing_rows = db.query(Client.id).filter(Client.id.in_(desired_ids)).all()
        if len(existing_rows) != len(desired_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more clients do not exist",
            )

    current_clients = db.query(Client).filter(Client.assigned_manager_id == user.id).all()
    for client in current_clients:
        if client.id not in desired_ids:
            client.assigned_manager_id = None

    if desired_ids:
        clients_to_assign = db.query(Client).filter(Client.id.in_(desired_ids)).all()
        for client in clients_to_assign:
            client.assigned_manager_id = user.id

    return sorted(desired_ids)


def _attach_assigned_client_ids(user: UserModel) -> None:
    assigned_ids = sorted(
        client.id for client in getattr(user, "managed_clients", []) if client.id is not None
    )
    setattr(user, "assigned_client_ids", assigned_ids)


def create_user(
    db: Session, user_data: UserCreate, *, can_assign_clients: bool = False
) -> UserModel:
    existing_user = db.query(UserModel).filter(UserModel.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already in use",
        )

    role = (user_data.role or "user").strip() or "user"
    is_active = True if user_data.is_active is None else bool(user_data.is_active)

    password_to_hash = user_data.password[:72]
    new_user = UserModel(
        name=user_data.name,
        email=user_data.email,
        password_hash=pwd_context.hash(password_to_hash),
        role=role,
        is_active=is_active,
    )

    db.add(new_user)
    db.flush()

    assigned_ids: Optional[List[int]] = None
    if user_data.assigned_client_ids is not None:
        if not can_assign_clients:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to assign clients",
            )
        assigned_ids = _apply_client_assignments(db, new_user, user_data.assigned_client_ids)

    db.commit()
    db.refresh(new_user)

    if assigned_ids is None:
        _attach_assigned_client_ids(new_user)
    else:
        setattr(new_user, "assigned_client_ids", assigned_ids)

    return new_user


def get_all_users(db: Session) -> List[UserModel]:
    """Return all users in the system."""

    users = db.query(UserModel).all()
    for user in users:
        _attach_assigned_client_ids(user)
    return users


def get_user_by_id(db: Session, user_id: int) -> UserModel:
    """Fetch a single user or raise 404 if it does not exist."""

    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    _attach_assigned_client_ids(user)
    return user


def update_user(
    db: Session, user_id: int, update_data: UserUpdate, *, can_manage_assignments: bool = False
) -> UserModel:
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

    assigned_ids = None
    if "assigned_client_ids" in data:
        if not can_manage_assignments:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to assign clients",
            )
        assigned_ids = _apply_client_assignments(db, user, data.pop("assigned_client_ids"))

    password = data.pop("password", None)
    if password:
        user.password_hash = pwd_context.hash(password[:72])

    for key, value in data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)

    if assigned_ids is None:
        _attach_assigned_client_ids(user)
    else:
        setattr(user, "assigned_client_ids", assigned_ids)

    return user
