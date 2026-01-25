import api from './api';
import { API_ENDPOINTS } from '@/constants';
import type {
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  PaginatedResponse,
  TransactionType,
} from '@/types';

export interface TransactionFilters {
  page?: number;
  size?: number;
  type?: TransactionType;
  category_id?: number;
  date_from?: string;
  date_to?: string;
}

// List transactions with pagination and filters
export const getTransactions = async (
  filters: TransactionFilters = {}
): Promise<PaginatedResponse<Transaction>> => {
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.size) params.append('size', filters.size.toString());
  if (filters.type) params.append('type', filters.type);
  if (filters.category_id) params.append('category_id', filters.category_id.toString());
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);

  const response = await api.get<PaginatedResponse<Transaction>>(
    `${API_ENDPOINTS.TRANSACTIONS}?${params.toString()}`
  );
  return response.data;
};

// Get single transaction
export const getTransaction = async (id: string): Promise<Transaction> => {
  const response = await api.get<Transaction>(API_ENDPOINTS.TRANSACTION(id));
  return response.data;
};

// Create transaction
export const createTransaction = async (data: TransactionCreate): Promise<Transaction> => {
  const response = await api.post<Transaction>(API_ENDPOINTS.TRANSACTIONS, data);
  return response.data;
};

// Update transaction
export const updateTransaction = async (
  id: string,
  data: TransactionUpdate
): Promise<Transaction> => {
  const response = await api.patch<Transaction>(API_ENDPOINTS.TRANSACTION(id), data);
  return response.data;
};

// Delete transaction
export const deleteTransaction = async (id: string): Promise<void> => {
  await api.delete(API_ENDPOINTS.TRANSACTION(id));
};

// Upload receipt attachment
export const uploadAttachment = async (
  transactionId: string,
  imageUri: string,
  mimeType: string = 'image/jpeg'
): Promise<Transaction> => {
  const formData = new FormData();

  // Create file object for React Native
  const filename = `receipt_${Date.now()}.jpg`;
  formData.append('file', {
    uri: imageUri,
    type: mimeType,
    name: filename,
  } as unknown as Blob);

  const response = await api.post<Transaction>(
    API_ENDPOINTS.TRANSACTION_ATTACHMENT(transactionId),
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};
