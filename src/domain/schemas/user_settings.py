"""
User settings schemas for notifications and preferences.
"""

from datetime import time
from typing import Optional

from pydantic import BaseModel, Field


class UserSettingsUpdate(BaseModel):
    """Schema for updating user settings."""

    daily_summary_enabled: bool = True
    notification_time: time = Field(default=time(21, 0))  # 9:00 PM default
    preferred_currency: str = Field(default="MXN", max_length=3)
    language: str = Field(default="es", max_length=5)


class UserSettingsResponse(BaseModel):
    """Schema for user settings response."""

    daily_summary_enabled: bool
    notification_time: time
    preferred_currency: str
    language: str

    model_config = {"from_attributes": True}


class FamilySettingsUpdate(BaseModel):
    """Schema for updating family settings."""

    month_close_day: int = Field(default=1, ge=1, le=28)
    default_currency: str = Field(default="MXN", max_length=3)
    budget_warning_threshold: int = Field(default=80, ge=50, le=100)


class FamilyNameUpdate(BaseModel):
    """Schema for updating family name."""

    name: str = Field(..., min_length=1, max_length=100)


class FamilySettingsResponse(BaseModel):
    """Schema for family settings response."""

    name: str = ""
    month_close_day: int
    default_currency: str
    budget_warning_threshold: int

    model_config = {"from_attributes": True}


class FamilyInvite(BaseModel):
    """Schema for inviting a member to family."""

    email: str = Field(..., min_length=5)
    role: str = Field(default="MEMBER")


class FamilyMemberResponse(BaseModel):
    """Schema for family member info."""

    id: str
    email: str
    role: str
    is_active: bool
