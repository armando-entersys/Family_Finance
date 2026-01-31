"""
API v1 endpoints.
"""

from .auth import router as auth_router
from .trx import router as trx_router
from .stats import router as stats_router
from .goals import router as goals_router
from .debts import router as debts_router
from .settings import router as settings_router
from .recurring_expenses import router as recurring_expenses_router
from .category_budgets import router as category_budgets_router

__all__ = [
    "auth_router",
    "trx_router",
    "stats_router",
    "goals_router",
    "debts_router",
    "settings_router",
    "recurring_expenses_router",
    "category_budgets_router",
]
