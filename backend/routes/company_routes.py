from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas.company_schema import CompanyProfileResponse, CompanyProfileUpdate
from services import company_service

router = APIRouter(tags=["Company"])


@router.get("/user/{user_id}", response_model=CompanyProfileResponse)
def get_company_profile(user_id: int, db: Session = Depends(get_db)):
    return company_service.get_company_profile(db, user_id)


@router.put("/user/{user_id}", response_model=CompanyProfileResponse)
def update_company_profile(user_id: int, update_data: CompanyProfileUpdate, db: Session = Depends(get_db)):
    return company_service.upsert_company_profile(db, user_id, update_data)
