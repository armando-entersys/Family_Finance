"""
User model for authentication and family membership.
"""

import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .family import Family


class User(Base, TimestampMixin):
    """
    User entity for authentication and authorization.

    Attributes:
        id: UUID primary key (gen_random_uuid)
        email: Unique login identifier (normalized lowercase)
        password_hash: Argon2id hash
        family_id: Optional FK to families table
        role: ADMIN or MEMBER (RBAC)
        is_active: Soft delete flag
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    family_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("families.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="MEMBER",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Relationships
    family: Mapped[Optional["Family"]] = relationship(
        "Family",
        back_populates="members",
    )

    __table_args__ = (
        CheckConstraint(
            "role IN ('ADMIN', 'MEMBER')",
            name="check_user_role",
        ),
        Index("ix_users_family_id", "family_id"),
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
