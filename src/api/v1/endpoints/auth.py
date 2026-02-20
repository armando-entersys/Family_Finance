"""
Authentication endpoints: Login, Register, Refresh Token, Password Reset.
"""

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_password_reset_token,
    verify_refresh_token,
)
from src.domain.models import Family, User
from src.domain.schemas import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenRefresh,
    TokenResponse,
    UserRegister,
    UserResponse,
    UserUpdate,
)
from src.services.email_service import email_service
from src.api.v1.dependencies import CurrentUser, DbSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserRegister,
    db: DbSession,
) -> User:
    """
    Register a new user.
    Optionally creates a new family if family_name is provided.
    """
    # Check if email already exists
    result = await db.execute(
        select(User).where(User.email == data.email.lower())
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Create family if name provided
    family_id = None
    if data.family_name:
        family = Family(name=data.family_name)
        db.add(family)
        await db.flush()
        family_id = family.id

    # Create user
    user = User(
        email=data.email.lower(),
        name=data.name,
        password_hash=hash_password(data.password),
        family_id=family_id,
        role="ADMIN" if family_id else "MEMBER",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DbSession,
) -> TokenResponse:
    """
    OAuth2 password flow login.
    Returns access and refresh tokens.
    """
    # Find user by email
    result = await db.execute(
        select(User).where(
            User.email == form_data.username.lower(),
            User.is_active == True,
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate tokens
    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: TokenRefresh,
    db: DbSession,
) -> TokenResponse:
    """
    Refresh access token using refresh token.
    """
    payload = verify_refresh_token(data.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # Verify user still exists and is active
    user_id = uuid.UUID(payload["sub"])
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Generate new tokens
    access_token = create_access_token(subject=user.id, role=user.role)
    new_refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: CurrentUser,
) -> User:
    """
    Get current user information.
    """
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    data: UserUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> User:
    """
    Update current user profile.
    """
    # Check if email is being changed and is unique
    if data.email and data.email.lower() != current_user.email:
        result = await db.execute(
            select(User).where(User.email == data.email.lower())
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already in use",
            )
        current_user.email = data.email.lower()

    # Update name if provided
    if data.name is not None:
        current_user.name = data.name

    await db.commit()
    await db.refresh(current_user)

    return current_user


@router.post("/complete-onboarding", response_model=UserResponse)
async def complete_onboarding(
    current_user: CurrentUser,
    db: DbSession,
) -> User:
    """
    Mark user as having completed the onboarding tutorial.
    """
    current_user.has_completed_onboarding = True
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: DbSession,
) -> dict:
    """
    Request a password reset email.
    Always returns 200 to avoid revealing whether the email exists.
    """
    result = await db.execute(
        select(User).where(
            User.email == data.email.lower(),
            User.is_active == True,
        )
    )
    user = result.scalar_one_or_none()

    if user:
        token = create_password_reset_token(subject=user.id)
        reset_url = f"https://app.family-finance.scram2k.com/reset-password?token={token}"
        email_service.send_password_reset(to_email=user.email, reset_url=reset_url)
        logger.info(f"Password reset email sent to {user.email}")
    else:
        logger.info(f"Password reset requested for non-existent email: {data.email}")

    return {"message": "Si el correo esta registrado, recibiras un enlace para restablecer tu contrasena."}


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: DbSession,
) -> dict:
    """
    Reset password using a valid reset token.
    """
    payload = verify_password_reset_token(data.token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token invalido o expirado",
        )

    user_id = uuid.UUID(payload["sub"])
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token invalido o expirado",
        )

    user.password_hash = hash_password(data.new_password)
    await db.commit()

    logger.info(f"Password reset successful for user {user.email}")
    return {"message": "Contrasena actualizada exitosamente."}
