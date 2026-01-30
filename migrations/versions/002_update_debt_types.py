"""Update debt_type constraint to support new types

Revision ID: 002_update_debt_types
Revises: 001_initial
Create Date: 2026-01-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_update_debt_types'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old constraint
    op.drop_constraint('check_debt_type', 'debts', type_='check')

    # Create the new constraint with updated debt types
    op.create_check_constraint(
        'check_debt_type',
        'debts',
        "debt_type IN ('credit_card', 'personal_loan', 'mortgage', 'car_loan', 'other')"
    )

    # Update default value for debt_type column
    op.alter_column(
        'debts',
        'debt_type',
        server_default='other'
    )


def downgrade() -> None:
    # Drop the new constraint
    op.drop_constraint('check_debt_type', 'debts', type_='check')

    # Restore the old constraint
    op.create_check_constraint(
        'check_debt_type',
        'debts',
        "debt_type IN ('BANK', 'PERSONAL', 'SERVICE')"
    )

    # Restore old default
    op.alter_column(
        'debts',
        'debt_type',
        server_default='PERSONAL'
    )
