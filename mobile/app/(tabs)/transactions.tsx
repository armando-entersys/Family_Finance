import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionsInfinite, useDeleteTransaction } from '@/hooks/useTransactions';
import { useFamilyMembers } from '@/hooks/useSettings';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { showSuccess, showError } from '@/utils/feedback';
import type { Transaction, TransactionType } from '@/types';

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
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const { data: members } = useFamilyMembers();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useTransactionsInfinite({ type: selectedFilter, user_id: selectedUserId });

  const deleteTransaction = useDeleteTransaction();

  const transactions = data?.pages.flatMap((page) => page.items) || [];

  const sections = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const trx of transactions) {
      const trxDate = new Date(trx.trx_date);
      trxDate.setHours(0, 0, 0, 0);

      let label: string;
      if (trxDate.getTime() === today.getTime()) {
        label = 'Hoy';
      } else if (trxDate.getTime() === yesterday.getTime()) {
        label = 'Ayer';
      } else {
        label = trxDate.toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'short',
          year: trxDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
        });
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(trx);
    }

    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [transactions]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction.mutateAsync(id);
      showSuccess('Transaccion eliminada');
    } catch (error) {
      showError('No se pudo eliminar la transaccion');
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

        {/* Type Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {FILTERS.map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => setSelectedFilter(item.value)}
                className={`px-4 py-2 rounded-full ${
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
            ))}
          </View>
        </ScrollView>

        {/* Member Filter */}
        {members && members.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setSelectedUserId(undefined)}
                className={`px-3 py-1.5 rounded-full flex-row items-center ${
                  !selectedUserId ? 'bg-indigo-100' : 'bg-gray-100'
                }`}
              >
                <Ionicons
                  name="people"
                  size={14}
                  color={!selectedUserId ? '#4F46E5' : '#6B7280'}
                />
                <Text
                  className={`ml-1.5 text-sm font-medium ${
                    !selectedUserId ? 'text-indigo-700' : 'text-gray-600'
                  }`}
                >
                  Todos
                </Text>
              </TouchableOpacity>
              {members.map((member) => {
                const displayName = member.name || member.email.split('@')[0];
                const isSelected = selectedUserId === member.id;
                return (
                  <TouchableOpacity
                    key={member.id}
                    onPress={() => setSelectedUserId(isSelected ? undefined : member.id)}
                    className={`px-3 py-1.5 rounded-full flex-row items-center ${
                      isSelected ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}
                  >
                    <Ionicons
                      name="person"
                      size={14}
                      color={isSelected ? '#4F46E5' : '#6B7280'}
                    />
                    <Text
                      className={`ml-1.5 text-sm font-medium ${
                        isSelected ? 'text-indigo-700' : 'text-gray-600'
                      }`}
                    >
                      {displayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}
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
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section: { title } }) => (
            <View className="bg-gray-50 px-4 py-2">
              <Text className="text-sm font-semibold text-gray-500">{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TransactionItem
              transaction={item}
              onPress={() => router.push(`/transaction/${item.id}`)}
              onDelete={handleDelete}
            />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          refreshing={isRefetching}
          onRefresh={refetch}
          stickySectionHeadersEnabled
        />
      )}
    </View>
  );
}
