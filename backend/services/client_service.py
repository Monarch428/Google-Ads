from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.client_model import Client
from models.user_model import UserModel
from models.campaign_model import Campaign
from models.recommendation_model import Recommendation
from models.google_ads_account import GoogleAdsAccount
from schemas.client_schema import (
    ClientAssignmentResponse,
    ClientAssignmentUpdate,
    ClientCreate,
    ClientUpdate,
)


def _get_client_or_404(db: Session, client_id: int) -> Client:
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


def _validate_manager(db: Session, manager_id: int) -> UserModel:
    manager = db.query(UserModel).filter(UserModel.id == manager_id).first()
    if not manager:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Manager not found")

    if (manager.role or "").lower() == "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot assign client to admin user")

    if not getattr(manager, "is_active", True):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Manager account is inactive")

    return manager


def create_client(db: Session, client_data: ClientCreate, created_by: UserModel) -> Client:
    """Create a new client record linked to the admin who created it."""

    existing_client = db.query(Client).filter(Client.email == client_data.email).first()
    if existing_client:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Client with this email already exists")

    payload = client_data.model_dump(exclude_unset=True).copy()
    assigned_manager_id = payload.pop("assigned_manager_id", None)

    if assigned_manager_id is not None:
        _validate_manager(db, assigned_manager_id)

    new_client = Client(**payload)
    new_client.created_by_id = created_by.id
    new_client.assigned_manager_id = assigned_manager_id

    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    return new_client


def get_clients_for_user(db: Session, requester: UserModel) -> Sequence[Client]:
    """Fetch clients scoped to the requesting user's permissions."""

    query = db.query(Client)
    if (requester.role or "").lower() != "admin":
        query = query.filter(Client.assigned_manager_id == requester.id)

    return query.order_by(Client.name.asc()).all()


def get_client_by_id(db: Session, client_id: int, requester: UserModel) -> Client:
    """Fetch a client by ID respecting assignment rules."""

    client = _get_client_or_404(db, client_id)

    if (requester.role or "").lower() != "admin":
        if client.assigned_manager_id != requester.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to client denied")

    return client


def update_client(db: Session, client_id: int, update_data: ClientUpdate) -> Client:
    """Update client details (admin only)."""

    client = _get_client_or_404(db, client_id)

    payload = update_data.model_dump(exclude_unset=True)
    assigned_manager_id = payload.pop("assigned_manager_id", None)

    if assigned_manager_id is not None:
        _validate_manager(db, assigned_manager_id)
        client.assigned_manager_id = assigned_manager_id

    for key, value in payload.items():
        setattr(client, key, value)

    db.commit()
    db.refresh(client)
    return client


def delete_client(db: Session, client_id: int) -> dict:
    """Delete a client record (admin only)."""

    client = _get_client_or_404(db, client_id)

    # Remove dependent records that use a hard foreign-key constraint. The
    # GoogleAdsAccount and Recommendation tables do not have SQLAlchemy
    # relationships with cascade rules, so deleting the client would otherwise
    # raise an IntegrityError. Explicitly delete the related rows first to keep
    # the operation atomic.
    db.query(GoogleAdsAccount).filter(GoogleAdsAccount.client_id == client.id).delete(synchronize_session=False)
    db.query(Recommendation).filter(Recommendation.client_id == client.id).delete(synchronize_session=False)
    db.query(Campaign).filter(Campaign.client_id == client.id).delete(synchronize_session=False)

    db.delete(client)
    db.commit()
    return {"message": "Client deleted successfully"}


def update_manager_assignments(
    db: Session,
    assignment: ClientAssignmentUpdate,
) -> ClientAssignmentResponse:
    """Assign or unassign clients to a manager in bulk."""

    manager = _validate_manager(db, assignment.manager_id)
    desired_client_ids = {int(client_id) for client_id in assignment.client_ids}

    # Ensure all provided clients exist
    if desired_client_ids:
        existing_clients = db.query(Client.id).filter(Client.id.in_(desired_client_ids)).all()
        if len(existing_clients) != len(desired_client_ids):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more clients do not exist")

    # Unassign clients currently linked to the manager but not in the desired list
    current_clients = (
        db.query(Client).filter(Client.assigned_manager_id == manager.id).all()
    )
    for client in current_clients:
        if client.id not in desired_client_ids:
            client.assigned_manager_id = None

    # Assign selected clients to the manager
    if desired_client_ids:
        clients_to_assign = db.query(Client).filter(Client.id.in_(desired_client_ids)).all()
        for client in clients_to_assign:
            client.assigned_manager_id = manager.id

    db.commit()

    return ClientAssignmentResponse(
        manager_id=manager.id,
        assigned_client_ids=sorted(desired_client_ids),
    )
