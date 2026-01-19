"""
Debt schemas for request/response validation.
Multi-currency liability tracking.
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
import uuid

from pydantic import BaseModel, Field


DebtType = Literal["BANK", "PERSONAL", "SERVICE"]


class DebtCreate(BaseModel):
    """Schema for creating a debt."""

    creditor: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    debt_type: DebtType = "PERSONAL"
    total_amount: Decimal = Field(..., gt=0, decimal_places=4)
    currency_code: str = Field(default="MXN", max_length=3)
    exchange_rate_fixed: Decimal = Field(default=Decimal("1.0"), gt=0)
    interest_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    due_date: Optional[datetime] = None


class DebtUpdate(BaseModel):
    """Schema for updating a debt."""

    creditor: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    debt_type: Optional[DebtType] = None
    interest_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    due_date: Optional[datetime] = None
    is_archived: Optional[bool] = None


class DebtResponse(BaseModel):
    """Schema for debt response."""

    id: uuid.UUID
    family_id: uuid.UUID
    creditor: str
    description: Optional[str]
    debt_type: str
    total_amount: Decimal
    current_balance: Decimal
    currency_code: str
    exchange_rate_fixed: Decimal
    amount_in_base_currency: Decimal  # Calculated field
    interest_rate: Optional[Decimal]
    is_archived: bool
    due_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaymentCreate(BaseModel):
    """Schema for creating a debt payment (BR-004: Immutable)."""

    amount: Decimal = Field(..., gt=0, decimal_places=4)
    payment_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=500)


class PaymentAdjustment(BaseModel):
    """Schema for payment adjustment (counter-entry)."""

    original_payment_id: uuid.UUID
    adjustment_amount: Decimal = Field(..., decimal_places=4)
    notes: str = Field(..., min_length=1, max_length=500)


class PaymentResponse(BaseModel):
    """Schema for payment response."""

    id: uuid.UUID
    debt_id: uuid.UUID
    amount: Decimal
    payment_date: datetime
    notes: Optional[str]
    is_adjustment: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DebtWithPayments(DebtResponse):
    """Debt with payment history."""

    payments: list[PaymentResponse] = []
    total_paid: Decimal = Decimal("0")


class DebtSummary(BaseModel):
    """Summary of all debts."""

    total_debts: int
    total_balance_mxn: Decimal
    by_type: dict[str, Decimal]
    by_currency: dict[str, Decimal]
