"""
Recurring Expenses endpoints: Scheduled expense management.
"""

from typing import List
import uuid

from fastapi import APIRouter, HTTPException, status

from src.api.v1.dependencies import CurrentUser, DbSession
from src.domain.schemas import (
    RecurringExpenseCreate,
    RecurringExpenseUpdate,
    RecurringExpenseResponse,
    RecurringExpenseExecute,
    TransactionResponse,
)
from src.domain.schemas.recurring_expense import AutoExecuteResponse
from src.services.recurring_expense_service import RecurringExpenseService

router = APIRouter(prefix="/recurring-expenses", tags=["Recurring Expenses"])


@router.post("", response_model=RecurringExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_recurring_expense(
    data: RecurringExpenseCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> RecurringExpenseResponse:
    """Create a new recurring expense."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = RecurringExpenseService(db)
    expense = await service.create_recurring_expense(
        data=data,
        family_id=current_user.family_id,
    )

    return expense


@router.get("", response_model=List[RecurringExpenseResponse])
async def list_recurring_expenses(
    current_user: CurrentUser,
    db: DbSession,
    include_inactive: bool = False,
) -> List[RecurringExpenseResponse]:
    """List all recurring expenses."""
    if not current_user.family_id:
        return []

    service = RecurringExpenseService(db)
    expenses = await service.list_recurring_expenses(
        family_id=current_user.family_id,
        include_inactive=include_inactive,
    )

    return expenses


@router.get("/due", response_model=List[RecurringExpenseResponse])
async def list_due_expenses(
    current_user: CurrentUser,
    db: DbSession,
) -> List[RecurringExpenseResponse]:
    """List all recurring expenses that are due (pending execution)."""
    if not current_user.family_id:
        return []

    service = RecurringExpenseService(db)
    expenses = await service.get_due_expenses(
        family_id=current_user.family_id,
    )

    return expenses


@router.post("/auto-execute", response_model=AutoExecuteResponse)
async def auto_execute_recurring(
    current_user: CurrentUser,
    db: DbSession,
) -> AutoExecuteResponse:
    """
    Auto-execute all due recurring expenses that are marked as automatic.
    Called on app load to catch up on any missed executions.
    """
    if not current_user.family_id:
        return AutoExecuteResponse(executed_count=0, transactions_created=0)

    service = RecurringExpenseService(db)
    transactions = await service.auto_execute_due(
        family_id=current_user.family_id,
        user_id=current_user.id,
    )

    return AutoExecuteResponse(
        executed_count=len(set(t.description for t in transactions)),
        transactions_created=len(transactions),
    )


@router.get("/{expense_id}", response_model=RecurringExpenseResponse)
async def get_recurring_expense(
    expense_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> RecurringExpenseResponse:
    """Get a specific recurring expense."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = RecurringExpenseService(db)
    expense = await service.get_recurring_expense(
        expense_id=expense_id,
        family_id=current_user.family_id,
    )

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring expense not found",
        )

    return expense


@router.patch("/{expense_id}", response_model=RecurringExpenseResponse)
async def update_recurring_expense(
    expense_id: uuid.UUID,
    data: RecurringExpenseUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> RecurringExpenseResponse:
    """Update a recurring expense."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = RecurringExpenseService(db)
    expense = await service.get_recurring_expense(
        expense_id=expense_id,
        family_id=current_user.family_id,
    )

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring expense not found",
        )

    updated = await service.update_recurring_expense(expense, data)
    return updated


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recurring_expense(
    expense_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    """Soft delete a recurring expense."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = RecurringExpenseService(db)
    expense = await service.get_recurring_expense(
        expense_id=expense_id,
        family_id=current_user.family_id,
    )

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring expense not found",
        )

    await service.delete_recurring_expense(expense)


@router.post("/{expense_id}/execute", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def execute_recurring_expense(
    expense_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
    data: RecurringExpenseExecute = None,
) -> TransactionResponse:
    """
    Execute a recurring expense manually.
    Creates a transaction and updates the next due date.
    """
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = RecurringExpenseService(db)
    expense = await service.get_recurring_expense(
        expense_id=expense_id,
        family_id=current_user.family_id,
    )

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring expense not found",
        )

    if not expense.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot execute inactive recurring expense",
        )

    transaction = await service.execute_recurring_expense(
        expense=expense,
        user_id=current_user.id,
        data=data,
    )

    return transaction
