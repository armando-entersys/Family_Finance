import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import * as transactionsService from '@/services/transactions';
import type {
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  TransactionType,
} from '@/types';

// Infinite scroll hook for transactions list
export const useTransactionsInfinite = (filters?: {
  type?: TransactionType;
  category_id?: number;
  date_from?: string;
  date_to?: string;
}) => {
  return useInfiniteQuery({
    queryKey: [...QUERY_KEYS.TRANSACTIONS, filters],
    queryFn: ({ pageParam = 1 }) =>
      transactionsService.getTransactions({
        page: pageParam,
        size: 20,
        ...filters,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: 30000, // 30 seconds
  });
};

// Single transaction hook
export const useTransaction = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.TRANSACTION(id),
    queryFn: () => transactionsService.getTransaction(id),
    enabled: !!id,
  });
};

// Create transaction mutation
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TransactionCreate) => transactionsService.createTransaction(data),
    onSuccess: () => {
      // Invalidate transactions list and dashboard
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STATS });
    },
  });
};

// Update transaction mutation
export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransactionUpdate }) =>
      transactionsService.updateTransaction(id, data),
    onSuccess: (updatedTransaction) => {
      // Update cache
      queryClient.setQueryData(
        QUERY_KEYS.TRANSACTION(updatedTransaction.id),
        updatedTransaction
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
    },
  });
};

// Delete transaction mutation
export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transactionsService.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STATS });
    },
  });
};

// Upload attachment mutation
export const useUploadAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      transactionId,
      imageUri,
    }: {
      transactionId: string;
      imageUri: string;
    }) => transactionsService.uploadAttachment(transactionId, imageUri),
    onSuccess: (updatedTransaction) => {
      queryClient.setQueryData(
        QUERY_KEYS.TRANSACTION(updatedTransaction.id),
        updatedTransaction
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS });
    },
  });
};
