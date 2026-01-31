"""
Category Budget schemas for request/response validation.
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
import uuid

from pydantic import BaseModel, Field


BudgetPeriod = Literal["WEEKLY", "MONTHLY"]


class CategoryBudgetCreate(BaseModel):
    """Schema for creating a category budget."""

    category_id: int
    budget_amount: Decimal = Field(..., gt=0)
    currency_code: str = Field(default="MXN", max_length=3)
    period: BudgetPeriod = "MONTHLY"
    alert_threshold: int = Field(default=80, ge=0, le=100)


class CategoryBudgetUpdate(BaseModel):
    """Schema for updating a category budget."""

    budget_amount: Optional[Decimal] = Field(None, gt=0)
    currency_code: Optional[str] = Field(None, max_length=3)
    period: Optional[BudgetPeriod] = None
    alert_threshold: Optional[int] = Field(None, ge=0, le=100)


class CategoryBudgetResponse(BaseModel):
    """Schema for category budget response."""

    id: uuid.UUID
    family_id: uuid.UUID
    category_id: int
    budget_amount: Decimal
    currency_code: str
    period: str
    alert_threshold: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CategoryBudgetStatus(BaseModel):
    """Schema for budget status with spending info."""

    id: uuid.UUID
    family_id: uuid.UUID
    category_id: int
    category_name: Optional[str] = None
    budget_amount: Decimal
    currency_code: str
    period: str
    alert_threshold: int
    spent_amount: Decimal
    remaining_amount: Decimal
    percentage_used: float
    is_over_budget: bool
    is_alert_triggered: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
