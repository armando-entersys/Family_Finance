"""Add has_completed_onboarding field to users table

Revision ID: 006_add_user_onboarding
Revises: 005_add_transaction_invoiced
Create Date: 2026-01-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '006_add_user_onboarding'
down_revision: Union[str, None] = '005_add_transaction_invoiced'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('has_completed_onboarding', sa.Boolean(), nullable=False, server_default='false')
    )


def downgrade() -> None:
    op.drop_column('users', 'has_completed_onboarding')
