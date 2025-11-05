# routes/auth_routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from schemas.user_schema import UserCreate, UserLogin, UserResponse
from services.auth_service import register_user, login_user
import requests
import urllib.parse
import os  

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

# Google OAuth Configuration (from environment variables)
CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
SCOPE = "https://www.googleapis.com/auth/adwords"


@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    user = register_user(db, user_data)
    if "error" in user:
        raise HTTPException(status_code=400, detail=user["error"])
    return user


@router.post("/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    token_data = login_user(db, user_data)
    if "error" in token_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=token_data["error"])
    return token_data


# ✅ Step 1: Generate Google Auth URL
@router.get("/google-connect")
def google_connect():
    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent"
    }
    auth_url = "https://accounts.google.com/o/oauth2/auth?" + urllib.parse.urlencode(params)
    return {"auth_url": auth_url}


# ✅ Step 2: Google Callback — Exchange code for refresh token
@router.get("/google-callback")
def google_callback(code: str):
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": REDIRECT_URI
    }

    response = requests.post(token_url, data=data)
    if response.status_code == 200:
        tokens = response.json()
        return {
            "message": "✅ Refresh token generated successfully",
            "refresh_token": tokens.get("refresh_token"),
            "access_token": tokens.get("access_token")
        }
    else:
        raise HTTPException(status_code=400, detail=response.text)
