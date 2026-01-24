"""
Debts endpoints: Liability management with multi-currency support.
"""

from decimal import Decimal
from typing import List
import uuid

from fastapi import APIRouter, HTTPException, status

from src.api.v1.dependencies import CurrentUser, DbSession
from src.domain.schemas import (
    DebtCreate,
    DebtUpdate,
    DebtResponse,
    PaymentCreate,
    PaymentAdjustment,
    PaymentResponse,
    DebtWithPayments,
    DebtSummary,
)
from src.services.debt_service import DebtService

router = APIRouter(prefix="/debts", tags=["Debts"])


def _debt_to_response(debt, amount_in_base: Decimal = None) -> DebtResponse:
    """Convert Debt model to response schema."""
    if amount_in_base is None:
        amount_in_base = debt.current_balance * debt.exchange_rate_fixed

    return DebtResponse(
        id=debt.id,
        family_id=debt.family_id,
        creditor=debt.creditor,
        description=debt.description,
        debt_type=debt.debt_type,
        total_amount=debt.total_amount,
        current_balance=debt.current_balance,
        currency_code=debt.currency_code,
        exchange_rate_fixed=debt.exchange_rate_fixed,
        amount_in_base_currency=amount_in_base,
        interest_rate=debt.interest_rate,
        is_archived=debt.is_archived,
        due_date=debt.due_date,
        created_at=debt.created_at,
        updated_at=debt.updated_at,
    )


@router.post("", response_model=DebtResponse, status_code=status.HTTP_201_CREATED)
async def create_debt(
    data: DebtCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> DebtResponse:
    """Create a new debt record."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = DebtService(db)
    debt = await service.create_debt(
        data=data,
        family_id=current_user.family_id,
    )

    return _debt_to_response(debt)


@router.get("", response_model=List[DebtResponse])
async def list_debts(
    current_user: CurrentUser,
    db: DbSession,
    include_archived: bool = False,
) -> List[DebtResponse]:
    """List all debts for the family."""
    if not current_user.family_id:
        return []

    service = DebtService(db)
    debts = await service.list_debts(
        family_id=current_user.family_id,
        include_archived=include_archived,
    )

    return [_debt_to_response(d) for d in debts]


@router.get("/summary", response_model=DebtSummary)
async def get_debt_summary(
    current_user: CurrentUser,
    db: DbSession,
) -> DebtSummary:
    """Get summary of all debts."""
    if not current_user.family_id:
        return DebtSummary(
            total_debts=0,
            total_balance_mxn=Decimal("0"),
            by_type={},
            by_currency={},
        )

    service = DebtService(db)
    summary = await service.get_debt_summary(family_id=current_user.family_id)

    return DebtSummary(**summary)


@router.get("/{debt_id}", response_model=DebtWithPayments)
async def get_debt(
    debt_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> DebtWithPayments:
    """Get a specific debt with payment history."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = DebtService(db)
    debt = await service.get_debt(
        debt_id=debt_id,
        family_id=current_user.family_id,
    )

    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Debt not found",
        )

    # Get payments and total
    payments = await service.get_payments(debt_id=debt_id)
    total_paid = await service.get_total_paid(debt_id=debt_id)

    amount_in_base = debt.current_balance * debt.exchange_rate_fixed

    return DebtWithPayments(
        id=debt.id,
        family_id=debt.family_id,
        creditor=debt.creditor,
        description=debt.description,
        debt_type=debt.debt_type,
        total_amount=debt.total_amount,
        current_balance=debt.current_balance,
        currency_code=debt.currency_code,
        exchange_rate_fixed=debt.exchange_rate_fixed,
        amount_in_base_currency=amount_in_base,
        interest_rate=debt.interest_rate,
        is_archived=debt.is_archived,
        due_date=debt.due_date,
        created_at=debt.created_at,
        updated_at=debt.updated_at,
        payments=payments,
        total_paid=total_paid,
    )


@router.patch("/{debt_id}", response_model=DebtResponse)
async def update_debt(
    debt_id: uuid.UUID,
    data: DebtUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> DebtResponse:
    """Update a debt record."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = DebtService(db)
    debt = await service.get_debt(
        debt_id=debt_id,
        family_id=current_user.family_id,
    )

    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Debt not found",
        )

    updated = await service.update_debt(debt, data)
    return _debt_to_response(updated)


@router.post("/{debt_id}/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def add_payment(
    debt_id: uuid.UUID,
    data: PaymentCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> PaymentResponse:
    """
    Add a payment to a debt.
    Payments are immutable (BR-004) - use adjustments for corrections.
    """
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = DebtService(db)
    debt = await service.get_debt(
        debt_id=debt_id,
        family_id=current_user.family_id,
    )

    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Debt not found",
        )

    if debt.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add payment to archived debt",
        )

    payment = await service.add_payment(debt=debt, data=data)
    return payment


@router.post("/{debt_id}/adjustments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_adjustment(
    debt_id: uuid.UUID,
    data: PaymentAdjustment,
    current_user: CurrentUser,
    db: DbSession,
) -> PaymentResponse:
    """
    Create an adjustment entry for a payment (BR-004).
    Used instead of modifying/deleting the original payment.
    """
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = DebtService(db)
    debt = await service.get_debt(
        debt_id=debt_id,
        family_id=current_user.family_id,
    )

    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Debt not found",
        )

    adjustment = await service.create_adjustment(
        debt=debt,
        original_payment_id=data.original_payment_id,
        adjustment_amount=data.adjustment_amount,
        notes=data.notes,
    )

    return adjustment


@router.get("/{debt_id}/payments", response_model=List[PaymentResponse])
async def list_payments(
    debt_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
    limit: int = 100,
) -> List[PaymentResponse]:
    """Get payment history for a debt."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = DebtService(db)
    debt = await service.get_debt(
        debt_id=debt_id,
        family_id=current_user.family_id,
    )

    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Debt not found",
        )

    payments = await service.get_payments(debt_id=debt_id, limit=limit)
    return payments
