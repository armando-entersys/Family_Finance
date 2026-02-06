import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { CURRENCIES } from '@/constants';

// Format currency amount with comma thousands separator and 2 decimals
// Example: $4,300.00
export const formatCurrency = (
  amount: number,
  currencyCode: string = 'MXN'
): string => {
  const parsed = Number(amount);
  const safeAmount = isNaN(parsed) ? 0 : parsed;
  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  const symbol = currency?.symbol || '$';

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(safeAmount));

  return `${safeAmount < 0 ? '-' : ''}${symbol}${formatted}`;
};

// Format date for display
export const formatDate = (dateString: string, formatStr: string = 'dd MMM yyyy'): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return dateString;
    return format(date, formatStr, { locale: es });
  } catch {
    return dateString;
  }
};

// Format date for API
export const formatDateForAPI = (date: Date): string => {
  return date.toISOString();
};

// Format relative time (e.g., "hace 2 horas")
export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return dateString;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDays < 7) return `hace ${diffDays}d`;

    return formatDate(dateString, 'dd MMM');
  } catch {
    return dateString;
  }
};

// Format transaction type label
export const formatTransactionType = (type: string): string => {
  const labels: Record<string, string> = {
    INCOME: 'Ingreso',
    EXPENSE: 'Gasto',
    DEBT: 'Deuda',
    SAVING: 'Ahorro',
  };
  return labels[type] || type;
};

// Get transaction type color
export const getTransactionTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    INCOME: '#10B981', // green
    EXPENSE: '#EF4444', // red
    DEBT: '#F59E0B', // amber
    SAVING: '#6366F1', // indigo
  };
  return colors[type] || '#6B7280';
};

// Truncate text with ellipsis
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
};

// Format percentage
export const formatPercentage = (value: number, decimals: number = 1): string => {
  const parsed = Number(value);
  const safeValue = isNaN(parsed) ? 0 : parsed;
  return `${safeValue.toFixed(decimals)}%`;
};
