"""
Goals endpoints: Savings goals management ("Cochinitos").
"""

from typing import List
import uuid

from fastapi import APIRouter, HTTPException, status

from src.api.v1.dependencies import CurrentUser, DbSession
from src.domain.schemas import (
    GoalCreate,
    GoalUpdate,
    GoalResponse,
    ContributionCreate,
    ContributionResponse,
    GoalWithContributions,
)
from src.services.goal_service import GoalService

router = APIRouter(prefix="/goals", tags=["Goals (Savings)"])


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    data: GoalCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> GoalResponse:
    """Create a new savings goal ("Cochinito")."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = GoalService(db)
    goal = await service.create_goal(
        data=data,
        family_id=current_user.family_id,
        user_id=current_user.id,
    )

    return goal


@router.get("", response_model=List[GoalResponse])
async def list_goals(
    current_user: CurrentUser,
    db: DbSession,
    include_inactive: bool = False,
) -> List[GoalResponse]:
    """
    List all savings goals.
    Personal goals are only visible to their creator (BR-003).
    """
    if not current_user.family_id:
        return []

    service = GoalService(db)
    goals = await service.list_goals(
        family_id=current_user.family_id,
        user_id=current_user.id,
        include_inactive=include_inactive,
    )

    return goals


@router.get("/{goal_id}", response_model=GoalWithContributions)
async def get_goal(
    goal_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> GoalWithContributions:
    """Get a specific goal with contribution history."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = GoalService(db)
    goal = await service.get_goal(
        goal_id=goal_id,
        family_id=current_user.family_id,
        user_id=current_user.id,
    )

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    # Get contributions
    contributions = await service.get_contributions(goal_id=goal_id)

    return GoalWithContributions(
        id=goal.id,
        family_id=goal.family_id,
        created_by=goal.created_by,
        name=goal.name,
        description=goal.description,
        icon=goal.icon,
        target_amount=goal.target_amount,
        current_saved=goal.current_saved,
        currency_code=goal.currency_code,
        deadline=goal.deadline,
        goal_type=goal.goal_type,
        is_active=goal.is_active,
        progress_percentage=goal.progress_percentage,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        contributions=contributions,
    )


@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: uuid.UUID,
    data: GoalUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> GoalResponse:
    """Update a savings goal."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = GoalService(db)
    goal = await service.get_goal(
        goal_id=goal_id,
        family_id=current_user.family_id,
        user_id=current_user.id,
    )

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    updated = await service.update_goal(goal, data)
    return updated


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    """Soft delete a savings goal."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = GoalService(db)
    goal = await service.get_goal(
        goal_id=goal_id,
        family_id=current_user.family_id,
        user_id=current_user.id,
    )

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    await service.delete_goal(goal)


@router.post("/{goal_id}/contributions", response_model=ContributionResponse, status_code=status.HTTP_201_CREATED)
async def add_contribution(
    goal_id: uuid.UUID,
    data: ContributionCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> ContributionResponse:
    """
    Add a contribution (deposit or withdrawal) to a goal.
    Withdrawal requires double confirmation on frontend (BR-003).
    """
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = GoalService(db)
    goal = await service.get_goal(
        goal_id=goal_id,
        family_id=current_user.family_id,
        user_id=current_user.id,
    )

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    # Validate withdrawal doesn't exceed balance
    if data.is_withdrawal and data.amount > goal.current_saved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Withdrawal amount exceeds current savings",
        )

    contribution = await service.add_contribution(
        goal=goal,
        data=data,
        user_id=current_user.id,
    )

    return contribution


@router.get("/{goal_id}/contributions", response_model=List[ContributionResponse])
async def list_contributions(
    goal_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
    limit: int = 50,
) -> List[ContributionResponse]:
    """Get contribution history for a goal."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = GoalService(db)
    goal = await service.get_goal(
        goal_id=goal_id,
        family_id=current_user.family_id,
        user_id=current_user.id,
    )

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    contributions = await service.get_contributions(goal_id=goal_id, limit=limit)
    return contributions
