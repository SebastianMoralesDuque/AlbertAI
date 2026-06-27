import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
from app.core.database import get_db
from app.core.config import get_settings
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.utils.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
)

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/auth", tags=["auth"])

# GitHub OAuth endpoints
GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado",
        )

    # Check if username exists
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya existe",
        )

    # Create user
    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/github/login")
async def github_login(request: Request):
    redirect_uri = settings.github_redirect_uri
    return RedirectResponse(
        url=f"{GITHUB_AUTHORIZE_URL}?client_id={settings.github_client_id}&redirect_uri={redirect_uri}&scope=user:email"
    )


@router.get("/github/callback")
async def github_callback(code: str = None, db: AsyncSession = Depends(get_db)):
    if not code:
        raise HTTPException(status_code=400, detail="Código de autorización no proporcionado")

    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_response.json()

    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Error al obtener token de acceso")

    # Get user info from GitHub
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            GITHUB_USER_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
        )
        github_user = user_response.json()

    email = github_user.get("email")
    # GitHub might not provide email publicly, need to fetch from emails endpoint
    if not email:
        async with httpx.AsyncClient() as client:
            emails_response = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )
            emails = emails_response.json()
            primary_email = next((e for e in emails if e.get("primary")), None)
            if primary_email:
                email = primary_email.get("email")

    if not email:
        raise HTTPException(status_code=400, detail="No se pudo obtener el email del usuario")

    username = github_user.get("login", email.split("@")[0])
    full_name = github_user.get("name", "")
    avatar_url = github_user.get("avatar_url")

    # Find or create user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        # Create new user from GitHub
        base_username = username
        counter = 1
        while True:
            result = await db.execute(select(User).where(User.username == username))
            if not result.scalar_one_or_none():
                break
            username = f"{base_username}{counter}"
            counter += 1

        user = User(
            email=email,
            username=username,
            full_name=full_name,
            avatar_url=avatar_url,
            is_google_user=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Ensure session consistency even for existing users
        await db.commit()

    # Create JWT token
    access_token = create_access_token(data={"sub": str(user.id)})
    logger.info(f"JWT created for user.id={user.id}, email={email}, preview={access_token[:40]}...")

    # Redirect to frontend with token
    frontend_url = settings.frontend_url
    return RedirectResponse(url=f"{frontend_url}/auth/callback?token={access_token}")
