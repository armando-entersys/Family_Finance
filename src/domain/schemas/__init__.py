"""
Pydantic schemas (DTOs) for request/response validation.
"""

from .auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    TokenRefresh,
    UserResponse,
    UserUpdate,
    UserWithFamily,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from .transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionList,
    TransactionFilter,
)
from .goal import (
    GoalCreate,
    GoalUpdate,
    GoalResponse,
    ContributionCreate,
    ContributionResponse,
    GoalWithContributions,
)
from .debt import (
    DebtCreate,
    DebtUpdate,
    DebtResponse,
    PaymentCreate,
    PaymentAdjustment,
    PaymentResponse,
    DebtWithPayments,
    DebtSummary,
)
from .user_settings import (
    UserSettingsUpdate,
    UserSettingsResponse,
    PasswordChange,
    FamilySettingsUpdate,
    FamilySettingsResponse,
    FamilyNameUpdate,
    FamilyInvite,
    FamilyMemberResponse,
)
from .recurring_expense import (
    RecurringExpenseCreate,
    RecurringExpenseUpdate,
    RecurringExpenseResponse,
    RecurringExpenseExecute,
    OverdueDebtConversion,
    ConvertOverdueResponse,
)
from .category_budget import (
    CategoryBudgetCreate,
    CategoryBudgetUpdate,
    CategoryBudgetResponse,
    CategoryBudgetStatus,
)

__all__ = [
    # Auth
    "UserRegister",
    "UserLogin",
    "TokenResponse",
    "TokenRefresh",
    "UserResponse",
    "UserUpdate",
    "UserWithFamily",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    # Transactions
    "TransactionCreate",
    "TransactionUpdate",
    "TransactionResponse",
    "TransactionList",
    "TransactionFilter",
    # Goals
    "GoalCreate",
    "GoalUpdate",
    "GoalResponse",
    "ContributionCreate",
    "ContributionResponse",
    "GoalWithContributions",
    # Debts
    "DebtCreate",
    "DebtUpdate",
    "DebtResponse",
    "PaymentCreate",
    "PaymentAdjustment",
    "PaymentResponse",
    "DebtWithPayments",
    "DebtSummary",
    # Settings
    "UserSettingsUpdate",
    "UserSettingsResponse",
    "PasswordChange",
    "FamilySettingsUpdate",
    "FamilySettingsResponse",
    "FamilyNameUpdate",
    "FamilyInvite",
    "FamilyMemberResponse",
    # Recurring Expenses
    "RecurringExpenseCreate",
    "RecurringExpenseUpdate",
    "RecurringExpenseResponse",
    "RecurringExpenseExecute",
    "OverdueDebtConversion",
    "ConvertOverdueResponse",
    # Category Budgets
    "CategoryBudgetCreate",
    "CategoryBudgetUpdate",
    "CategoryBudgetResponse",
    "CategoryBudgetStatus",
]
