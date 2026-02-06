// ============================================
// API Response Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'MEMBER';
  family_id: string | null;
  is_active: boolean;
  has_completed_onboarding: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface Transaction {
  id: string;
  family_id: string;
  user_id: string;
  category_id: number | null;
  amount_original: number;
  currency_code: string;
  exchange_rate: number;
  amount_base: number;
  trx_date: string;
  type: TransactionType;
  description: string | null;
  attachment_url: string | null;
  attachment_thumb_url: string | null;
  is_invoiced: boolean;
  sync_id: string | null;
  created_at: string;
  user_name: string | null;
}

export type TransactionType = 'INCOME' | 'EXPENSE' | 'DEBT' | 'SAVING';

export interface TransactionCreate {
  amount_original: number;
  currency_code?: string;
  exchange_rate?: number;
  type: TransactionType;
  category_id?: number;
  description?: string;
  trx_date?: string;
  is_invoiced?: boolean;
  sync_id?: string;
}

export interface TransactionUpdate {
  amount_original?: number;
  currency_code?: string;
  exchange_rate?: number;
  category_id?: number;
  description?: string;
  trx_date?: string;
  is_invoiced?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface Goal {
  id: string;
  family_id: string;
  created_by: string;
  name: string;
  description: string | null;
  icon: string;
  target_amount: number;
  current_saved: number;
  currency_code: string;
  deadline: string | null;
  goal_type: 'FAMILY' | 'PERSONAL';
  is_active: boolean;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface GoalCreate {
  name: string;
  description?: string;
  icon?: string;
  target_amount: number;
  currency_code?: string;
  deadline?: string;
  goal_type?: 'FAMILY' | 'PERSONAL';
}

export interface Contribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  contribution_date: string;
  is_withdrawal: boolean;
  notes: string | null;
  created_at: string;
}

export interface Debt {
  id: string;
  family_id: string;
  creditor: string;
  description: string | null;
  debt_type: DebtType;
  total_amount: number;
  current_balance: number;
  currency_code: string;
  exchange_rate_fixed: number;
  amount_in_base_currency: number;
  interest_rate: number | null;
  is_archived: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export type DebtType = 'BANK' | 'PERSONAL' | 'SERVICE';

export interface DebtCreate {
  creditor: string;
  description?: string;
  debt_type?: DebtType;
  total_amount: number;
  currency_code?: string;
  exchange_rate_fixed?: number;
  interest_rate?: number;
  due_date?: string;
}

export interface Payment {
  id: string;
  debt_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
  is_adjustment: boolean;
  created_at: string;
}

export interface FinancialSummary {
  income: number;
  expense: number;
  debt: number;
  saving: number;
  balance: number;
  currency: string;
}

export interface DashboardData {
  summary: FinancialSummary;
  recent_transactions_count: number;
}

export interface UserSettings {
  daily_summary_enabled: boolean;
  notification_time: string;
  preferred_currency: string;
  language: string;
}

export interface FamilySettings {
  month_close_day: number;
  default_currency: string;
  budget_warning_threshold: number;
}

export interface FamilyMember {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'MEMBER';
  is_active: boolean;
}

// ============================================
// Receipt Scanning Types (Gemini AI)
// ============================================

export interface ReceiptLineItem {
  name: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
}

export interface InvoiceData {
  rfc: string | null;
  business_legal_name: string | null;
  business_address: string | null;
  folio: string | null;
}

export interface ParsedReceipt {
  merchant_name: string;
  total_amount: number;
  currency: string;
  date: string;
  category: ReceiptCategory;
  line_items: ReceiptLineItem[];
  invoice_data?: InvoiceData;
}

export type ReceiptCategory =
  | 'Food'
  | 'Transport'
  | 'Utilities'
  | 'Shopping'
  | 'Health'
  | 'Entertainment'
  | 'Other';

// ============================================
// API Error Types
// ============================================

export interface APIError {
  detail: string | ValidationError[];
}

export interface ValidationError {
  type: string;
  loc: (string | number)[];
  msg: string;
  input: unknown;
  ctx?: Record<string, unknown>;
}

// ============================================
// App State Types
// ============================================

export interface AppState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  tokens: AuthTokens | null;
}

// ============================================
// Reports Types
// ============================================

export interface MemberSummary {
  user_id: string;
  user_name: string;
  income: number;
  expense: number;
  balance: number;
  transaction_count: number;
}

export interface PeriodComparison {
  current: FinancialSummary;
  previous: FinancialSummary;
  income_change_pct: number;
  expense_change_pct: number;
  savings_rate: number;
}

export interface ReportsData {
  summary: FinancialSummary;
  comparison: PeriodComparison;
  members: MemberSummary[];
  recent_transactions_count: number;
}
