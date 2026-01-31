"""
Recurring Expense schemas for request/response validation.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional
import uuid

from pydantic import BaseModel, Field


FrequencyType = Literal["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]


class RecurringExpenseCreate(BaseModel):
    """Schema for creating a recurring expense."""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category_id: Optional[int] = None
    amount: Decimal = Field(..., gt=0)
    currency_code: str = Field(default="MXN", max_length=3)
    frequency: FrequencyType = "MONTHLY"
    next_due_date: date
    is_automatic: bool = False


class RecurringExpenseUpdate(BaseModel):
    """Schema for updating a recurring expense."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category_id: Optional[int] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    currency_code: Optional[str] = Field(None, max_length=3)
    frequency: Optional[FrequencyType] = None
    next_due_date: Optional[date] = None
    is_automatic: Optional[bool] = None
    is_active: Optional[bool] = None


class RecurringExpenseResponse(BaseModel):
    """Schema for recurring expense response."""

    id: uuid.UUID
    family_id: uuid.UUID
    category_id: Optional[int]
    name: str
    description: Optional[str]
    amount: Decimal
    currency_code: str
    frequency: str
    next_due_date: date
    last_executed_date: Optional[date]
    is_automatic: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecurringExpenseExecute(BaseModel):
    """Schema for executing a recurring expense (creating a transaction)."""

    description: Optional[str] = Field(None, max_length=500)
    execution_date: Optional[date] = None  # Defaults to today if not provided
