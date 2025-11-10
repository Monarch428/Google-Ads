from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from schemas.client_schema import (
    ClientAssignmentResponse,
    ClientAssignmentUpdate,
    ClientCreate,
    ClientResponse,
    ClientUpdate,
)
from services import client_service
from utils.auth_dependencies import (
    get_current_user,
    require_admin_refresh_user,
    require_admin_user,
)

router = APIRouter()

@router.post("/add", response_model=ClientResponse, summary="Add new client (Admin only)")
def add_client(
    client_data: ClientCreate,
    admin_user=Depends(require_admin_refresh_user),
    db: Session = Depends(get_db),
):
    return client_service.create_client(db, client_data, admin_user)

@router.get("/all", response_model=List[ClientResponse], summary="Get clients for the current user")
def list_clients(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return client_service.get_clients_for_user(db, current_user)

@router.get("/{client_id}", response_model=ClientResponse, summary="Get client by ID")
def get_client(
    client_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return client_service.get_client_by_id(db, client_id, current_user)

@router.put("/{client_id}", response_model=ClientResponse, summary="Update client details")
def update_client(
    client_id: int,
    update_data: ClientUpdate,
    _: None = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return client_service.update_client(db, client_id, update_data)

@router.delete("/{client_id}", summary="Delete client")
def delete_client(
    client_id: int,
    _: None = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return client_service.delete_client(db, client_id)


@router.post("/assignments", response_model=ClientAssignmentResponse, summary="Assign clients to a manager")
def update_client_assignments(
    assignment: ClientAssignmentUpdate,
    _: None = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return client_service.update_manager_assignments(db, assignment)
