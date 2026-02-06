"""
Transaction model - Main ledger for all financial movements.
Receives 90% of writes - optimized for high volume.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .family import Family
    from .user import User


class Transaction(Base):
    """
    Transaction entity - records all financial movements.

    Types: INCOME, EXPENSE, DEBT, SAVING
    Supports multi-currency with exchange rate tracking.
    """

    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    family_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("families.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Financial data with precision
    amount_original: Mapped[Decimal] = mapped_column(
        Numeric(19, 4),
        nullable=False,
    )
    currency_code: Mapped[str] = mapped_column(
        String(3),  # ISO 4217
        nullable=False,
        default="MXN",
    )
    exchange_rate: Mapped[Decimal] = mapped_column(
        Numeric(10, 6),
        nullable=False,
        default=Decimal("1.0"),
    )
    amount_base: Mapped[Decimal] = mapped_column(
        Numeric(19, 4),
        nullable=False,
        index=True,  # For fast aggregations
    )

    # Transaction metadata
    trx_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,  # For date range queries
    )
    type: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Attachment (GCS URL)
    attachment_url: Mapped[Optional[str]] = mapped_column(
        String(1024),
        nullable=True,
    )
    attachment_thumb_url: Mapped[Optional[str]] = mapped_column(
        String(1024),
        nullable=True,
    )

    # SAT invoice flag (for Mexican tax deductions)
    is_invoiced: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
    )

    # Idempotency key for offline sync
    sync_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        default=uuid.uuid4,
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    family: Mapped["Family"] = relationship(
        "Family",
        back_populates="transactions",
    )
    user: Mapped[Optional["User"]] = relationship("User")
    category: Mapped[Optional["Category"]] = relationship("Category")

    __table_args__ = (
        CheckConstraint(
            "type IN ('INCOME', 'EXPENSE', 'DEBT', 'SAVING')",
            name="check_transaction_type",
        ),
        Index("ix_transactions_family_date", "family_id", "trx_date"),
        Index("ix_transactions_type", "type"),
    )

    @property
    def user_name(self) -> Optional[str]:
        if self.user:
            return self.user.name or self.user.email.split('@')[0]
        return None

    def __repr__(self) -> str:
        return f"<Transaction(id={self.id}, type={self.type}, amount={self.amount_base})>"


class Category(Base):
    """Transaction categories for classification."""

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    icon: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    type: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "type IN ('INCOME', 'EXPENSE')",
            name="check_category_type",
        ),
    )
