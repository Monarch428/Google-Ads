from typing import Iterable, List, Optional, Set

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.client_model import Client
from models.user_model import UserModel
from schemas.user_schema import UserCreate, UserUpdate
from services.auth_service import pwd_context


# ── Module access helpers ─────────────────────────────────────────────────────

VALID_PAGES = {"dashboard", "inputs", "projects", "reports", "settings"}
MODULES     = ("gads", "seo", "website")


def _apply_module_access(user: UserModel, module_access) -> None:
    """
    Write the nested {gads:[…], seo:[…], website:[…]} payload as flat booleans
    onto the UserModel instance, e.g. user.gads_dashboard = True.
    Accepts either a Pydantic model (from UserCreate/UserUpdate) or a plain dict.
    """
    if module_access is None:
        return
    for module in MODULES:
        # support both object-style (Pydantic) and dict-style (model_dump output)
        if isinstance(module_access, dict):
            pages: List[str] = module_access.get(module, []) or []
        else:
            pages = getattr(module_access, module, []) or []
        for page in VALID_PAGES:
            setattr(user, f"{module}_{page}", page in pages)


def _attach_module_access(user: UserModel) -> None:
    """
    Read the 15 flat boolean columns and attach a nested dict as
    user.module_access so it serialises correctly in UserResponse.
    """
    access = {}
    for module in MODULES:
        access[module] = [
            page for page in sorted(VALID_PAGES)
            if getattr(user, f"{module}_{page}", False)
        ]
    setattr(user, "module_access", access)


# ── Client assignment helpers (unchanged from original) ───────────────────────

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


# ── CRUD ──────────────────────────────────────────────────────────────────────

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

    new_user = UserModel(
        name=user_data.name,
        email=user_data.email,
        password_hash=pwd_context.hash(user_data.password[:72]),
        role=role,
        is_active=is_active,
    )

    # ── write module access booleans ──
    if user_data.module_access is not None:
        _apply_module_access(new_user, user_data.module_access)

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

    _attach_module_access(new_user)
    return new_user


def get_all_users(db: Session) -> List[UserModel]:
    users = db.query(UserModel).all()
    for user in users:
        _attach_assigned_client_ids(user)
        _attach_module_access(user)
    return users


def get_user_by_id(db: Session, user_id: int) -> UserModel:
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    _attach_assigned_client_ids(user)
    _attach_module_access(user)
    return user


def update_user(
    db: Session, user_id: int, update_data: UserUpdate, *, can_manage_assignments: bool = False
) -> UserModel:
    user = get_user_by_id(db, user_id)

    if update_data.email and update_data.email != user.email:
        existing = db.query(UserModel).filter(UserModel.email == update_data.email).first()
        if existing and existing.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use",
            )

    data = update_data.model_dump(exclude_unset=True)

    # ── client assignments ──
    assigned_ids = None
    if "assigned_client_ids" in data:
        if not can_manage_assignments:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to assign clients",
            )
        assigned_ids = _apply_client_assignments(db, user, data.pop("assigned_client_ids"))

    # ── module access — pop from dict, apply separately ──
    raw_module_access = data.pop("module_access", None)
    if raw_module_access is not None:
        # model_dump() gives a plain dict; _apply_module_access handles both dict and object
        _apply_module_access(user, raw_module_access)

    # ── password ──
    password = data.pop("password", None)
    if password:
        user.password_hash = pwd_context.hash(password[:72])

    # ── remaining scalar fields ──
    for key, value in data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)

    if assigned_ids is None:
        _attach_assigned_client_ids(user)
    else:
        setattr(user, "assigned_client_ids", assigned_ids)

    _attach_module_access(user)
    return user


def delete_user(db: Session, user_id: int) -> dict:
    user = get_user_by_id(db, user_id)

    if (user.role or "").lower() == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete admin users",
        )

    managed_clients = db.query(Client).filter(Client.assigned_manager_id == user.id).all()
    for client in managed_clients:
        client.assigned_manager_id = None

    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully"}
