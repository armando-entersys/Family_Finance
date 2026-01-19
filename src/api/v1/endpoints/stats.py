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
