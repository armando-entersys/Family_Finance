"""
Category Budget service - Business logic for budget management.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import CategoryBudget, Transaction, Category
from src.domain.schemas import (
    CategoryBudgetCreate,
    CategoryBudgetUpdate,
    CategoryBudgetStatus,
)


class CategoryBudgetService:
    """Service class for category budget operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_budget(
        self,
        data: CategoryBudgetCreate,
        family_id: uuid.UUID,
    ) -> CategoryBudget:
        """Create a new category budget."""
        budget = CategoryBudget(
            family_id=family_id,
            category_id=data.category_id,
            budget_amount=data.budget_amount,
            currency_code=data.currency_code.upper(),
            period=data.period,
            alert_threshold=data.alert_threshold,
        )

        self.db.add(budget)
        await self.db.flush()
        await self.db.refresh(budget)

        return budget

    async def get_budget(
        self,
        budget_id: uuid.UUID,
        family_id: uuid.UUID,
    ) -> Optional[CategoryBudget]:
        """Get a budget by ID, scoped to family."""
        query = select(CategoryBudget).where(
            CategoryBudget.id == budget_id,
            CategoryBudget.family_id == family_id,
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_budget_by_category(
        self,
        category_id: int,
        family_id: uuid.UUID,
    ) -> Optional[CategoryBudget]:
        """Get a budget by category ID, scoped to family."""
        query = select(CategoryBudget).where(
            CategoryBudget.category_id == category_id,
            CategoryBudget.family_id == family_id,
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_budgets(
        self,
        family_id: uuid.UUID,
    ) -> List[CategoryBudget]:
        """List all budgets for a family."""
        query = (
            select(CategoryBudget)
            .where(CategoryBudget.family_id == family_id)
            .order_by(CategoryBudget.created_at.desc())
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_budget(
        self,
        budget: CategoryBudget,
        data: CategoryBudgetUpdate,
    ) -> CategoryBudget:
        """Update an existing budget."""
        update_data = data.model_dump(exclude_unset=True)

        if "currency_code" in update_data and update_data["currency_code"]:
            update_data["currency_code"] = update_data["currency_code"].upper()

        for field, value in update_data.items():
            setattr(budget, field, value)

        await self.db.flush()
        await self.db.refresh(budget)

        return budget

    async def delete_budget(
        self,
        budget: CategoryBudget,
    ) -> None:
        """Delete a budget."""
        await self.db.delete(budget)
        await self.db.flush()

    async def get_budget_status(
        self,
        budget: CategoryBudget,
        as_of_date: Optional[date] = None,
    ) -> CategoryBudgetStatus:
        """
        Get budget status with current spending.
        Calculates spending for the current period (week or month).
        """
        if as_of_date is None:
            as_of_date = date.today()

        # Calculate period start date
        period_start = self._get_period_start(as_of_date, budget.period)

        # Get spent amount for this category in the current period
        spent_amount = await self._get_spent_amount(
            family_id=budget.family_id,
            category_id=budget.category_id,
            period_start=period_start,
            as_of_date=as_of_date,
        )

        # Calculate derived values
        remaining_amount = budget.budget_amount - spent_amount
        percentage_used = float(
            (spent_amount / budget.budget_amount * 100) if budget.budget_amount > 0 else 0
        )
        is_over_budget = spent_amount > budget.budget_amount
        is_alert_triggered = percentage_used >= budget.alert_threshold

        # Get category name
        category_name = await self._get_category_name(budget.category_id)

        return CategoryBudgetStatus(
            id=budget.id,
            family_id=budget.family_id,
            category_id=budget.category_id,
            category_name=category_name,
            budget_amount=budget.budget_amount,
            currency_code=budget.currency_code,
            period=budget.period,
            alert_threshold=budget.alert_threshold,
            spent_amount=spent_amount,
            remaining_amount=remaining_amount,
            percentage_used=round(percentage_used, 2),
            is_over_budget=is_over_budget,
            is_alert_triggered=is_alert_triggered,
            created_at=budget.created_at,
            updated_at=budget.updated_at,
        )

    async def get_all_budget_statuses(
        self,
        family_id: uuid.UUID,
        as_of_date: Optional[date] = None,
    ) -> List[CategoryBudgetStatus]:
        """Get status for all budgets in a family."""
        budgets = await self.list_budgets(family_id)
        statuses = []

        for budget in budgets:
            status = await self.get_budget_status(budget, as_of_date)
            statuses.append(status)

        return statuses

    def _get_period_start(self, as_of_date: date, period: str) -> date:
        """Get the start date of the current period."""
        if period == "WEEKLY":
            # Start of current week (Monday)
            days_since_monday = as_of_date.weekday()
            return as_of_date - timedelta(days=days_since_monday)
        elif period == "MONTHLY":
            # Start of current month
            return date(as_of_date.year, as_of_date.month, 1)
        else:
            # Default to monthly
            return date(as_of_date.year, as_of_date.month, 1)

    async def _get_spent_amount(
        self,
        family_id: uuid.UUID,
        category_id: int,
        period_start: date,
        as_of_date: date,
    ) -> Decimal:
        """Get total spent amount for a category in the given period."""
        period_start_dt = datetime.combine(period_start, datetime.min.time())
        as_of_date_dt = datetime.combine(as_of_date, datetime.max.time())

        query = select(func.sum(Transaction.amount_base)).where(
            Transaction.family_id == family_id,
            Transaction.category_id == category_id,
            Transaction.type == "EXPENSE",
            Transaction.trx_date >= period_start_dt,
            Transaction.trx_date <= as_of_date_dt,
        )

        result = await self.db.execute(query)
        total = result.scalar()

        return total or Decimal("0")

    async def _get_category_name(self, category_id: int) -> Optional[str]:
        """Get category name by ID."""
        query = select(Category.name).where(Category.id == category_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
