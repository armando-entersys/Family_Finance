"""
Transaction schemas (DTOs) for request/response validation.
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
import uuid

from pydantic import BaseModel, Field, field_validator


TransactionType = Literal["INCOME", "EXPENSE", "DEBT", "SAVING"]


class TransactionCreate(BaseModel):
    """Schema for creating a transaction."""

    amount_original: Decimal = Field(..., gt=0)
    currency_code: str = Field(default="MXN", max_length=3)
    exchange_rate: Decimal = Field(default=Decimal("1.0"), gt=0)
    type: TransactionType
    category_id: Optional[int] = None
    description: Optional[str] = Field(None, max_length=500)
    trx_date: Optional[datetime] = None
    is_invoiced: bool = Field(default=False)  # SAT invoice flag
    sync_id: Optional[uuid.UUID] = None  # Client-generated for idempotency

    @field_validator("currency_code")
    @classmethod
    def uppercase_currency(cls, v: str) -> str:
        return v.upper()


class TransactionUpdate(BaseModel):
    """Schema for updating a transaction."""

    amount_original: Optional[Decimal] = Field(None, gt=0)
    currency_code: Optional[str] = Field(None, max_length=3)
    exchange_rate: Optional[Decimal] = Field(None, gt=0)
    category_id: Optional[int] = None
    description: Optional[str] = Field(None, max_length=500)
    trx_date: Optional[datetime] = None
    is_invoiced: Optional[bool] = None  # SAT invoice flag


class TransactionResponse(BaseModel):
    """Schema for transaction response."""

    id: uuid.UUID
    family_id: uuid.UUID
    user_id: Optional[uuid.UUID]
    category_id: Optional[int]
    amount_original: Decimal
    currency_code: str
    exchange_rate: Decimal
    amount_base: Decimal
    trx_date: datetime
    type: str
    description: Optional[str]
    attachment_url: Optional[str]
    attachment_thumb_url: Optional[str]
    is_invoiced: bool
    sync_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionList(BaseModel):
    """Schema for paginated transaction list."""

    items: list[TransactionResponse]
    total: int
    page: int
    size: int
    pages: int


class TransactionFilter(BaseModel):
    """Schema for transaction filtering."""

    type: Optional[TransactionType] = None
    category_id: Optional[int] = None
    currency_code: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
