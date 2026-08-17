from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from backend.app.config import settings
from backend.app.services.auth_service import create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str

class UserProfile(BaseModel):
    username: str
    is_authenticated: bool

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    if payload.username != settings.AUTH_USERNAME or payload.password != settings.AUTH_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    token = create_access_token(username=settings.AUTH_USERNAME)
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        username=settings.AUTH_USERNAME
    )

@router.get("/me", response_model=UserProfile)
def get_current_user_profile(user: str = Depends(get_current_user)):
    return UserProfile(username=user, is_authenticated=True)
