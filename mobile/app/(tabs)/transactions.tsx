import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionsInfinite } from '@/hooks/useTransactions';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import type { TransactionType } from '@/types';

const FILTERS: { label: string; value: TransactionType | undefined }[] = [
  { label: 'Todos', value: undefined },
  { label: 'Gastos', value: 'EXPENSE' },
  { label: 'Ingresos', value: 'INCOME' },
  { label: 'Deudas', value: 'DEBT' },
  { label: 'Ahorros', value: 'SAVING' },
];

export default function TransactionsScreen() {
  const [selectedFilter, setSelectedFilter] = useState<TransactionType | undefined>(
    undefined
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useTransactionsInfinite({ type: selectedFilter });

  const transactions = data?.pages.flatMap((page) => page.items) || [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#4F46E5" />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-14 pb-4 px-6 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-gray-900">Transacciones</Text>
          <TouchableOpacity
            onPress={() => router.push('/add-expense')}
            className="w-10 h-10 bg-primary-600 rounded-full items-center justify-center"
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(item) => item.label}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedFilter(item.value)}
              className={`px-4 py-2 rounded-full mr-2 ${
                selectedFilter === item.value
                  ? 'bg-primary-600'
                  : 'bg-gray-100'
              }`}
            >
              <Text
                className={`font-medium ${
                  selectedFilter === item.value
                    ? 'text-white'
                    : 'text-gray-700'
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Transactions List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : transactions.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="receipt-outline" size={40} color="#9CA3AF" />
          </View>
          <Text className="text-xl font-semibold text-gray-900 text-center">
            Sin transacciones
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            Escanea un recibo o agrega tu primera transaccion
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/add-expense')}
            className="mt-6 bg-primary-600 px-6 py-3 rounded-xl flex-row items-center"
          >
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">Agregar Transaccion</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionItem
              transaction={item}
              onPress={() => router.push(`/transaction/${item.id}`)}
            />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={{ backgroundColor: 'white' }}
        />
      )}
    </View>
  );
}
