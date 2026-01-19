"""
Goal service - Business logic for savings goals ("Cochinitos").
"""

from decimal import Decimal
from typing import List, Optional, Tuple
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import Goal, GoalContribution
from src.domain.schemas import GoalCreate, GoalUpdate, ContributionCreate


class GoalService:
    """Service class for savings goal operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_goal(
        self,
        data: GoalCreate,
        family_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Goal:
        """Create a new savings goal."""
        goal = Goal(
            family_id=family_id,
            created_by=user_id,
            name=data.name,
            description=data.description,
            icon=data.icon,
            target_amount=data.target_amount,
            currency_code=data.currency_code,
            deadline=data.deadline,
            goal_type=data.goal_type,
            current_saved=Decimal("0"),
        )

        self.db.add(goal)
        await self.db.flush()
        await self.db.refresh(goal)

        return goal

    async def get_goal(
        self,
        goal_id: uuid.UUID,
        family_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None,
    ) -> Optional[Goal]:
        """
        Get a goal by ID, scoped to family.
        Respects BR-003: Personal goals only visible to creator.
        """
        query = select(Goal).where(
            Goal.id == goal_id,
            Goal.family_id == family_id,
            Goal.is_active == True,
        )

        result = await self.db.execute(query)
        goal = result.scalar_one_or_none()

        # BR-003: Check visibility for personal goals
        if goal and goal.goal_type == "PERSONAL" and goal.created_by != user_id:
            return None

        return goal

    async def list_goals(
        self,
        family_id: uuid.UUID,
        user_id: uuid.UUID,
        include_inactive: bool = False,
    ) -> List[Goal]:
        """
        List all goals for a family.
        Personal goals only shown to their creator (BR-003).
        """
        query = select(Goal).where(Goal.family_id == family_id)

        if not include_inactive:
            query = query.where(Goal.is_active == True)

        # Filter: Show FAMILY goals + user's own PERSONAL goals
        from sqlalchemy import or_
        query = query.where(
            or_(
                Goal.goal_type == "FAMILY",
                Goal.created_by == user_id,
            )
        )

        query = query.order_by(Goal.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_goal(
        self,
        goal: Goal,
        data: GoalUpdate,
    ) -> Goal:
        """Update an existing goal."""
        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(goal, field, value)

        await self.db.flush()
        await self.db.refresh(goal)

        return goal

    async def delete_goal(self, goal: Goal) -> None:
        """Soft delete a goal (set is_active = False)."""
        goal.is_active = False
        await self.db.flush()

    async def add_contribution(
        self,
        goal: Goal,
        data: ContributionCreate,
        user_id: uuid.UUID,
    ) -> GoalContribution:
        """
        Add a contribution to a goal.
        Updates goal's current_saved amount.
        """
        contribution = GoalContribution(
            goal_id=goal.id,
            user_id=user_id,
            amount=data.amount,
            is_withdrawal=data.is_withdrawal,
            notes=data.notes,
        )

        self.db.add(contribution)

        # Update goal balance
        if data.is_withdrawal:
            goal.current_saved -= data.amount
            if goal.current_saved < 0:
                goal.current_saved = Decimal("0")
        else:
            goal.current_saved += data.amount

        await self.db.flush()
        await self.db.refresh(contribution)

        return contribution

    async def get_contributions(
        self,
        goal_id: uuid.UUID,
        limit: int = 50,
    ) -> List[GoalContribution]:
        """Get contribution history for a goal."""
        query = (
            select(GoalContribution)
            .where(GoalContribution.goal_id == goal_id)
            .order_by(GoalContribution.contribution_date.desc())
            .limit(limit)
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_total_savings(
        self,
        family_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Decimal:
        """Get total savings across all visible goals."""
        query = select(func.sum(Goal.current_saved)).where(
            Goal.family_id == family_id,
            Goal.is_active == True,
        )

        # Include FAMILY + user's PERSONAL goals
        from sqlalchemy import or_
        query = query.where(
            or_(
                Goal.goal_type == "FAMILY",
                Goal.created_by == user_id,
            )
        )

        result = await self.db.execute(query)
        total = result.scalar()

        return total or Decimal("0")
