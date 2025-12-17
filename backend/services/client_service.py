from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

import os

from models.client_model import Client
from models.user_model import UserModel
from models.campaign_model import Campaign
from models.recommendation_model import Recommendation
from models.google_ads_account import GoogleAdsAccount
from models.campaign_asset_performance import CampaignAssetPerformance
from models.campaign_asset_set_link import CampaignAssetSetLink
from models.campaign_conversion_stat import CampaignConversionStat
from schemas.client_schema import (
    ClientAssignmentResponse,
    ClientAssignmentUpdate,
    ClientCreate,
    ClientUpdate,
)
from services.google_oauth_service import (
    get_global_mcc_credentials,
    save_google_account,
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


def _attach_google_ads_status(db: Session, clients: Sequence[Client]) -> Sequence[Client]:
    """Populate each client object with a boolean flag for Google OAuth linkage."""

    if not clients:
        return clients

    client_ids = [client.id for client in clients if client.id is not None]
    if not client_ids:
        return clients

    accounts = (
        db.query(GoogleAdsAccount.client_id, GoogleAdsAccount.refresh_token)
        .filter(GoogleAdsAccount.client_id.in_(client_ids))
        .all()
    )
    tokens_by_client = {client_id: bool(refresh_token) for client_id, refresh_token in accounts}

    for client in clients:
        setattr(client, "has_google_ads_auth", tokens_by_client.get(client.id, False))

    return clients


def _normalize_customer_id_list(customer_id: str | None, customer_ids: Sequence[str] | None) -> list[str]:
    """Merge single/multiple inputs into a de-duplicated list of digit-only IDs."""

    combined: list[str] = []

    def _add_values(values: Sequence[str] | str | None):
        if values is None:
            return
        if isinstance(values, str):
            values_to_add = values.split(",")
        else:
            values_to_add = values

        for value in values_to_add:
            digits_only = "".join(ch for ch in str(value) if ch.isdigit())
            if digits_only:
                combined.append(digits_only)

    _add_values(customer_id)
    _add_values(customer_ids)

    if not combined:
        return []

    # remove duplicates while preserving order
    deduped: list[str] = []
    seen: set[str] = set()
    for value in combined:
        if value not in seen:
            seen.add(value)
            deduped.append(value)

    return deduped


def _attach_customer_ids(clients: Sequence[Client]) -> Sequence[Client]:
    """Expose stored customer IDs as a list on the response models."""

    for client in clients:
        if not client:
            continue
        if getattr(client, "customer_ids", None):
            parsed = [
                "".join(ch for ch in str(cid) if ch.isdigit())
                for cid in getattr(client, "customer_ids")
                if str(cid).strip()
            ]
        else:
            raw = getattr(client, "customer_id", None) or ""
            parsed = [cid.strip() for cid in raw.split(",") if cid.strip()]

        setattr(client, "customer_ids", parsed)
        client.customer_id = parsed[0] if parsed else None
    return clients


def create_client(db: Session, client_data: ClientCreate, created_by: UserModel) -> Client:
    """Create a new client record linked to the admin who created it."""

    existing_client = db.query(Client).filter(Client.email == client_data.email).first()
    if existing_client:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Client with this email already exists")

    payload = client_data.model_dump(exclude_unset=True).copy()
    assigned_manager_id = payload.pop("assigned_manager_id", None)

    payload["developer_token"] = payload.get("developer_token") or os.getenv("DEVELOPER_TOKEN")
    payload["client_id"] = payload.get("client_id") or os.getenv("GOOGLE_CLIENT_ID")
    payload["client_secret"] = payload.get("client_secret") or os.getenv("GOOGLE_CLIENT_SECRET")
    payload["login_customer_id"] = payload.get("login_customer_id") or os.getenv("LOGIN_CUSTOMER_ID")

    normalized_customer_ids = _normalize_customer_id_list(
        payload.get("customer_id"), payload.pop("customer_ids", None)
    )
    payload["customer_ids"] = normalized_customer_ids or []
    payload["customer_id"] = normalized_customer_ids[0] if normalized_customer_ids else None

    payload["currency_code"] = (payload.get("currency_code") or "USD").upper()

    if assigned_manager_id is not None:
        _validate_manager(db, assigned_manager_id)

    new_client = Client(**payload)
    new_client.created_by_id = created_by.id
    new_client.assigned_manager_id = assigned_manager_id

    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    setattr(new_client, "has_google_ads_auth", False)
    _attach_customer_ids([new_client])
    
    # If an MCC refresh token already exists, link it immediately to the new client
    mcc_credentials = get_global_mcc_credentials(db)
    if mcc_credentials:
        try:
            save_google_account(
                db=db,
                client_db_id=new_client.id,
                tokens={"refresh_token": mcc_credentials.get("refresh_token")},
                login_customer_id=mcc_credentials.get("login_customer_id"),
                developer_token=mcc_credentials.get("developer_token"),
            )
            setattr(new_client, "has_google_ads_auth", True)
        except HTTPException:
            db.rollback()
        finally:
            _attach_google_ads_status(db, [new_client])
    return new_client


def get_clients_for_user(db: Session, requester: UserModel) -> Sequence[Client]:
    """Fetch clients scoped to the requesting user's permissions."""

    query = db.query(Client)
    if (requester.role or "").lower() != "admin":
        query = query.filter(Client.assigned_manager_id == requester.id)

    clients = query.order_by(Client.name.asc()).all()
    _attach_google_ads_status(db, clients)
    _attach_customer_ids(clients)
    return clients


def get_client_by_id(db: Session, client_id: int, requester: UserModel) -> Client:
    """Fetch a client by ID respecting assignment rules."""

    client = _get_client_or_404(db, client_id)

    if (requester.role or "").lower() != "admin":
        if client.assigned_manager_id != requester.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to client denied")

    _attach_google_ads_status(db, [client])
    _attach_customer_ids([client])
    return client


def update_client(db: Session, client_id: int, update_data: ClientUpdate) -> Client:
    """Update client details (admin only)."""

    client = _get_client_or_404(db, client_id)

    payload = update_data.model_dump(exclude_unset=True)
    if "currency_code" in payload:
        payload["currency_code"] = (payload.get("currency_code") or "USD").upper()
    assigned_manager_id = payload.pop("assigned_manager_id", None)

    if assigned_manager_id is not None:
        _validate_manager(db, assigned_manager_id)
        client.assigned_manager_id = assigned_manager_id

    if "customer_ids" in payload or "customer_id" in payload:
        normalized_customer_ids = _normalize_customer_id_list(
            payload.get("customer_id"), payload.pop("customer_ids", None)
        )
        client.customer_ids = normalized_customer_ids or []
        client.customer_id = normalized_customer_ids[0] if normalized_customer_ids else None
        
    for key, value in payload.items():
        setattr(client, key, value)

    db.commit()
    db.refresh(client)
    _attach_google_ads_status(db, [client])
    _attach_customer_ids([client])
    return client


def delete_client(db: Session, client_id: int) -> dict:
    """Delete a client record (admin only)."""

    client = _get_client_or_404(db, client_id)
    inspector = inspect(db.get_bind())

    # Remove dependent records in a foreign-key-safe order. Newly added
    # campaign/asset tables enforce FK constraints, so children must be cleared
    # before parents.
    db.query(CampaignAssetPerformance).filter(
        CampaignAssetPerformance.client_id == client.id
    ).delete(synchronize_session=False)

    # The campaign_assets table may not be mapped in SQLAlchemy, so delete it
    # directly if it exists to satisfy the required sequence.
    if inspector.has_table("campaign_assets"):
        db.execute(text("DELETE FROM campaign_assets WHERE client_id = :client_id"), {"client_id": client.id})

    db.query(CampaignAssetSetLink).filter(
        CampaignAssetSetLink.client_id == client.id
    ).delete(synchronize_session=False)
    db.query(CampaignConversionStat).filter(
        CampaignConversionStat.client_id == client.id
    ).delete(synchronize_session=False)

    # Tables without cascade rules or without ORM relationships must be removed
    # manually ahead of the client delete to avoid integrity errors.
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
