"""
Settings endpoints: User and family configuration.
"""

from typing import List
import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies import CurrentUser, DbSession, AdminUser
from src.domain.models import User, Family
from src.domain.schemas import (
    UserSettingsUpdate,
    UserSettingsResponse,
    FamilySettingsUpdate,
    FamilySettingsResponse,
    FamilyNameUpdate,
    FamilyInvite,
    FamilyMemberResponse,
)
from src.core.security import hash_password
from src.services.email_service import email_service

router = APIRouter(prefix="/settings", tags=["Settings"])


# ============================================================================
# User Settings
# ============================================================================

@router.get("/user", response_model=UserSettingsResponse)
async def get_user_settings(
    current_user: CurrentUser,
    db: DbSession,
) -> UserSettingsResponse:
    """Get current user's settings."""
    # Settings are stored in family.settings JSONB with user-specific keys
    settings = {}

    if current_user.family_id:
        result = await db.execute(
            select(Family).where(Family.id == current_user.family_id)
        )
        family = result.scalar_one_or_none()
        if family and family.settings:
            user_key = f"user_{current_user.id}"
            settings = family.settings.get(user_key, {})

    from datetime import time
    return UserSettingsResponse(
        daily_summary_enabled=settings.get("daily_summary_enabled", True),
        notification_time=time(
            settings.get("notification_hour", 21),
            settings.get("notification_minute", 0),
        ),
        preferred_currency=settings.get("preferred_currency", "MXN"),
        language=settings.get("language", "es"),
    )


@router.patch("/user", response_model=UserSettingsResponse)
async def update_user_settings(
    data: UserSettingsUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> UserSettingsResponse:
    """Update current user's settings."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    result = await db.execute(
        select(Family).where(Family.id == current_user.family_id)
    )
    family = result.scalar_one_or_none()

    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found",
        )

    # Update settings
    user_key = f"user_{current_user.id}"
    if family.settings is None:
        family.settings = {}

    family.settings[user_key] = {
        "daily_summary_enabled": data.daily_summary_enabled,
        "notification_hour": data.notification_time.hour,
        "notification_minute": data.notification_time.minute,
        "preferred_currency": data.preferred_currency,
        "language": data.language,
    }

    # Mark as modified for SQLAlchemy
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(family, "settings")

    await db.flush()

    return UserSettingsResponse(
        daily_summary_enabled=data.daily_summary_enabled,
        notification_time=data.notification_time,
        preferred_currency=data.preferred_currency,
        language=data.language,
    )


# ============================================================================
# Family Settings (Admin only)
# ============================================================================

@router.get("/family", response_model=FamilySettingsResponse)
async def get_family_settings(
    current_user: CurrentUser,
    db: DbSession,
) -> FamilySettingsResponse:
    """Get family settings."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    result = await db.execute(
        select(Family).where(Family.id == current_user.family_id)
    )
    family = result.scalar_one_or_none()

    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found",
        )

    settings = family.settings or {}

    return FamilySettingsResponse(
        name=family.name,
        month_close_day=settings.get("month_close_day", 1),
        default_currency=settings.get("default_currency", "MXN"),
        budget_warning_threshold=settings.get("budget_warning_threshold", 80),
    )


@router.patch("/family", response_model=FamilySettingsResponse)
async def update_family_settings(
    data: FamilySettingsUpdate,
    current_user: AdminUser,  # Requires ADMIN role
    db: DbSession,
) -> FamilySettingsResponse:
    """Update family settings (Admin only)."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    result = await db.execute(
        select(Family).where(Family.id == current_user.family_id)
    )
    family = result.scalar_one_or_none()

    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found",
        )

    # Update settings
    if family.settings is None:
        family.settings = {}

    family.settings["month_close_day"] = data.month_close_day
    family.settings["default_currency"] = data.default_currency
    family.settings["budget_warning_threshold"] = data.budget_warning_threshold

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(family, "settings")

    await db.flush()

    return FamilySettingsResponse(
        name=family.name,
        month_close_day=data.month_close_day,
        default_currency=data.default_currency,
        budget_warning_threshold=data.budget_warning_threshold,
    )


@router.patch("/family/name", response_model=FamilySettingsResponse)
async def update_family_name(
    data: FamilyNameUpdate,
    current_user: AdminUser,  # Requires ADMIN role
    db: DbSession,
) -> FamilySettingsResponse:
    """Update family name (Admin only)."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    result = await db.execute(
        select(Family).where(Family.id == current_user.family_id)
    )
    family = result.scalar_one_or_none()

    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found",
        )

    # Update name
    family.name = data.name
    await db.flush()

    settings = family.settings or {}

    return FamilySettingsResponse(
        name=family.name,
        month_close_day=settings.get("month_close_day", 1),
        default_currency=settings.get("default_currency", "MXN"),
        budget_warning_threshold=settings.get("budget_warning_threshold", 80),
    )


# ============================================================================
# Family Members
# ============================================================================

@router.get("/family/members", response_model=List[FamilyMemberResponse])
async def list_family_members(
    current_user: CurrentUser,
    db: DbSession,
) -> List[FamilyMemberResponse]:
    """List all members of the family."""
    if not current_user.family_id:
        return []

    result = await db.execute(
        select(User).where(
            User.family_id == current_user.family_id,
            User.is_active == True,
        )
    )
    members = result.scalars().all()

    return [
        FamilyMemberResponse(
            id=str(m.id),
            email=m.email,
            name=m.name,
            role=m.role,
            is_active=m.is_active,
        )
        for m in members
    ]


@router.post("/family/invite", response_model=FamilyMemberResponse, status_code=status.HTTP_201_CREATED)
async def invite_family_member(
    data: FamilyInvite,
    current_user: AdminUser,  # Requires ADMIN role
    db: DbSession,
) -> FamilyMemberResponse:
    """
    Invite a new member to the family.
    Creates user account with temporary password.
    """
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    # Check if email already exists
    result = await db.execute(
        select(User).where(User.email == data.email.lower())
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Create new user with temporary password
    import secrets
    temp_password = secrets.token_urlsafe(12)

    new_user = User(
        email=data.email.lower(),
        password_hash=hash_password(temp_password),
        family_id=current_user.family_id,
        role=data.role if data.role in ["ADMIN", "MEMBER"] else "MEMBER",
    )

    db.add(new_user)
    await db.flush()
    await db.refresh(new_user)

    # Get family name for the email
    result = await db.execute(
        select(Family).where(Family.id == current_user.family_id)
    )
    family = result.scalar_one_or_none()
    family_name = family.name if family else "Tu Familia"

    # Get inviter name
    inviter_name = current_user.name or current_user.email.split("@")[0]

    # Send invitation email
    email_service.send_family_invitation(
        to_email=new_user.email,
        family_name=family_name,
        inviter_name=inviter_name,
        temp_password=temp_password,
    )

    return FamilyMemberResponse(
        id=str(new_user.id),
        email=new_user.email,
        name=new_user.name,
        role=new_user.role,
        is_active=new_user.is_active,
    )


@router.delete("/family/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_family_member(
    member_id: uuid.UUID,
    current_user: AdminUser,  # Requires ADMIN role
    db: DbSession,
) -> None:
    """Remove a member from the family (soft delete)."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    # Cannot remove self
    if member_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove yourself",
        )

    result = await db.execute(
        select(User).where(
            User.id == member_id,
            User.family_id == current_user.family_id,
        )
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    # Soft delete - remove from family
    member.family_id = None
    member.is_active = False

    await db.flush()
