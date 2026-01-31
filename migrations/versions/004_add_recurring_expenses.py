"""Add recurring expenses and category budgets tables

Revision ID: 004_add_recurring_expenses
Revises: 003_add_user_name
Create Date: 2026-01-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '004_add_recurring_expenses'
down_revision: Union[str, None] = '003_add_user_name'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create recurring_expenses table
    op.create_table(
        'recurring_expenses',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('family_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('amount', sa.Numeric(19, 4), nullable=False),
        sa.Column('currency_code', sa.String(3), nullable=False, server_default='MXN'),
        sa.Column('frequency', sa.String(10), nullable=False, server_default='MONTHLY'),
        sa.Column('next_due_date', sa.Date(), nullable=False),
        sa.Column('last_executed_date', sa.Date(), nullable=True),
        sa.Column('is_automatic', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['family_id'], ['families.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='SET NULL'),
        sa.CheckConstraint("frequency IN ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY')", name='check_recurring_frequency'),
    )
    op.create_index('ix_recurring_expenses_family_id', 'recurring_expenses', ['family_id'])

    # Create category_budgets table
    op.create_table(
        'category_budgets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('family_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('budget_amount', sa.Numeric(19, 4), nullable=False),
        sa.Column('currency_code', sa.String(3), nullable=False, server_default='MXN'),
        sa.Column('period', sa.String(10), nullable=False, server_default='MONTHLY'),
        sa.Column('alert_threshold', sa.Integer(), nullable=False, server_default='80'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['family_id'], ['families.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('family_id', 'category_id', name='unique_family_category_budget'),
        sa.CheckConstraint("period IN ('WEEKLY', 'MONTHLY')", name='check_budget_period'),
        sa.CheckConstraint('alert_threshold >= 0 AND alert_threshold <= 100', name='check_alert_threshold'),
    )
    op.create_index('ix_category_budgets_family_id', 'category_budgets', ['family_id'])


def downgrade() -> None:
    # Drop category_budgets table
    op.drop_index('ix_category_budgets_family_id', table_name='category_budgets')
    op.drop_table('category_budgets')

    # Drop recurring_expenses table
    op.drop_index('ix_recurring_expenses_family_id', table_name='recurring_expenses')
    op.drop_table('recurring_expenses')
