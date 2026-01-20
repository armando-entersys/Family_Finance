"""
Goal (Savings) schemas for request/response validation.
"Cochinitos" - Virtual piggy banks for savings goals.
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
import uuid

from pydantic import BaseModel, Field


GoalType = Literal["FAMILY", "PERSONAL"]


class GoalCreate(BaseModel):
    """Schema for creating a savings goal."""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon: str = Field(default="piggy_bank", max_length=50)
    target_amount: Decimal = Field(..., gt=0)
    currency_code: str = Field(default="MXN", max_length=3)
    deadline: Optional[datetime] = None
    goal_type: GoalType = "FAMILY"


class GoalUpdate(BaseModel):
    """Schema for updating a goal."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=50)
    target_amount: Optional[Decimal] = Field(None, gt=0)
    deadline: Optional[datetime] = None
    goal_type: Optional[GoalType] = None


class GoalResponse(BaseModel):
    """Schema for goal response."""

    id: uuid.UUID
    family_id: uuid.UUID
    created_by: Optional[uuid.UUID]
    name: str
    description: Optional[str]
    icon: str
    target_amount: Decimal
    current_saved: Decimal
    currency_code: str
    deadline: Optional[datetime]
    goal_type: str
    is_active: bool
    progress_percentage: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ContributionCreate(BaseModel):
    """Schema for creating a contribution to a goal."""

    amount: Decimal = Field(..., gt=0)
    is_withdrawal: bool = False
    notes: Optional[str] = Field(None, max_length=500)


class ContributionResponse(BaseModel):
    """Schema for contribution response."""

    id: uuid.UUID
    goal_id: uuid.UUID
    user_id: Optional[uuid.UUID]
    amount: Decimal
    contribution_date: datetime
    is_withdrawal: bool
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class GoalWithContributions(GoalResponse):
    """Goal with recent contributions."""

    contributions: list[ContributionResponse] = []
