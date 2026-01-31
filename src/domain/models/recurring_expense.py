"""
Recurring Expense model for automated/scheduled expenses.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
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
    from .transaction import Category


class RecurringExpense(Base, TimestampMixin):
    """
    Recurring expense entity for scheduled automatic or manual expenses.

    Frequencies: DAILY, WEEKLY, BIWEEKLY, MONTHLY
    Can be automatic (creates transaction automatically) or manual (reminder).
    """

    __tablename__ = "recurring_expenses"

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
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Expense details
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Financial data
    amount: Mapped[Decimal] = mapped_column(
        Numeric(19, 4),
        nullable=False,
    )
    currency_code: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="MXN",
    )

    # Schedule
    frequency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="MONTHLY",
    )
    next_due_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    last_executed_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )

    # Behavior
    is_automatic: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Relationships
    family: Mapped["Family"] = relationship(
        "Family",
        back_populates="recurring_expenses",
    )
    category: Mapped[Optional["Category"]] = relationship("Category")

    __table_args__ = (
        CheckConstraint(
            "frequency IN ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY')",
            name="check_recurring_frequency",
        ),
    )

    def __repr__(self) -> str:
        return f"<RecurringExpense(id={self.id}, name={self.name}, frequency={self.frequency})>"
