import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDashboard } from '@/hooks/useDashboard';
import { useTransactionsInfinite, useDeleteTransaction } from '@/hooks/useTransactions';
import { useAuthStore } from '@/stores/authStore';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { formatCurrency } from '@/utils/format';
import { showSuccess, showError, showFeedback } from '@/utils/feedback';
import { autoExecuteRecurring, convertOverdueToDebts } from '@/services/recurringExpenses';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { data: dashboard, isLoading, refetch, isRefetching } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const searchTrimmed = searchQuery.trim();
  const { data: transactionsData } = useTransactionsInfinite({
    type: undefined,
    search: searchTrimmed || undefined,
  });
  const deleteTransaction = useDeleteTransaction();

  // Sort transactions by date descending; show all results when searching, 5 most recent otherwise
  const recentTransactions = useMemo(() => {
    const items = (transactionsData?.pages[0]?.items || [])
      .slice()
      .sort((a, b) => new Date(b.trx_date).getTime() - new Date(a.trx_date).getTime());
    return searchTrimmed ? items : items.slice(0, 5);
  }, [transactionsData, searchTrimmed]);

  // Auto-execute due automatic recurring expenses on mount
  const autoExecuteRan = useRef(false);
  useEffect(() => {
    if (autoExecuteRan.current) return;
    autoExecuteRan.current = true;
    autoExecuteRecurring()
      .then((result) => {
        if (result.transactions_created > 0) {
          refetch();
          showSuccess(`${result.transactions_created} gasto(s) recurrente(s) registrado(s) automaticamente`);
        }
      })
      .catch(() => {
        // Silently ignore - non-critical
      });
    convertOverdueToDebts()
      .then((result) => {
        if (result.converted_count > 0) {
          refetch();
          showFeedback({
            title: 'Gastos vencidos',
            message: `${result.converted_count} gasto(s) recurrente(s) no cubierto(s) se convirtieron en deuda`,
            type: 'warning',
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction.mutateAsync(id);
      showSuccess('Transaccion eliminada');
    } catch (error) {
      showError('No se pudo eliminar la transaccion');
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      {/* Header */}
      <View className="bg-primary-600 pt-14 pb-8 px-6 rounded-b-3xl">
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-primary-200 text-sm">Bienvenido</Text>
            <Text className="text-white text-xl font-semibold">
              {user?.name || user?.email?.split('@')[0] || 'Usuario'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/scan')}
            className="w-12 h-12 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="camera-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View className="bg-white/10 backdrop-blur rounded-2xl p-5">
          <Text className="text-primary-100 text-sm mb-1">Balance del Mes</Text>
          <Text className="text-white text-3xl font-bold">
            {dashboard ? formatCurrency(dashboard.summary.balance) : '$0.00'}
          </Text>
          <View className="flex-row mt-4 gap-4">
            <View className="flex-1">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-success-500 mr-2" />
                <Text className="text-primary-200 text-sm">Ingresos</Text>
              </View>
              <Text className="text-white font-semibold mt-1">
                {dashboard ? formatCurrency(dashboard.summary.income) : '$0.00'}
              </Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-danger-500 mr-2" />
                <Text className="text-primary-200 text-sm">Gastos</Text>
              </View>
              <Text className="text-white font-semibold mt-1">
                {dashboard ? formatCurrency(dashboard.summary.expense) : '$0.00'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View className="px-6 -mt-4">
        <View className="bg-white rounded-2xl shadow-sm p-4 flex-row justify-around">
          <TouchableOpacity
            onPress={() => router.push('/scan')}
            className="items-center"
          >
            <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center mb-1">
              <Ionicons name="scan-outline" size={24} color="#4F46E5" />
            </View>
            <Text className="text-gray-600 text-xs">Escanear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/add-expense')}
            className="items-center"
          >
            <View className="w-12 h-12 bg-success-50 rounded-full items-center justify-center mb-1">
              <Ionicons name="add-circle-outline" size={24} color="#10B981" />
            </View>
            <Text className="text-gray-600 text-xs">Agregar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/goals')}
            className="items-center"
          >
            <View className="w-12 h-12 bg-warning-50 rounded-full items-center justify-center mb-1">
              <Ionicons name="flag-outline" size={24} color="#F59E0B" />
            </View>
            <Text className="text-gray-600 text-xs">Metas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/reports')}
            className="items-center"
          >
            <View className="w-12 h-12 bg-danger-50 rounded-full items-center justify-center mb-1">
              <Ionicons name="stats-chart-outline" size={24} color="#EF4444" />
            </View>
            <Text className="text-gray-600 text-xs">Reportes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View className="mt-4 px-6">
        <View className="flex-row items-center bg-white rounded-xl border border-gray-200 px-3">
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar transacciones..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 py-3 px-2 text-gray-900"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Recent Transactions */}
      <View className="mt-4 px-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-semibold text-gray-900">
            {searchTrimmed ? 'Resultados de busqueda' : 'Transacciones Recientes'}
          </Text>
          <Link href="/(tabs)/transactions" asChild>
            <TouchableOpacity>
              <Text className="text-primary-600 font-medium">Ver todas</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {recentTransactions.length === 0 ? (
            <View className="p-8 items-center">
              <Ionicons name={searchTrimmed ? "search-outline" : "receipt-outline"} size={48} color="#D1D5DB" />
              <Text className="text-gray-500 mt-2 text-center">
                {searchTrimmed
                  ? `No se encontraron resultados para "${searchTrimmed}"`
                  : 'No hay transacciones aun.\nEscanea tu primer recibo!'}
              </Text>
            </View>
          ) : (
            recentTransactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                onPress={() => router.push(`/transaction/${transaction.id}`)}
                onDelete={handleDelete}
              />
            ))
          )}
        </View>
      </View>

      {/* Spacer for tab bar */}
      <View className="h-8" />
    </ScrollView>
  );
}
