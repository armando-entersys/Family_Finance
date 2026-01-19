"""
Family model - Logical tenant for the application.
"""

import uuid
from typing import TYPE_CHECKING, List

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .user import User
    from .transaction import Transaction
    from .debt import Debt
    from .goal import Goal


class Family(Base, TimestampMixin):
    """
    Family entity - represents a household/tenant.

    Attributes:
        id: UUID primary key
        name: Display name for the family
        settings: JSONB for flexible configuration (e.g., month close day)
    """

    __tablename__ = "families"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    settings: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        nullable=False,
    )

    # Relationships
    members: Mapped[List["User"]] = relationship(
        "User",
        back_populates="family",
        lazy="selectin",
    )
    transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction",
        back_populates="family",
        lazy="selectin",
    )
    debts: Mapped[List["Debt"]] = relationship(
        "Debt",
        back_populates="family",
        lazy="selectin",
    )
    goals: Mapped[List["Goal"]] = relationship(
        "Goal",
        back_populates="family",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Family(id={self.id}, name={self.name})>"
