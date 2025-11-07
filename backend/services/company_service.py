from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.company_model import CompanyProfile
from models.user_model import UserModel
from schemas.company_schema import CompanyProfileUpdate


def get_company_profile(db: Session, user_id: int) -> CompanyProfile:
    profile = db.query(CompanyProfile).filter(CompanyProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company profile not found")
    return profile


def upsert_company_profile(db: Session, user_id: int, payload: CompanyProfileUpdate) -> CompanyProfile:
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    profile = db.query(CompanyProfile).filter(CompanyProfile.user_id == user_id).first()
    data = payload.model_dump(exclude_unset=True)

    if profile:
        for key, value in data.items():
            setattr(profile, key, value)
    else:
        profile = CompanyProfile(user_id=user_id, **data)
        db.add(profile)

    db.commit()
    db.refresh(profile)
    return profile
