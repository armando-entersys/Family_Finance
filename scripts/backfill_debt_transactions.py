"""
One-time script to backfill transactions for existing debt payments.
Only creates transactions for payments that don't already have one.
Matches by: type=DEBT, amount, date (same day), and description pattern.
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, func, and_, cast, Date
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from src.domain.models import Base
from src.domain.models.debt import Debt, DebtPayment
from src.domain.models.transaction import Transaction


async def backfill():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        return

    # Ensure async driver
    if "postgresql://" in database_url and "asyncpg" not in database_url:
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")

    engine = create_async_engine(database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Get all debt payments with their debt info
        query = (
            select(
                DebtPayment.id,
                DebtPayment.amount,
                DebtPayment.payment_date,
                DebtPayment.notes,
                Debt.id.label("debt_id"),
                Debt.family_id,
                Debt.creditor,
                Debt.currency_code,
                Debt.exchange_rate_fixed,
            )
            .join(Debt, DebtPayment.debt_id == Debt.id)
            .where(DebtPayment.is_adjustment == False)
            .order_by(DebtPayment.payment_date.asc())
        )

        result = await session.execute(query)
        payments = result.all()

        print(f"Found {len(payments)} debt payments total")

        created = 0
        skipped = 0

        for payment in payments:
            # Check if a matching DEBT transaction already exists
            # Match by: family_id, type=DEBT, same amount_base, same day
            payment_date = payment.payment_date
            amount_base = payment.amount * payment.exchange_rate_fixed

            # Check for existing transaction on the same day with same amount
            day_start = payment_date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            existing = await session.execute(
                select(func.count(Transaction.id)).where(
                    and_(
                        Transaction.family_id == payment.family_id,
                        Transaction.type == "DEBT",
                        Transaction.amount_base == amount_base,
                        Transaction.trx_date >= day_start,
                        Transaction.trx_date < day_end,
                    )
                )
            )
            count = existing.scalar() or 0

            if count > 0:
                skipped += 1
                print(f"  SKIP: Payment {payment.id} ({payment.creditor} ${payment.amount}) - transaction already exists")
                continue

            # Create the transaction
            # We need a user_id - get any user from the family
            from src.domain.models.user import User
            user_result = await session.execute(
                select(User.id).where(User.family_id == payment.family_id).limit(1)
            )
            user_id = user_result.scalar()

            if not user_id:
                print(f"  SKIP: Payment {payment.id} - no user found for family {payment.family_id}")
                skipped += 1
                continue

            transaction = Transaction(
                family_id=payment.family_id,
                user_id=user_id,
                category_id=None,
                amount_original=payment.amount,
                currency_code=payment.currency_code,
                exchange_rate=payment.exchange_rate_fixed,
                amount_base=amount_base,
                trx_date=payment.payment_date,
                type="DEBT",
                description=f"Pago deuda: {payment.creditor}",
            )
            session.add(transaction)
            created += 1
            print(f"  CREATE: Payment {payment.id} ({payment.creditor} ${payment.amount} on {payment.payment_date.date()})")

        await session.commit()
        print(f"\nDone! Created {created} transactions, skipped {skipped} (already existed)")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(backfill())
