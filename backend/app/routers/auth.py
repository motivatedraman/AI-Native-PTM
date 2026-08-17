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
    # Normalize comparison by stripping any inadvertent trailing whitespaces or surrounding quotes
    expected_user = settings.AUTH_USERNAME.strip().strip('"').strip("'")
    expected_pass = settings.AUTH_PASSWORD.strip().strip('"').strip("'")
    provided_user = payload.username.strip()
    provided_pass = payload.password.strip()

    if provided_user != expected_user or provided_pass != expected_pass:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    token = create_access_token(username=expected_user)
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        username=expected_user
    )

@router.get("/me", response_model=UserProfile)
def get_current_user_profile(user: str = Depends(get_current_user)):
    return UserProfile(username=user, is_authenticated=True)
