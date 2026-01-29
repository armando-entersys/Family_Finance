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

  // Stats
  STATS_SUMMARY: '/api/v1/stats/summary',
  STATS_DASHBOARD: '/api/v1/stats/dashboard',

  // Settings
  SETTINGS_USER: '/api/v1/settings/user',
  SETTINGS_FAMILY: '/api/v1/settings/family',
  SETTINGS_FAMILY_MEMBERS: '/api/v1/settings/family/members',
  SETTINGS_FAMILY_INVITE: '/api/v1/settings/family/invite',
  SETTINGS_FAMILY_MEMBER: (id: string) => `/api/v1/settings/family/members/${id}`,

  // Health
  HEALTH: '/health',
  HEALTH_READY: '/health/ready',
} as const;

// Transaction Categories with icons
export const CATEGORIES = [
  { id: 1, name: 'Comida', icon: 'restaurant', color: '#F59E0B' },
  { id: 2, name: 'Transporte', icon: 'car', color: '#3B82F6' },
  { id: 3, name: 'Servicios', icon: 'flash', color: '#8B5CF6' },
  { id: 4, name: 'Compras', icon: 'cart', color: '#EC4899' },
  { id: 5, name: 'Salud', icon: 'medical', color: '#EF4444' },
  { id: 6, name: 'Entretenimiento', icon: 'game-controller', color: '#10B981' },
  { id: 7, name: 'Hogar', icon: 'home', color: '#6366F1' },
  { id: 8, name: 'Educacion', icon: 'school', color: '#14B8A6' },
  { id: 9, name: 'Otros', icon: 'ellipsis-horizontal', color: '#6B7280' },
] as const;

// Receipt category mapping to internal categories
export const RECEIPT_CATEGORY_MAP: Record<string, number> = {
  Food: 1,
  Transport: 2,
  Utilities: 3,
  Shopping: 4,
  Health: 5,
  Entertainment: 6,
  Other: 9,
};

// Currency configuration
export const CURRENCIES = [
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano' },
  { code: 'USD', symbol: '$', name: 'Dolar Americano' },
  { code: 'EUR', symbol: '\u20AC', name: 'Euro' },
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
  MODEL: 'gemini-1.5-flash',
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
  ]
}

If you cannot read a field clearly, use null. For currency, default to MXN if unclear.`,
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
  DASHBOARD: ['dashboard'],
  STATS: ['stats'],
  SETTINGS_USER: ['settings', 'user'],
  SETTINGS_FAMILY: ['settings', 'family'],
  FAMILY_MEMBERS: ['family', 'members'],
} as const;
