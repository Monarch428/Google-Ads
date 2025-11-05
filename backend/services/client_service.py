from sqlalchemy.orm import Session
from models.client_model import Client
from schemas.client_schema import ClientCreate, ClientUpdate
from fastapi import HTTPException


def create_client(db: Session, client_data: ClientCreate):
    """Create a new client record"""
    existing_client = db.query(Client).filter(Client.email == client_data.email).first()
    if existing_client:
        raise HTTPException(status_code=400, detail="Client with this email already exists")

    new_client = Client(**client_data.model_dump())
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    return new_client


def get_all_clients(db: Session):
    """Fetch all clients"""
    return db.query(Client).all()


def get_client_by_id(db: Session, client_id: int):
    """Fetch a client by ID"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


def update_client(db: Session, client_id: int, update_data: ClientUpdate):
    """Update client details"""
    client = get_client_by_id(db, client_id)
    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(client, key, value)
    db.commit()
    db.refresh(client)
    return client


def delete_client(db: Session, client_id: int):
    """Delete a client record"""
    client = get_client_by_id(db, client_id)
    db.delete(client)
    db.commit()
    return {"message": "Client deleted successfully"}
    