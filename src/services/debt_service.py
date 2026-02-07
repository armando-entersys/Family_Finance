"""
Debt service - Business logic for liability management.
Supports multi-currency with exchange rate tracking.
"""

from decimal import Decimal
from typing import Dict, List, Optional
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import Debt, DebtPayment, Transaction
from src.domain.schemas import DebtCreate, DebtUpdate, PaymentCreate


class DebtService:
    """Service class for debt operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_debt(
        self,
        data: DebtCreate,
        family_id: uuid.UUID,
    ) -> Debt:
        """Create a new debt record."""
        debt = Debt(
            family_id=family_id,
            creditor=data.creditor,
            description=data.description,
            debt_type=data.debt_type,
            total_amount=data.total_amount,
            current_balance=data.total_amount,  # Start with full amount
            currency_code=data.currency_code,
            exchange_rate_fixed=data.exchange_rate_fixed,
            interest_rate=data.interest_rate,
            due_date=data.due_date,
        )

        self.db.add(debt)
        await self.db.flush()
        await self.db.refresh(debt)

        return debt

    async def get_debt(
        self,
        debt_id: uuid.UUID,
        family_id: uuid.UUID,
    ) -> Optional[Debt]:
        """Get a debt by ID, scoped to family."""
        result = await self.db.execute(
            select(Debt).where(
                Debt.id == debt_id,
                Debt.family_id == family_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_debts(
        self,
        family_id: uuid.UUID,
        include_archived: bool = False,
    ) -> List[Debt]:
        """List all debts for a family."""
        query = select(Debt).where(Debt.family_id == family_id)

        if not include_archived:
            query = query.where(Debt.is_archived == False)

        query = query.order_by(Debt.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_debt(
        self,
        debt: Debt,
        data: DebtUpdate,
    ) -> Debt:
        """Update an existing debt."""
        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(debt, field, value)

        await self.db.flush()
        await self.db.refresh(debt)

        return debt

    async def add_payment(
        self,
        debt: Debt,
        data: PaymentCreate,
        user_id: uuid.UUID = None,
    ) -> DebtPayment:
        """
        Add a payment to a debt (BR-004: Immutable).
        Payments cannot be deleted, only adjusted.
        Also creates a DEBT transaction so it appears in the transactions list.
        """
        from datetime import datetime

        payment = DebtPayment(
            debt_id=debt.id,
            amount=data.amount,
            payment_date=data.payment_date,
            notes=data.notes,
            is_adjustment=False,
        )

        self.db.add(payment)

        # Update debt balance
        debt.current_balance -= data.amount
        if debt.current_balance < 0:
            debt.current_balance = Decimal("0")

        # Auto-archive if fully paid
        if debt.current_balance == 0:
            debt.is_archived = True

        # Create a transaction so it appears in the transactions list
        if user_id:
            transaction = Transaction(
                family_id=debt.family_id,
                user_id=user_id,
                category_id=None,
                amount_original=data.amount,
                currency_code=debt.currency_code,
                exchange_rate=debt.exchange_rate_fixed,
                amount_base=data.amount * debt.exchange_rate_fixed,
                trx_date=data.payment_date or datetime.utcnow(),
                type="DEBT",
                description=f"Pago deuda: {debt.creditor}",
            )
            self.db.add(transaction)

        await self.db.flush()
        await self.db.refresh(payment)

        return payment

    async def create_adjustment(
        self,
        debt: Debt,
        original_payment_id: uuid.UUID,
        adjustment_amount: Decimal,
        notes: str,
    ) -> DebtPayment:
        """
        Create an adjustment entry for a payment (BR-004).
        Used instead of deleting/modifying original payment.
        """
        adjustment = DebtPayment(
            debt_id=debt.id,
            amount=adjustment_amount,
            notes=f"Adjustment for payment {original_payment_id}: {notes}",
            is_adjustment=True,
        )

        self.db.add(adjustment)

        # Update debt balance (adjustment can be positive or negative)
        debt.current_balance -= adjustment_amount

        # Ensure balance doesn't go negative
        if debt.current_balance < 0:
            debt.current_balance = Decimal("0")

        await self.db.flush()
        await self.db.refresh(adjustment)

        return adjustment

    async def get_payments(
        self,
        debt_id: uuid.UUID,
        limit: int = 100,
    ) -> List[DebtPayment]:
        """Get payment history for a debt."""
        query = (
            select(DebtPayment)
            .where(DebtPayment.debt_id == debt_id)
            .order_by(DebtPayment.payment_date.desc())
            .limit(limit)
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_total_paid(self, debt_id: uuid.UUID) -> Decimal:
        """Calculate total amount paid for a debt."""
        query = select(func.sum(DebtPayment.amount)).where(
            DebtPayment.debt_id == debt_id
        )

        result = await self.db.execute(query)
        total = result.scalar()

        return total or Decimal("0")

    async def get_debt_summary(
        self,
        family_id: uuid.UUID,
        base_currency: str = "MXN",
    ) -> Dict:
        """
        Get summary of all debts.
        Returns totals by type and currency.
        """
        debts = await self.list_debts(family_id, include_archived=False)

        summary = {
            "total_debts": len(debts),
            "total_balance_mxn": Decimal("0"),
            "by_type": {},
            "by_currency": {},
        }

        for debt in debts:
            # Convert to base currency
            amount_in_base = debt.current_balance * debt.exchange_rate_fixed
            summary["total_balance_mxn"] += amount_in_base

            # By type
            if debt.debt_type not in summary["by_type"]:
                summary["by_type"][debt.debt_type] = Decimal("0")
            summary["by_type"][debt.debt_type] += amount_in_base

            # By currency (original amounts)
            if debt.currency_code not in summary["by_currency"]:
                summary["by_currency"][debt.currency_code] = Decimal("0")
            summary["by_currency"][debt.currency_code] += debt.current_balance

        return summary
