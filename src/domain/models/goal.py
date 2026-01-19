"""
Goal model for savings targets ("Cochinitos").
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
    from .user import User


class Goal(Base, TimestampMixin):
    """
    Savings goal entity ("Cochinito" / Piggy bank).

    Types: FAMILY (shared), PERSONAL (private)
    BR-003: Personal goals only visible to creator.
    """

    __tablename__ = "goals"

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
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    icon: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="piggy_bank",
    )

    # Financial targets
    target_amount: Mapped[Decimal] = mapped_column(
        Numeric(19, 4),
        nullable=False,
    )
    current_saved: Mapped[Decimal] = mapped_column(
        Numeric(19, 4),
        nullable=False,
        default=Decimal("0"),
    )
    currency_code: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="MXN",
    )

    # Timeline
    deadline: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Visibility (BR-003)
    goal_type: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="FAMILY",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Relationships
    family: Mapped["Family"] = relationship(
        "Family",
        back_populates="goals",
    )
    creator: Mapped[Optional["User"]] = relationship("User")
    contributions: Mapped[List["GoalContribution"]] = relationship(
        "GoalContribution",
        back_populates="goal",
        lazy="selectin",
    )

    __table_args__ = (
        CheckConstraint(
            "goal_type IN ('FAMILY', 'PERSONAL')",
            name="check_goal_type",
        ),
    )

    @property
    def progress_percentage(self) -> float:
        """Calculate progress towards goal."""
        if self.target_amount == 0:
            return 0.0
        return float(self.current_saved / self.target_amount * 100)

    def __repr__(self) -> str:
        return f"<Goal(id={self.id}, name={self.name}, progress={self.progress_percentage:.1f}%)>"


class GoalContribution(Base):
    """
    Contribution to a savings goal.
    Tracks individual deposits/withdrawals.
    """

    __tablename__ = "goal_contributions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    goal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("goals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(19, 4),
        nullable=False,
    )
    contribution_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    is_withdrawal: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    goal: Mapped["Goal"] = relationship(
        "Goal",
        back_populates="contributions",
    )
    user: Mapped[Optional["User"]] = relationship("User")

    def __repr__(self) -> str:
        action = "withdrawal" if self.is_withdrawal else "deposit"
        return f"<GoalContribution(id={self.id}, {action}={self.amount})>"
