"""
Category Budget model for budget limits per category.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .family import Family
    from .transaction import Category


class CategoryBudget(Base, TimestampMixin):
    """
    Budget limit for a specific category.

    Allows families to set spending limits per category
    with alert thresholds.
    """

    __tablename__ = "category_budgets"

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
    category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Budget configuration
    budget_amount: Mapped[Decimal] = mapped_column(
        Numeric(19, 4),
        nullable=False,
    )
    currency_code: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="MXN",
    )

    # Period: WEEKLY or MONTHLY
    period: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="MONTHLY",
    )

    # Alert when reaching this percentage (0-100)
    alert_threshold: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=80,
    )

    # Relationships
    family: Mapped["Family"] = relationship(
        "Family",
        back_populates="category_budgets",
    )
    category: Mapped["Category"] = relationship("Category")

    __table_args__ = (
        UniqueConstraint(
            "family_id",
            "category_id",
            name="unique_family_category_budget",
        ),
        CheckConstraint(
            "period IN ('WEEKLY', 'MONTHLY')",
            name="check_budget_period",
        ),
        CheckConstraint(
            "alert_threshold >= 0 AND alert_threshold <= 100",
            name="check_alert_threshold",
        ),
    )

    def __repr__(self) -> str:
        return f"<CategoryBudget(id={self.id}, category_id={self.category_id}, budget={self.budget_amount})>"
