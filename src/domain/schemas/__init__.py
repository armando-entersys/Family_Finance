"""
Pydantic schemas (DTOs) for request/response validation.
"""

from .auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    TokenRefresh,
    UserResponse,
    UserWithFamily,
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
    FamilySettingsUpdate,
    FamilySettingsResponse,
    FamilyInvite,
    FamilyMemberResponse,
)

__all__ = [
    # Auth
    "UserRegister",
    "UserLogin",
    "TokenResponse",
    "TokenRefresh",
    "UserResponse",
    "UserWithFamily",
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
    "FamilySettingsUpdate",
    "FamilySettingsResponse",
    "FamilyInvite",
    "FamilyMemberResponse",
]
