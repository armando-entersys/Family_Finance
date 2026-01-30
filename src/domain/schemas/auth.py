"""
Authentication schemas (DTOs) for request/response validation.
"""

from typing import Optional
import uuid

from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    """Schema for user registration."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: Optional[str] = Field(None, max_length=100)
    family_name: Optional[str] = Field(None, max_length=100)


class UserLogin(BaseModel):
    """Schema for user login (OAuth2 password flow)."""

    username: EmailStr  # OAuth2 uses "username" field
    password: str


class TokenResponse(BaseModel):
    """Schema for token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenRefresh(BaseModel):
    """Schema for token refresh request."""

    refresh_token: str


class UserResponse(BaseModel):
    """Schema for user data response."""

    id: uuid.UUID
    email: str
    name: Optional[str] = None
    role: str
    family_id: Optional[uuid.UUID] = None
    is_active: bool

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None


class UserWithFamily(UserResponse):
    """User response including family details."""

    family_name: Optional[str] = None
