"""Initial schema - All tables

Revision ID: 001_initial
Revises:
Create Date: 2026-01-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === FAMILIES TABLE ===
    op.create_table(
        'families',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('settings', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # === USERS TABLE ===
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('family_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('role', sa.String(20), nullable=False, server_default='MEMBER'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['family_id'], ['families.id'], ondelete='SET NULL'),
        sa.CheckConstraint("role IN ('ADMIN', 'MEMBER')", name='check_user_role')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_family_id', 'users', ['family_id'])

    # === CATEGORIES TABLE ===
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('type', sa.String(10), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("type IN ('INCOME', 'EXPENSE')", name='check_category_type')
    )

    # === TRANSACTIONS TABLE (High Volume) ===
    op.create_table(
        'transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('family_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('amount_original', sa.Numeric(19, 4), nullable=False),
        sa.Column('currency_code', sa.String(3), nullable=False, server_default='MXN'),
        sa.Column('exchange_rate', sa.Numeric(10, 6), nullable=False, server_default='1.0'),
        sa.Column('amount_base', sa.Numeric(19, 4), nullable=False),
        sa.Column('trx_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('type', sa.String(10), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('attachment_url', sa.String(1024), nullable=True),
        sa.Column('attachment_thumb_url', sa.String(1024), nullable=True),
        sa.Column('sync_id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['family_id'], ['families.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='SET NULL'),
        sa.CheckConstraint("type IN ('INCOME', 'EXPENSE', 'DEBT', 'SAVING')", name='check_transaction_type')
    )
    op.create_index('ix_transactions_family_id', 'transactions', ['family_id'])
    op.create_index('ix_transactions_trx_date', 'transactions', ['trx_date'])
    op.create_index('ix_transactions_amount_base', 'transactions', ['amount_base'])
    op.create_index('ix_transactions_type', 'transactions', ['type'])
    op.create_index('ix_transactions_sync_id', 'transactions', ['sync_id'], unique=True)
    op.create_index('ix_transactions_family_date', 'transactions', ['family_id', 'trx_date'])

    # === DEBTS TABLE ===
    op.create_table(
        'debts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('family_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('creditor', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('debt_type', sa.String(20), nullable=False, server_default='PERSONAL'),
        sa.Column('total_amount', sa.Numeric(19, 4), nullable=False),
        sa.Column('current_balance', sa.Numeric(19, 4), nullable=False),
        sa.Column('currency_code', sa.String(3), nullable=False, server_default='MXN'),
        sa.Column('exchange_rate_fixed', sa.Numeric(10, 6), nullable=False, server_default='1.0'),
        sa.Column('interest_rate', sa.Numeric(5, 2), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['family_id'], ['families.id'], ondelete='CASCADE'),
        sa.CheckConstraint("debt_type IN ('BANK', 'PERSONAL', 'SERVICE')", name='check_debt_type')
    )
    op.create_index('ix_debts_family_id', 'debts', ['family_id'])

    # === DEBT PAYMENTS TABLE (Immutable - BR-004) ===
    op.create_table(
        'debt_payments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('debt_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.Numeric(19, 4), nullable=False),
        sa.Column('payment_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_adjustment', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['debt_id'], ['debts.id'], ondelete='CASCADE')
    )
    op.create_index('ix_debt_payments_debt_id', 'debt_payments', ['debt_id'])

    # === GOALS TABLE ===
    op.create_table(
        'goals',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('family_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(50), nullable=False, server_default='piggy_bank'),
        sa.Column('target_amount', sa.Numeric(19, 4), nullable=False),
        sa.Column('current_saved', sa.Numeric(19, 4), nullable=False, server_default='0'),
        sa.Column('currency_code', sa.String(3), nullable=False, server_default='MXN'),
        sa.Column('deadline', sa.DateTime(timezone=True), nullable=True),
        sa.Column('goal_type', sa.String(10), nullable=False, server_default='FAMILY'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['family_id'], ['families.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.CheckConstraint("goal_type IN ('FAMILY', 'PERSONAL')", name='check_goal_type')
    )
    op.create_index('ix_goals_family_id', 'goals', ['family_id'])

    # === GOAL CONTRIBUTIONS TABLE ===
    op.create_table(
        'goal_contributions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('goal_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('amount', sa.Numeric(19, 4), nullable=False),
        sa.Column('contribution_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_withdrawal', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL')
    )
    op.create_index('ix_goal_contributions_goal_id', 'goal_contributions', ['goal_id'])

    # === SEED DEFAULT CATEGORIES ===
    op.execute("""
        INSERT INTO categories (name, icon, type) VALUES
        ('Salario', 'work', 'INCOME'),
        ('Freelance', 'laptop', 'INCOME'),
        ('Inversiones', 'trending_up', 'INCOME'),
        ('Otros ingresos', 'attach_money', 'INCOME'),
        ('Supermercado', 'shopping_cart', 'EXPENSE'),
        ('Restaurantes', 'restaurant', 'EXPENSE'),
        ('Transporte', 'directions_car', 'EXPENSE'),
        ('Servicios', 'receipt', 'EXPENSE'),
        ('Entretenimiento', 'movie', 'EXPENSE'),
        ('Salud', 'local_hospital', 'EXPENSE'),
        ('Educación', 'school', 'EXPENSE'),
        ('Ropa', 'checkroom', 'EXPENSE'),
        ('Hogar', 'home', 'EXPENSE'),
        ('Otros gastos', 'more_horiz', 'EXPENSE');
    """)


def downgrade() -> None:
    op.drop_table('goal_contributions')
    op.drop_table('goals')
    op.drop_table('debt_payments')
    op.drop_table('debts')
    op.drop_table('transactions')
    op.drop_table('categories')
    op.drop_table('users')
    op.drop_table('families')
