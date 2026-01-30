import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDashboard } from '@/hooks/useDashboard';
import { useTransactionsInfinite, useDeleteTransaction } from '@/hooks/useTransactions';
import { useAuthStore } from '@/stores/authStore';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { formatCurrency } from '@/utils/format';
import { showSuccess, showError } from '@/utils/feedback';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { data: dashboard, isLoading, refetch, isRefetching } = useDashboard();
  const { data: transactionsData } = useTransactionsInfinite({ type: undefined });
  const deleteTransaction = useDeleteTransaction();

  const recentTransactions = transactionsData?.pages[0]?.items.slice(0, 5) || [];

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

      {/* Recent Transactions */}
      <View className="mt-6 px-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-semibold text-gray-900">
            Transacciones Recientes
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
              <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 mt-2 text-center">
                No hay transacciones aun.{'\n'}Escanea tu primer recibo!
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
