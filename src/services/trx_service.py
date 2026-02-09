"""
Transaction service - Business logic for financial operations.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, Tuple
import re
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.domain.models import Transaction
from src.domain.models.debt import Debt
from src.domain.models.recurring_expense import RecurringExpense
from src.domain.models.user import User
from src.domain.schemas import TransactionCreate, TransactionFilter, TransactionUpdate


class TransactionService:
    """Service class for transaction operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_transaction(
        self,
        data: TransactionCreate,
        family_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Transaction:
        """
        Create a new transaction.
        Calculates amount_base from original amount and exchange rate.
        """
        # Calculate base amount
        amount_base = data.amount_original * data.exchange_rate

        # Generate sync_id if not provided (for idempotency)
        sync_id = data.sync_id or uuid.uuid4()

        transaction = Transaction(
            family_id=family_id,
            user_id=user_id,
            category_id=data.category_id,
            amount_original=data.amount_original,
            currency_code=data.currency_code,
            exchange_rate=data.exchange_rate,
            amount_base=amount_base,
            trx_date=data.trx_date or datetime.utcnow(),
            type=data.type,
            description=data.description,
            sync_id=sync_id,
        )

        self.db.add(transaction)
        await self.db.flush()
        await self.db.refresh(transaction)

        return transaction

    async def get_transaction(
        self,
        transaction_id: uuid.UUID,
        family_id: uuid.UUID,
    ) -> Optional[Transaction]:
        """Get a transaction by ID, scoped to family."""
        result = await self.db.execute(
            select(Transaction)
            .options(selectinload(Transaction.user))
            .where(
                Transaction.id == transaction_id,
                Transaction.family_id == family_id,
            )
        )
        return result.scalar_one_or_none()

    async def update_transaction(
        self,
        transaction: Transaction,
        data: TransactionUpdate,
    ) -> Transaction:
        """Update an existing transaction."""
        update_data = data.model_dump(exclude_unset=True)

        # Recalculate amount_base if amount or rate changed
        if "amount_original" in update_data or "exchange_rate" in update_data:
            amount = update_data.get("amount_original", transaction.amount_original)
            rate = update_data.get("exchange_rate", transaction.exchange_rate)
            update_data["amount_base"] = amount * rate

        for field, value in update_data.items():
            setattr(transaction, field, value)

        await self.db.flush()
        await self.db.refresh(transaction)

        return transaction

    async def delete_transaction(
        self,
        transaction: Transaction,
    ) -> None:
        """
        Delete a transaction.
        If DEBT type: restore balance on the corresponding debt.
        If EXPENSE type from recurring: revert recurring expense next_due_date.
        """
        # Reverse debt payment if applicable
        if transaction.type == "DEBT" and transaction.description and transaction.description.startswith("Pago deuda: "):
            # Try to extract debt ID from description (format: "Pago deuda: Creditor [debt-uuid]")
            debt_id_match = re.search(r'\[([a-f0-9-]+)\]', transaction.description)
            if debt_id_match:
                result = await self.db.execute(
                    select(Debt).where(Debt.id == debt_id_match.group(1)).limit(1)
                )
            else:
                # Fallback for old transactions without debt ID
                creditor = transaction.description.replace("Pago deuda: ", "")
                result = await self.db.execute(
                    select(Debt).where(
                        Debt.family_id == transaction.family_id,
                        Debt.creditor == creditor,
                    ).limit(1)
                )
            debt = result.scalars().first()
            if debt:
                new_balance = debt.current_balance + transaction.amount_original
                update_values = {"current_balance": new_balance}
                if debt.is_archived and new_balance > 0:
                    update_values["is_archived"] = False
                await self.db.execute(
                    update(Debt).where(Debt.id == debt.id).values(**update_values)
                )

        # Reverse recurring expense execution if applicable
        if transaction.type == "EXPENSE" and transaction.description:
            result = await self.db.execute(
                select(RecurringExpense).where(
                    RecurringExpense.family_id == transaction.family_id,
                    RecurringExpense.name == transaction.description,
                    RecurringExpense.amount == transaction.amount_original,
                    RecurringExpense.is_active == True,
                ).limit(1)
            )
            recurring = result.scalars().first()
            if recurring:
                # Revert next_due_date one period back
                reverted_date = self._revert_due_date(
                    recurring.next_due_date,
                    recurring.frequency,
                )
                await self.db.execute(
                    update(RecurringExpense)
                    .where(RecurringExpense.id == recurring.id)
                    .values(next_due_date=reverted_date, last_executed_date=None)
                )

        await self.db.delete(transaction)
        await self.db.flush()

    def _revert_due_date(self, current_next: datetime, frequency: str):
        """Calculate the previous due date (reverse of advancing one period)."""
        from datetime import date as date_type
        d = current_next if isinstance(current_next, date_type) else current_next.date() if hasattr(current_next, 'date') else current_next

        if frequency == "DAILY":
            return d - timedelta(days=1)
        elif frequency == "WEEKLY":
            return d - timedelta(weeks=1)
        elif frequency == "BIWEEKLY":
            return d - timedelta(weeks=2)
        elif frequency == "MONTHLY":
            month = d.month - 1
            year = d.year
            if month < 1:
                month = 12
                year -= 1
            day = min(d.day, 28)  # Safe for all months
            from datetime import date as dt_date
            return dt_date(year, month, day)
        else:
            return d - timedelta(days=30)

    async def list_transactions(
        self,
        family_id: uuid.UUID,
        filters: Optional[TransactionFilter] = None,
        page: int = 1,
        size: int = 50,
    ) -> Tuple[list[Transaction], int]:
        """
        List transactions with filtering and pagination.
        Returns (transactions, total_count).
        """
        query = select(Transaction).options(selectinload(Transaction.user)).where(Transaction.family_id == family_id)

        # Apply filters
        if filters:
            if filters.type:
                query = query.where(Transaction.type == filters.type)
            if filters.category_id:
                query = query.where(Transaction.category_id == filters.category_id)
            if filters.currency_code:
                query = query.where(Transaction.currency_code == filters.currency_code)
            if filters.date_from:
                query = query.where(Transaction.trx_date >= filters.date_from)
            if filters.date_to:
                query = query.where(Transaction.trx_date <= filters.date_to)
            if filters.min_amount:
                query = query.where(Transaction.amount_base >= filters.min_amount)
            if filters.max_amount:
                query = query.where(Transaction.amount_base <= filters.max_amount)
            if filters.search:
                query = query.where(Transaction.description.ilike(f"%{filters.search}%"))
            if filters.user_id:
                query = query.where(Transaction.user_id == filters.user_id)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(Transaction.trx_date.desc())
        query = query.offset((page - 1) * size).limit(size)

        result = await self.db.execute(query)
        transactions = list(result.scalars().all())

        return transactions, total

    async def check_duplicate(
        self,
        family_id: uuid.UUID,
        amount: Decimal,
        trx_date: datetime,
        description: Optional[str] = None,
        type: Optional[str] = None,
    ) -> Optional[Transaction]:
        """
        Check if a similar transaction exists (same family, amount, date, description).
        Returns the existing transaction if found, None otherwise.
        """
        # Check within same day
        day_start = trx_date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        query = (
            select(Transaction)
            .where(
                Transaction.family_id == family_id,
                Transaction.amount_original == amount,
                Transaction.trx_date >= day_start,
                Transaction.trx_date < day_end,
            )
            .limit(1)
        )

        if description:
            query = query.where(Transaction.description == description)
        if type:
            query = query.where(Transaction.type == type)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_summary(
        self,
        family_id: uuid.UUID,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        category_id: Optional[int] = None,
    ) -> dict:
        """
        Get financial summary for a family.
        Returns totals by type in base currency.
        """
        query = select(
            Transaction.type,
            func.sum(Transaction.amount_base).label("total"),
        ).where(Transaction.family_id == family_id)

        if date_from:
            query = query.where(Transaction.trx_date >= date_from)
        if date_to:
            query = query.where(Transaction.trx_date <= date_to)
        if category_id:
            query = query.where(Transaction.category_id == category_id)

        query = query.group_by(Transaction.type)

        result = await self.db.execute(query)
        rows = result.all()

        summary = {
            "INCOME": Decimal("0"),
            "EXPENSE": Decimal("0"),
            "DEBT": Decimal("0"),
            "SAVING": Decimal("0"),
        }

        for row in rows:
            summary[row.type] = row.total or Decimal("0")

        summary["balance"] = summary["INCOME"] - summary["EXPENSE"] - summary["SAVING"]

        return summary

    async def get_member_summary(
        self,
        family_id: uuid.UUID,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        category_id: Optional[int] = None,
    ) -> list[dict]:
        """
        Get financial summary grouped by family member.
        Returns list of {user_id, user_name, income, expense, balance, transaction_count}.
        """
        query = select(
            Transaction.user_id,
            User.name.label("user_name"),
            User.email.label("user_email"),
            Transaction.type,
            func.sum(Transaction.amount_base).label("total"),
            func.count(Transaction.id).label("count"),
        ).join(
            User, Transaction.user_id == User.id, isouter=True
        ).where(
            Transaction.family_id == family_id
        )

        if date_from:
            query = query.where(Transaction.trx_date >= date_from)
        if date_to:
            query = query.where(Transaction.trx_date <= date_to)
        if category_id:
            query = query.where(Transaction.category_id == category_id)

        query = query.group_by(Transaction.user_id, User.name, User.email, Transaction.type)

        result = await self.db.execute(query)
        rows = result.all()

        # Aggregate by user
        members: dict[uuid.UUID, dict] = {}
        for row in rows:
            uid = row.user_id
            if uid not in members:
                # Use name, fallback to email prefix, then "Sin nombre"
                display_name = row.user_name
                if not display_name and row.user_email:
                    display_name = row.user_email.split("@")[0]
                members[uid] = {
                    "user_id": str(uid),
                    "user_name": display_name or "Sin nombre",
                    "income": Decimal("0"),
                    "expense": Decimal("0"),
                    "balance": Decimal("0"),
                    "transaction_count": 0,
                }
            amount = row.total or Decimal("0")
            members[uid]["transaction_count"] += row.count or 0
            if row.type == "INCOME":
                members[uid]["income"] += amount
            elif row.type == "EXPENSE":
                members[uid]["expense"] += amount

        for m in members.values():
            m["balance"] = m["income"] - m["expense"]

        return list(members.values())

    async def get_summary_with_comparison(
        self,
        family_id: uuid.UUID,
        date_from: datetime,
        date_to: datetime,
        category_id: Optional[int] = None,
    ) -> dict:
        """
        Get summary for current period and the previous period of the same duration.
        Returns current summary, previous summary, and percentage changes.
        """
        # Current period
        current = await self.get_summary(
            family_id=family_id,
            date_from=date_from,
            date_to=date_to,
            category_id=category_id,
        )

        # Calculate previous period (same duration)
        duration = date_to - date_from
        prev_to = date_from - timedelta(seconds=1)
        prev_from = prev_to - duration

        previous = await self.get_summary(
            family_id=family_id,
            date_from=prev_from,
            date_to=prev_to,
            category_id=category_id,
        )

        # Calculate percentage changes
        prev_income = float(previous.get("INCOME", 0))
        curr_income = float(current.get("INCOME", 0))
        prev_expense = float(previous.get("EXPENSE", 0))
        curr_expense = float(current.get("EXPENSE", 0))

        income_change_pct = (
            ((curr_income - prev_income) / prev_income * 100)
            if prev_income > 0
            else 0.0
        )
        expense_change_pct = (
            ((curr_expense - prev_expense) / prev_expense * 100)
            if prev_expense > 0
            else 0.0
        )

        savings_rate = (
            ((curr_income - curr_expense) / curr_income * 100)
            if curr_income > 0
            else 0.0
        )

        return {
            "current": current,
            "previous": previous,
            "income_change_pct": round(income_change_pct, 1),
            "expense_change_pct": round(expense_change_pct, 1),
            "savings_rate": round(savings_rate, 1),
        }

    async def update_attachment(
        self,
        transaction: Transaction,
        attachment_url: str,
        thumb_url: Optional[str] = None,
    ) -> Transaction:
        """Update transaction attachment URLs."""
        transaction.attachment_url = attachment_url
        transaction.attachment_thumb_url = thumb_url

        await self.db.flush()
        await self.db.refresh(transaction)

        return transaction
