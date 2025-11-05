from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from schemas.client_schema import ClientCreate, ClientUpdate, ClientResponse
from services import client_service
from typing import List

router = APIRouter()

@router.post("/add", response_model=ClientResponse, summary="Add new client (Admin only)")
def add_client(client_data: ClientCreate, db: Session = Depends(get_db)):
    return client_service.create_client(db, client_data)

@router.get("/all", response_model=List[ClientResponse], summary="Get all clients")
def list_clients(db: Session = Depends(get_db)):
    return client_service.get_all_clients(db)

@router.get("/{client_id}", response_model=ClientResponse, summary="Get client by ID")
def get_client(client_id: int, db: Session = Depends(get_db)):
    return client_service.get_client_by_id(db, client_id)

@router.put("/{client_id}", response_model=ClientResponse, summary="Update client details")
def update_client(client_id: int, update_data: ClientUpdate, db: Session = Depends(get_db)):
    return client_service.update_client(db, client_id, update_data)

@router.delete("/{client_id}", summary="Delete client")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    return client_service.delete_client(db, client_id)
