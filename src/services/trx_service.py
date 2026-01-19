"""
Transaction service - Business logic for financial operations.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Tuple
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import Transaction
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
            select(Transaction).where(
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
        """Delete a transaction."""
        await self.db.delete(transaction)
        await self.db.flush()

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
        query = select(Transaction).where(Transaction.family_id == family_id)

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

    async def get_summary(
        self,
        family_id: uuid.UUID,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
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
