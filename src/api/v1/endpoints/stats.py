"""
Statistics endpoints: Dashboard aggregations.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from src.api.v1.dependencies import CurrentUser, DbSession
from src.services.trx_service import TransactionService

router = APIRouter(prefix="/stats", tags=["Statistics"])


class FinancialSummary(BaseModel):
    """Schema for financial summary response."""

    income: Decimal
    expense: Decimal
    debt: Decimal
    saving: Decimal
    balance: Decimal
    currency: str = "MXN"


class MemberSummary(BaseModel):
    """Schema for per-member financial summary."""

    user_id: str
    user_name: str
    income: Decimal
    expense: Decimal
    balance: Decimal
    transaction_count: int


class PeriodComparison(BaseModel):
    """Schema for period-over-period comparison."""

    current: FinancialSummary
    previous: FinancialSummary
    income_change_pct: float
    expense_change_pct: float
    savings_rate: float


class ReportsResponse(BaseModel):
    """Schema for complete reports data."""

    summary: FinancialSummary
    comparison: PeriodComparison
    members: list[MemberSummary]
    recent_transactions_count: int


class DashboardResponse(BaseModel):
    """Schema for dashboard data."""

    summary: FinancialSummary
    recent_transactions_count: int


@router.get("/summary", response_model=FinancialSummary)
async def get_financial_summary(
    current_user: CurrentUser,
    db: DbSession,
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
) -> FinancialSummary:
    """
    Get financial summary for the current user's family.
    Returns totals by type in base currency.
    """
    if not current_user.family_id:
        return FinancialSummary(
            income=Decimal("0"),
            expense=Decimal("0"),
            debt=Decimal("0"),
            saving=Decimal("0"),
            balance=Decimal("0"),
        )

    service = TransactionService(db)
    summary = await service.get_summary(
        family_id=current_user.family_id,
        date_from=date_from,
        date_to=date_to,
    )

    return FinancialSummary(
        income=summary["INCOME"],
        expense=summary["EXPENSE"],
        debt=summary["DEBT"],
        saving=summary["SAVING"],
        balance=summary["balance"],
    )


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    current_user: CurrentUser,
    db: DbSession,
) -> DashboardResponse:
    """
    Get dashboard data including summary and transaction count.
    """
    if not current_user.family_id:
        return DashboardResponse(
            summary=FinancialSummary(
                income=Decimal("0"),
                expense=Decimal("0"),
                debt=Decimal("0"),
                saving=Decimal("0"),
                balance=Decimal("0"),
            ),
            recent_transactions_count=0,
        )

    service = TransactionService(db)

    # Get summary
    summary_data = await service.get_summary(family_id=current_user.family_id)

    # Get recent transaction count
    _, total = await service.list_transactions(
        family_id=current_user.family_id,
        page=1,
        size=1,
    )

    return DashboardResponse(
        summary=FinancialSummary(
            income=summary_data["INCOME"],
            expense=summary_data["EXPENSE"],
            debt=summary_data["DEBT"],
            saving=summary_data["SAVING"],
            balance=summary_data["balance"],
        ),
        recent_transactions_count=total,
    )


@router.get("/reports", response_model=ReportsResponse)
async def get_reports(
    current_user: CurrentUser,
    db: DbSession,
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    category_id: Optional[int] = Query(None),
) -> ReportsResponse:
    """
    Get complete reports data including summary, period comparison,
    and per-member breakdown. Defaults to current month if no dates provided.
    """
    empty_summary = FinancialSummary(
        income=Decimal("0"),
        expense=Decimal("0"),
        debt=Decimal("0"),
        saving=Decimal("0"),
        balance=Decimal("0"),
    )

    if not current_user.family_id:
        return ReportsResponse(
            summary=empty_summary,
            comparison=PeriodComparison(
                current=empty_summary,
                previous=empty_summary,
                income_change_pct=0.0,
                expense_change_pct=0.0,
                savings_rate=0.0,
            ),
            members=[],
            recent_transactions_count=0,
        )

    # Default to current month
    now = datetime.utcnow()
    if not date_from:
        date_from = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if not date_to:
        date_to = now

    service = TransactionService(db)

    # Get comparison (includes current summary)
    comparison_data = await service.get_summary_with_comparison(
        family_id=current_user.family_id,
        date_from=date_from,
        date_to=date_to,
        category_id=category_id,
    )

    current_summary = comparison_data["current"]
    previous_summary = comparison_data["previous"]

    summary = FinancialSummary(
        income=current_summary["INCOME"],
        expense=current_summary["EXPENSE"],
        debt=current_summary["DEBT"],
        saving=current_summary["SAVING"],
        balance=current_summary["balance"],
    )

    comparison = PeriodComparison(
        current=summary,
        previous=FinancialSummary(
            income=previous_summary["INCOME"],
            expense=previous_summary["EXPENSE"],
            debt=previous_summary["DEBT"],
            saving=previous_summary["SAVING"],
            balance=previous_summary["balance"],
        ),
        income_change_pct=comparison_data["income_change_pct"],
        expense_change_pct=comparison_data["expense_change_pct"],
        savings_rate=comparison_data["savings_rate"],
    )

    # Get member breakdown
    members_data = await service.get_member_summary(
        family_id=current_user.family_id,
        date_from=date_from,
        date_to=date_to,
        category_id=category_id,
    )

    members = [
        MemberSummary(**m) for m in members_data
    ]

    # Get transaction count for period
    _, total = await service.list_transactions(
        family_id=current_user.family_id,
        page=1,
        size=1,
    )

    return ReportsResponse(
        summary=summary,
        comparison=comparison,
        members=members,
        recent_transactions_count=total,
    )
