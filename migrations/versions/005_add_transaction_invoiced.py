"""Add is_invoiced field to transactions

Revision ID: 005_add_transaction_invoiced
Revises: 004_add_recurring_expenses
Create Date: 2026-01-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005_add_transaction_invoiced'
down_revision: Union[str, None] = '004_add_recurring_expenses'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_invoiced column with default False
    op.add_column(
        'transactions',
        sa.Column('is_invoiced', sa.Boolean(), nullable=False, server_default='false')
    )


def downgrade() -> None:
    op.drop_column('transactions', 'is_invoiced')
