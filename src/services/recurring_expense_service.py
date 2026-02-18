"""
Recurring Expense service - Business logic for scheduled expenses.
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import RecurringExpense, Transaction, Debt
from src.domain.schemas import (
    RecurringExpenseCreate,
    RecurringExpenseUpdate,
    RecurringExpenseExecute,
)
from src.domain.schemas.recurring_expense import OverdueDebtConversion


class RecurringExpenseService:
    """Service class for recurring expense operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_recurring_expense(
        self,
        data: RecurringExpenseCreate,
        family_id: uuid.UUID,
    ) -> RecurringExpense:
        """Create a new recurring expense."""
        expense = RecurringExpense(
            family_id=family_id,
            category_id=data.category_id,
            name=data.name,
            description=data.description,
            amount=data.amount,
            currency_code=data.currency_code.upper(),
            frequency=data.frequency,
            next_due_date=data.next_due_date,
            is_automatic=data.is_automatic,
        )

        self.db.add(expense)
        await self.db.flush()
        await self.db.refresh(expense)

        return expense

    async def get_recurring_expense(
        self,
        expense_id: uuid.UUID,
        family_id: uuid.UUID,
    ) -> Optional[RecurringExpense]:
        """Get a recurring expense by ID, scoped to family."""
        query = select(RecurringExpense).where(
            RecurringExpense.id == expense_id,
            RecurringExpense.family_id == family_id,
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_recurring_expenses(
        self,
        family_id: uuid.UUID,
        include_inactive: bool = False,
    ) -> List[RecurringExpense]:
        """List all recurring expenses for a family."""
        query = select(RecurringExpense).where(
            RecurringExpense.family_id == family_id
        )

        if not include_inactive:
            query = query.where(RecurringExpense.is_active == True)

        query = query.order_by(RecurringExpense.next_due_date.asc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_recurring_expense(
        self,
        expense: RecurringExpense,
        data: RecurringExpenseUpdate,
    ) -> RecurringExpense:
        """Update an existing recurring expense."""
        update_data = data.model_dump(exclude_unset=True)

        if "currency_code" in update_data and update_data["currency_code"]:
            update_data["currency_code"] = update_data["currency_code"].upper()

        for field, value in update_data.items():
            setattr(expense, field, value)

        await self.db.flush()
        await self.db.refresh(expense)

        return expense

    async def delete_recurring_expense(
        self,
        expense: RecurringExpense,
    ) -> None:
        """Soft delete a recurring expense (set is_active = False)."""
        expense.is_active = False
        await self.db.flush()

    async def get_due_expenses(
        self,
        family_id: uuid.UUID,
        as_of_date: Optional[date] = None,
    ) -> List[RecurringExpense]:
        """Get all recurring expenses that are due (next_due_date <= as_of_date)."""
        if as_of_date is None:
            as_of_date = date.today()

        query = select(RecurringExpense).where(
            RecurringExpense.family_id == family_id,
            RecurringExpense.is_active == True,
            RecurringExpense.next_due_date <= as_of_date,
        )

        query = query.order_by(RecurringExpense.next_due_date.asc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def auto_execute_due(
        self,
        family_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> list[Transaction]:
        """
        Auto-execute all due recurring expenses that have is_automatic=True.
        Returns list of created transactions.
        """
        query = select(RecurringExpense).where(
            RecurringExpense.family_id == family_id,
            RecurringExpense.is_active == True,
            RecurringExpense.is_automatic == True,
            RecurringExpense.next_due_date <= date.today(),
        )
        result = await self.db.execute(query)
        expenses = list(result.scalars().all())

        created: list[Transaction] = []
        for expense in expenses:
            # Execute each due automatic expense (may be multiple periods behind)
            while expense.next_due_date <= date.today():
                trx = await self.execute_recurring_expense(
                    expense=expense,
                    user_id=user_id,
                )
                created.append(trx)

        return created

    async def execute_recurring_expense(
        self,
        expense: RecurringExpense,
        user_id: uuid.UUID,
        data: Optional[RecurringExpenseExecute] = None,
    ) -> Transaction:
        """
        Execute a recurring expense - creates a transaction and updates next_due_date.
        """
        execution_date = date.today()
        description = expense.name

        if data:
            if data.execution_date:
                execution_date = data.execution_date
            if data.description:
                description = data.description

        # Create transaction
        from datetime import datetime

        transaction = Transaction(
            family_id=expense.family_id,
            user_id=user_id,
            category_id=expense.category_id,
            amount_original=expense.amount,
            currency_code=expense.currency_code,
            exchange_rate=Decimal("1.0"),
            amount_base=expense.amount,
            trx_date=datetime.combine(execution_date, datetime.min.time()),
            type="EXPENSE",
            description=description,
        )

        self.db.add(transaction)

        # Update expense tracking
        expense.last_executed_date = execution_date
        expense.next_due_date = self._calculate_next_due_date(
            expense.next_due_date,
            expense.frequency,
        )

        await self.db.flush()
        await self.db.refresh(transaction)

        return transaction

    async def convert_overdue_to_debts(
        self,
        family_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> list[OverdueDebtConversion]:
        """
        Convert overdue non-automatic recurring expenses into debts.
        An expense is overdue when next_due_date < 1st day of current month.
        """
        today = date.today()
        first_of_month = date(today.year, today.month, 1)

        # Query active, non-automatic expenses with next_due_date before this month
        query = select(RecurringExpense).where(
            RecurringExpense.family_id == family_id,
            RecurringExpense.is_active == True,
            RecurringExpense.is_automatic == False,
            RecurringExpense.next_due_date < first_of_month,
        )
        result = await self.db.execute(query)
        expenses = list(result.scalars().all())

        conversions: list[OverdueDebtConversion] = []

        for expense in expenses:
            # Idempotency: check if a debt already exists for this expense
            debt_description = f"Gasto recurrente vencido: {expense.name} [{expense.id}]"
            existing_query = select(Debt).where(
                Debt.family_id == family_id,
                Debt.description == debt_description,
                Debt.is_archived == False,
            )
            existing_result = await self.db.execute(existing_query)
            if existing_result.scalar_one_or_none() is not None:
                # Already converted, but still advance the date
                while expense.next_due_date < first_of_month:
                    expense.next_due_date = self._calculate_next_due_date(
                        expense.next_due_date, expense.frequency
                    )
                continue

            # Count missed periods
            periods_missed = 0
            temp_date = expense.next_due_date
            while temp_date < first_of_month:
                temp_date = self._calculate_next_due_date(temp_date, expense.frequency)
                periods_missed += 1

            total_amount = expense.amount * periods_missed

            # Create debt
            debt = Debt(
                family_id=family_id,
                creditor=expense.name,
                description=debt_description,
                debt_type="other",
                total_amount=total_amount,
                current_balance=total_amount,
                currency_code=expense.currency_code,
            )
            self.db.add(debt)

            # Advance next_due_date to current or future month
            expense.next_due_date = temp_date

            await self.db.flush()
            await self.db.refresh(debt)

            conversions.append(
                OverdueDebtConversion(
                    recurring_expense_name=expense.name,
                    debt_id=debt.id,
                    total_amount=total_amount,
                    periods_missed=periods_missed,
                )
            )

        await self.db.flush()
        return conversions

    def _calculate_next_due_date(
        self,
        current_date: date,
        frequency: str,
    ) -> date:
        """Calculate the next due date based on frequency."""
        if frequency == "DAILY":
            return current_date + timedelta(days=1)
        elif frequency == "WEEKLY":
            return current_date + timedelta(weeks=1)
        elif frequency == "BIWEEKLY":
            return current_date + timedelta(weeks=2)
        elif frequency == "MONTHLY":
            # Add one month
            month = current_date.month + 1
            year = current_date.year
            if month > 12:
                month = 1
                year += 1
            # Handle edge cases for month-end dates
            day = min(current_date.day, self._days_in_month(year, month))
            return date(year, month, day)
        else:
            # Default to monthly
            return current_date + timedelta(days=30)

    def _days_in_month(self, year: int, month: int) -> int:
        """Get the number of days in a given month."""
        if month in (1, 3, 5, 7, 8, 10, 12):
            return 31
        elif month in (4, 6, 9, 11):
            return 30
        elif month == 2:
            if (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0):
                return 29
            return 28
        return 30
