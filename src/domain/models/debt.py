"""
Debt model for tracking liabilities (multi-currency support).
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .family import Family


class Debt(Base, TimestampMixin):
    """
    Debt entity for tracking liabilities.

    Supports multi-currency with fixed exchange rate for tracking.
    Types: credit_card, personal_loan, mortgage, car_loan, other
    """

    __tablename__ = "debts"

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
    creditor: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    debt_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="other",
    )

    # Financial data
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(19, 4),
        nullable=False,
    )
    current_balance: Mapped[Decimal] = mapped_column(
        Numeric(19, 4),
        nullable=False,
    )
    currency_code: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="MXN",
    )
    exchange_rate_fixed: Mapped[Decimal] = mapped_column(
        Numeric(10, 6),
        nullable=False,
        default=Decimal("1.0"),
    )

    # Interest (optional)
    interest_rate: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2),
        nullable=True,
    )

    # Status
    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    due_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    family: Mapped["Family"] = relationship(
        "Family",
        back_populates="debts",
    )
    payments: Mapped[List["DebtPayment"]] = relationship(
        "DebtPayment",
        back_populates="debt",
        lazy="selectin",
    )

    __table_args__ = (
        CheckConstraint(
            "debt_type IN ('credit_card', 'personal_loan', 'mortgage', 'car_loan', 'other')",
            name="check_debt_type",
        ),
    )

    def __repr__(self) -> str:
        return f"<Debt(id={self.id}, creditor={self.creditor}, balance={self.current_balance})>"


class DebtPayment(Base):
    """
    Immutable record of debt payments (BR-004).
    Payments cannot be deleted, only adjusted with counter-entries.
    """

    __tablename__ = "debt_payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    debt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("debts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(19, 4),
        nullable=False,
    )
    payment_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    is_adjustment: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    debt: Mapped["Debt"] = relationship(
        "Debt",
        back_populates="payments",
    )

    def __repr__(self) -> str:
        return f"<DebtPayment(id={self.id}, amount={self.amount})>"
