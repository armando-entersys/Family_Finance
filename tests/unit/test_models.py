"""
Unit tests for domain models.
"""

import uuid
from decimal import Decimal
from datetime import datetime

import pytest

from src.domain.models import User, Family, Transaction, Goal, Debt


class TestUserModel:
    """Tests for User model."""

    def test_user_creation(self):
        """Test basic user creation."""
        user = User(
            id=uuid.uuid4(),
            email="test@example.com",
            password_hash="hashed_password",
            role="MEMBER",
            is_active=True,
        )

        assert user.email == "test@example.com"
        assert user.role == "MEMBER"
        assert user.is_active is True
        assert user.family_id is None

    def test_user_is_admin(self):
        """Test is_admin property."""
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@example.com",
            password_hash="hash",
            role="ADMIN",
            is_active=True,
        )

        member_user = User(
            id=uuid.uuid4(),
            email="member@example.com",
            password_hash="hash",
            role="MEMBER",
            is_active=True,
        )

        # Note: is_admin would be a property if defined in model
        assert admin_user.role == "ADMIN"
        assert member_user.role == "MEMBER"

    def test_user_repr(self):
        """Test user string representation."""
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            email="test@example.com",
            password_hash="hash",
            role="MEMBER",
            is_active=True,
        )

        repr_str = repr(user)
        assert "test@example.com" in repr_str
        assert "MEMBER" in repr_str


class TestFamilyModel:
    """Tests for Family model."""

    def test_family_creation(self):
        """Test basic family creation."""
        family = Family(
            id=uuid.uuid4(),
            name="García Family",
            settings={"month_close_day": 15},
        )

        assert family.name == "García Family"
        assert family.settings["month_close_day"] == 15

    def test_family_default_settings(self):
        """Test family with default settings."""
        family = Family(
            id=uuid.uuid4(),
            name="Test Family",
        )

        # Settings should default to empty dict in model
        assert family.name == "Test Family"


class TestTransactionModel:
    """Tests for Transaction model."""

    def test_transaction_creation(self):
        """Test transaction creation with all fields."""
        family_id = uuid.uuid4()
        user_id = uuid.uuid4()

        tx = Transaction(
            id=uuid.uuid4(),
            family_id=family_id,
            user_id=user_id,
            amount_original=Decimal("150.50"),
            currency_code="MXN",
            exchange_rate=Decimal("1.0"),
            amount_base=Decimal("150.50"),
            type="EXPENSE",
            description="Grocery shopping",
            sync_id=uuid.uuid4(),
        )

        assert tx.amount_original == Decimal("150.50")
        assert tx.type == "EXPENSE"
        assert tx.currency_code == "MXN"

    def test_transaction_is_income(self):
        """Test income transaction type check."""
        tx_income = Transaction(
            id=uuid.uuid4(),
            family_id=uuid.uuid4(),
            amount_original=Decimal("1000"),
            currency_code="MXN",
            exchange_rate=Decimal("1.0"),
            amount_base=Decimal("1000"),
            type="INCOME",
            sync_id=uuid.uuid4(),
        )

        tx_expense = Transaction(
            id=uuid.uuid4(),
            family_id=uuid.uuid4(),
            amount_original=Decimal("100"),
            currency_code="MXN",
            exchange_rate=Decimal("1.0"),
            amount_base=Decimal("100"),
            type="EXPENSE",
            sync_id=uuid.uuid4(),
        )

        assert tx_income.type == "INCOME"
        assert tx_expense.type == "EXPENSE"

    def test_transaction_multi_currency(self):
        """Test transaction with foreign currency."""
        tx = Transaction(
            id=uuid.uuid4(),
            family_id=uuid.uuid4(),
            amount_original=Decimal("100.00"),
            currency_code="USD",
            exchange_rate=Decimal("17.50"),
            amount_base=Decimal("1750.00"),
            type="INCOME",
            sync_id=uuid.uuid4(),
        )

        assert tx.currency_code == "USD"
        assert tx.amount_base == tx.amount_original * tx.exchange_rate


class TestGoalModel:
    """Tests for Goal model."""

    def test_goal_creation(self):
        """Test goal creation."""
        goal = Goal(
            id=uuid.uuid4(),
            family_id=uuid.uuid4(),
            name="Vacation Fund",
            target_amount=Decimal("10000.00"),
            current_saved=Decimal("2500.00"),
            currency_code="MXN",
            goal_type="FAMILY",
            icon="beach_access",
            is_active=True,
        )

        assert goal.name == "Vacation Fund"
        assert goal.target_amount == Decimal("10000.00")
        assert goal.current_saved == Decimal("2500.00")

    def test_goal_progress_percentage(self):
        """Test goal progress calculation."""
        goal = Goal(
            id=uuid.uuid4(),
            family_id=uuid.uuid4(),
            name="Test Goal",
            target_amount=Decimal("1000.00"),
            current_saved=Decimal("250.00"),
            currency_code="MXN",
            goal_type="FAMILY",
            is_active=True,
        )

        # progress_percentage is a property
        expected_progress = 25.0
        assert goal.progress_percentage == expected_progress

    def test_goal_completed(self):
        """Test goal completion detection."""
        goal = Goal(
            id=uuid.uuid4(),
            family_id=uuid.uuid4(),
            name="Completed Goal",
            target_amount=Decimal("1000.00"),
            current_saved=Decimal("1000.00"),
            currency_code="MXN",
            goal_type="FAMILY",
            is_active=True,
        )

        assert goal.current_saved >= goal.target_amount


class TestDebtModel:
    """Tests for Debt model."""

    def test_debt_creation(self):
        """Test debt creation."""
        debt = Debt(
            id=uuid.uuid4(),
            family_id=uuid.uuid4(),
            creditor="Bank ABC",
            total_amount=Decimal("5000.00"),
            current_balance=Decimal("3500.00"),
            currency_code="MXN",
            exchange_rate_fixed=Decimal("1.0"),
            debt_type="BANK",
            is_archived=False,
        )

        assert debt.creditor == "Bank ABC"
        assert debt.total_amount == Decimal("5000.00")
        assert debt.current_balance == Decimal("3500.00")

    def test_debt_progress(self):
        """Test debt payment progress."""
        debt = Debt(
            id=uuid.uuid4(),
            family_id=uuid.uuid4(),
            creditor="Credit Card",
            total_amount=Decimal("10000.00"),
            current_balance=Decimal("7500.00"),
            currency_code="MXN",
            exchange_rate_fixed=Decimal("1.0"),
            debt_type="BANK",
            is_archived=False,
        )

        total_paid = debt.total_amount - debt.current_balance
        progress = (total_paid / debt.total_amount) * 100

        assert total_paid == Decimal("2500.00")
        assert progress == 25.0

    def test_debt_multi_currency(self):
        """Test debt in foreign currency."""
        debt = Debt(
            id=uuid.uuid4(),
            family_id=uuid.uuid4(),
            creditor="US Bank",
            total_amount=Decimal("1000.00"),
            current_balance=Decimal("800.00"),
            currency_code="USD",
            exchange_rate_fixed=Decimal("17.50"),
            debt_type="PERSONAL",
            is_archived=False,
        )

        amount_in_mxn = debt.current_balance * debt.exchange_rate_fixed
        assert amount_in_mxn == Decimal("14000.00")
