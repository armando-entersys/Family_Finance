// API Configuration
// Use environment variable or default to production API
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://Family-Finance.scram2k.com';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/v1/auth/login',
  REGISTER: '/api/v1/auth/register',
  REFRESH: '/api/v1/auth/refresh',
  ME: '/api/v1/auth/me',
  COMPLETE_ONBOARDING: '/api/v1/auth/complete-onboarding',
  FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
  RESET_PASSWORD: '/api/v1/auth/reset-password',

  // Transactions
  TRANSACTIONS: '/api/v1/transactions',
  TRANSACTION: (id: string) => `/api/v1/transactions/${id}`,
  TRANSACTION_ATTACHMENT: (id: string) => `/api/v1/transactions/${id}/attachment`,

  // Goals
  GOALS: '/api/v1/goals',
  GOAL: (id: string) => `/api/v1/goals/${id}`,
  GOAL_CONTRIBUTIONS: (id: string) => `/api/v1/goals/${id}/contributions`,

  // Debts
  DEBTS: '/api/v1/debts',
  DEBTS_SUMMARY: '/api/v1/debts/summary',
  DEBT: (id: string) => `/api/v1/debts/${id}`,
  DEBT_PAYMENTS: (id: string) => `/api/v1/debts/${id}/payments`,
  DEBT_ADJUSTMENTS: (id: string) => `/api/v1/debts/${id}/adjustments`,

  // Recurring Expenses
  RECURRING_EXPENSES: '/api/v1/recurring-expenses',
  RECURRING_EXPENSES_DUE: '/api/v1/recurring-expenses/due',
  RECURRING_EXPENSE: (id: string) => `/api/v1/recurring-expenses/${id}`,
  RECURRING_EXPENSE_EXECUTE: (id: string) => `/api/v1/recurring-expenses/${id}/execute`,

  // Category Budgets
  CATEGORY_BUDGETS: '/api/v1/category-budgets',
  CATEGORY_BUDGETS_STATUS: '/api/v1/category-budgets/status',
  CATEGORY_BUDGET: (id: string) => `/api/v1/category-budgets/${id}`,

  // Stats
  STATS_SUMMARY: '/api/v1/stats/summary',
  STATS_DASHBOARD: '/api/v1/stats/dashboard',
  STATS_REPORTS: '/api/v1/stats/reports',

  // Settings
  SETTINGS_USER: '/api/v1/settings/user',
  SETTINGS_USER_PASSWORD: '/api/v1/settings/user/password',
  SETTINGS_FAMILY: '/api/v1/settings/family',
  SETTINGS_FAMILY_MEMBERS: '/api/v1/settings/family/members',
  SETTINGS_FAMILY_INVITE: '/api/v1/settings/family/invite',
  SETTINGS_FAMILY_MEMBER: (id: string) => `/api/v1/settings/family/members/${id}`,

  // Health
  HEALTH: '/health',
  HEALTH_READY: '/health/ready',
} as const;

// Expense Categories with icons
export const EXPENSE_CATEGORIES = [
  { id: 5, name: 'Supermercado', icon: 'cart', color: '#F59E0B', type: 'EXPENSE' },
  { id: 6, name: 'Restaurantes', icon: 'restaurant', color: '#EC4899', type: 'EXPENSE' },
  { id: 7, name: 'Transporte', icon: 'car', color: '#3B82F6', type: 'EXPENSE' },
  { id: 8, name: 'Servicios', icon: 'flash', color: '#8B5CF6', type: 'EXPENSE' },
  { id: 9, name: 'Entretenimiento', icon: 'game-controller', color: '#10B981', type: 'EXPENSE' },
  { id: 10, name: 'Salud', icon: 'medical', color: '#EF4444', type: 'EXPENSE' },
  { id: 11, name: 'Educacion', icon: 'school', color: '#14B8A6', type: 'EXPENSE' },
  { id: 12, name: 'Ropa', icon: 'shirt', color: '#A855F7', type: 'EXPENSE' },
  { id: 13, name: 'Hogar', icon: 'home', color: '#6366F1', type: 'EXPENSE' },
  { id: 14, name: 'Otros gastos', icon: 'ellipsis-horizontal', color: '#6B7280', type: 'EXPENSE' },
] as const;

// Income Categories with icons
export const INCOME_CATEGORIES = [
  { id: 1, name: 'Salario', icon: 'briefcase', color: '#10B981', type: 'INCOME' },
  { id: 2, name: 'Freelance', icon: 'laptop', color: '#3B82F6', type: 'INCOME' },
  { id: 3, name: 'Inversiones', icon: 'trending-up', color: '#8B5CF6', type: 'INCOME' },
  { id: 4, name: 'Otros ingresos', icon: 'cash', color: '#6B7280', type: 'INCOME' },
] as const;

// All categories combined (for backward compatibility)
export const CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES] as const;

// Receipt category mapping to internal categories (expense categories)
export const RECEIPT_CATEGORY_MAP: Record<string, number> = {
  Food: 5, // Supermercado
  Transport: 7,
  Utilities: 8, // Servicios
  Shopping: 5, // Supermercado
  Health: 10,
  Entertainment: 9,
  Other: 14, // Otros gastos
};

// Currency configuration
export const CURRENCIES = [
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano' },
  { code: 'USD', symbol: '$', name: 'Dolar Americano' },
  { code: 'EUR', symbol: '\u20AC', name: 'Euro' },
] as const;

// Frequency configuration for recurring expenses
export const FREQUENCIES = [
  { id: 'DAILY', name: 'Diario' },
  { id: 'WEEKLY', name: 'Semanal' },
  { id: 'BIWEEKLY', name: 'Quincenal' },
  { id: 'MONTHLY', name: 'Mensual' },
] as const;

// Budget period configuration
export const BUDGET_PERIODS = [
  { id: 'WEEKLY', name: 'Semanal' },
  { id: 'MONTHLY', name: 'Mensual' },
] as const;

// Image optimization settings
export const IMAGE_CONFIG = {
  MAX_WIDTH: 1024,
  MAX_HEIGHT: 1024,
  QUALITY: 0.7,
  FORMAT: 'jpeg' as const,
  MAX_SIZE_KB: 200,
};

// Gemini AI Configuration
export const GEMINI_CONFIG = {
  MODEL: 'gemini-2.5-pro',
  SYSTEM_PROMPT: `Analyze this receipt image. Extract the following information and return ONLY raw JSON (no markdown, no code blocks):
{
  "merchant_name": "string - name of the store/merchant",
  "total_amount": number - the total amount paid,
  "currency": "string - ISO currency code (MXN, USD, EUR)",
  "date": "string - ISO date format YYYY-MM-DD",
  "category": "string - one of: Food, Transport, Utilities, Shopping, Health, Entertainment, Other",
  "line_items": [
    {
      "name": "string - item name",
      "quantity": number,
      "unit_price": number,
      "total": number
    }
  ],
  "invoice_data": {
    "rfc": "string - RFC del negocio (Mexican tax ID, format: AAA000000XXX), null if not found",
    "business_legal_name": "string - Razon social del negocio, null if not found",
    "business_address": "string - Direccion fiscal del negocio, null if not found",
    "folio": "string - Numero de ticket/folio, null if not found"
  }
}

If you cannot read a field clearly, use null. For currency, default to MXN if unclear. Look carefully for RFC, razon social, and address information which is typically at the top or bottom of Mexican receipts.`,
};

// Secure Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
} as const;

// Query Keys for React Query
export const QUERY_KEYS = {
  USER: ['user'],
  TRANSACTIONS: ['transactions'],
  TRANSACTION: (id: string) => ['transaction', id],
  GOALS: ['goals'],
  GOAL: (id: string) => ['goal', id],
  DEBTS: ['debts'],
  DEBT: (id: string) => ['debt', id],
  RECURRING_EXPENSES: ['recurring-expenses'],
  RECURRING_EXPENSE: (id: string) => ['recurring-expense', id],
  CATEGORY_BUDGETS: ['category-budgets'],
  CATEGORY_BUDGET: (id: string) => ['category-budget', id],
  DASHBOARD: ['dashboard'],
  STATS: ['stats'],
  REPORTS: ['reports'],
  SETTINGS_USER: ['settings', 'user'],
  SETTINGS_FAMILY: ['settings', 'family'],
  FAMILY_MEMBERS: ['family', 'members'],
} as const;
