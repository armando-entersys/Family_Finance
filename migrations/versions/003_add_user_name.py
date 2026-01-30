"""Add name column to users table

Revision ID: 003_add_user_name
Revises: 002_update_debt_types
Create Date: 2026-01-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '003_add_user_name'
down_revision: Union[str, None] = '002_update_debt_types'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add name column to users table
    op.add_column('users', sa.Column('name', sa.String(100), nullable=True))


def downgrade() -> None:
    # Remove name column
    op.drop_column('users', 'name')
