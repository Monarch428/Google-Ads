# routes/auth_routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from database import get_db
from schemas.user_schema import UserCreate, UserLogin, UserResponse
from services.auth_service import register_user, login_user
import requests
import urllib.parse
import os  

# ✅ IMPORTANT: Remove prefix from router if it's added in main.py
router = APIRouter(
    tags=["Authentication"]
)

# Google OAuth Configuration (from environment variables)
CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
SCOPE = "https://www.googleapis.com/auth/adwords"

print(f"🔍 OAuth Config Loaded:")
print(f"   CLIENT_ID: {CLIENT_ID[:20] if CLIENT_ID else 'NOT SET'}...")
print(f"   CLIENT_SECRET: {'SET' if CLIENT_SECRET else 'NOT SET'}")
print(f"   REDIRECT_URI: {REDIRECT_URI}")


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


# ✅ Step 1: Generate Google Auth URL and REDIRECT
@router.get("/google-connect")
async def google_connect():
    """
    Redirects user to Google OAuth consent screen.
    After authorization, Google will redirect to /auth/google-callback
    """
    print("🚀 /google-connect endpoint hit!")
    
    if not all([CLIENT_ID, CLIENT_SECRET, REDIRECT_URI]):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Google OAuth not configured",
                "details": {
                    "client_id": "SET" if CLIENT_ID else "MISSING",
                    "client_secret": "SET" if CLIENT_SECRET else "MISSING",
                    "redirect_uri": REDIRECT_URI or "MISSING"
                }
            }
        )
    
    try:
        params = {
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT_URI,
            "response_type": "code",
            "scope": SCOPE,
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true"
        }
        auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
        
        print(f"✅ Redirecting to: {auth_url[:100]}...")
        return RedirectResponse(url=auth_url)
        
    except Exception as e:
        print(f"❌ Error in google_connect: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate Google Auth URL: {str(e)}"
        )


# ✅ Step 2: Google Callback — Exchange code for refresh token
@router.get("/google-callback")
async def google_callback(code: str = None, error: str = None):
    """
    Handle callback from Google OAuth.
    Exchanges authorization code for access_token and refresh_token.
    """
    print(f"🔄 /google-callback hit! Code: {code[:20] if code else 'None'}... Error: {error}")
    
    if error:
        raise HTTPException(
            status_code=400, 
            detail=f"Google OAuth error: {error}"
        )
    
    if not code:
        raise HTTPException(
            status_code=400, 
            detail="Authorization code not provided"
        )
    
    try:
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": REDIRECT_URI
        }

        print(f"📤 Exchanging code for tokens...")
        response = requests.post(token_url, data=data, timeout=10)
        
        if response.status_code == 200:
            tokens = response.json()
            print(f"✅ Tokens received! Refresh token present: {bool(tokens.get('refresh_token'))}")
            
            if not tokens.get("refresh_token"):
                return {
                    "warning": "⚠️ No refresh token received",
                    "message": "Revoke access at https://myaccount.google.com/permissions and try again",
                    "access_token": tokens.get("access_token"),
                    "expires_in": tokens.get("expires_in")
                }
            
            return {
                "message": "✅ Google Ads connected successfully",
                "refresh_token": tokens.get("refresh_token"),
                "access_token": tokens.get("access_token"),
                "expires_in": tokens.get("expires_in"),
                "scope": tokens.get("scope")
            }
        else:
            error_data = response.json()
            print(f"❌ Token exchange failed: {error_data}")
            raise HTTPException(
                status_code=400, 
                detail=f"Token exchange failed: {error_data.get('error_description', response.text)}"
            )
            
    except requests.RequestException as e:
        print(f"❌ Network error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Network error: {str(e)}"
        )
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error: {str(e)}"
        )


# ✅ Test endpoint
@router.get("/google-config-test")
async def test_google_config():
    """Test endpoint to verify Google OAuth configuration."""
    return {
        "client_id_set": bool(CLIENT_ID),
        "client_id_preview": CLIENT_ID[:30] + "..." if CLIENT_ID else None,
        "client_secret_set": bool(CLIENT_SECRET),
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPE,
        "status": "✅ Configuration OK" if all([CLIENT_ID, CLIENT_SECRET, REDIRECT_URI]) else "❌ Missing credentials"
    }