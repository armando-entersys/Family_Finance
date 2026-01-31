"""
Category Budgets endpoints: Budget management per category.
"""

from typing import List
import uuid

from fastapi import APIRouter, HTTPException, status

from src.api.v1.dependencies import CurrentUser, DbSession
from src.domain.schemas import (
    CategoryBudgetCreate,
    CategoryBudgetUpdate,
    CategoryBudgetResponse,
    CategoryBudgetStatus,
)
from src.services.category_budget_service import CategoryBudgetService

router = APIRouter(prefix="/category-budgets", tags=["Category Budgets"])


@router.post("", response_model=CategoryBudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(
    data: CategoryBudgetCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> CategoryBudgetResponse:
    """Create a new category budget."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = CategoryBudgetService(db)

    # Check if budget already exists for this category
    existing = await service.get_budget_by_category(
        category_id=data.category_id,
        family_id=current_user.family_id,
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Budget already exists for this category",
        )

    budget = await service.create_budget(
        data=data,
        family_id=current_user.family_id,
    )

    return budget


@router.get("", response_model=List[CategoryBudgetResponse])
async def list_budgets(
    current_user: CurrentUser,
    db: DbSession,
) -> List[CategoryBudgetResponse]:
    """List all category budgets."""
    if not current_user.family_id:
        return []

    service = CategoryBudgetService(db)
    budgets = await service.list_budgets(
        family_id=current_user.family_id,
    )

    return budgets


@router.get("/status", response_model=List[CategoryBudgetStatus])
async def get_budgets_status(
    current_user: CurrentUser,
    db: DbSession,
) -> List[CategoryBudgetStatus]:
    """Get all budgets with current spending status."""
    if not current_user.family_id:
        return []

    service = CategoryBudgetService(db)
    statuses = await service.get_all_budget_statuses(
        family_id=current_user.family_id,
    )

    return statuses


@router.get("/{budget_id}", response_model=CategoryBudgetResponse)
async def get_budget(
    budget_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> CategoryBudgetResponse:
    """Get a specific category budget."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = CategoryBudgetService(db)
    budget = await service.get_budget(
        budget_id=budget_id,
        family_id=current_user.family_id,
    )

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )

    return budget


@router.get("/{budget_id}/status", response_model=CategoryBudgetStatus)
async def get_budget_status(
    budget_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> CategoryBudgetStatus:
    """Get a specific budget with current spending status."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = CategoryBudgetService(db)
    budget = await service.get_budget(
        budget_id=budget_id,
        family_id=current_user.family_id,
    )

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )

    status = await service.get_budget_status(budget)
    return status


@router.patch("/{budget_id}", response_model=CategoryBudgetResponse)
async def update_budget(
    budget_id: uuid.UUID,
    data: CategoryBudgetUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> CategoryBudgetResponse:
    """Update a category budget."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = CategoryBudgetService(db)
    budget = await service.get_budget(
        budget_id=budget_id,
        family_id=current_user.family_id,
    )

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )

    updated = await service.update_budget(budget, data)
    return updated


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    """Delete a category budget."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = CategoryBudgetService(db)
    budget = await service.get_budget(
        budget_id=budget_id,
        family_id=current_user.family_id,
    )

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )

    await service.delete_budget(budget)
