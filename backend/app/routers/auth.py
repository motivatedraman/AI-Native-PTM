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
    try:
        expected_user = settings.get_auth_username()
        expected_pass = settings.get_auth_password()
        
        provided_user = payload.username.strip().strip('"').strip("'")
        provided_pass = payload.password.strip().strip('"').strip("'")

        # Case-insensitive username check, exact password check
        if provided_user.lower() != expected_user.lower() or provided_pass != expected_pass:
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
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH_LOGIN_ERROR] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login authentication error: {str(e)}"
        )

@router.get("/me", response_model=UserProfile)
def get_current_user_profile(user: str = Depends(get_current_user)):
    return UserProfile(username=user, is_authenticated=True)
