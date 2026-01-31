import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDashboard } from '@/hooks/useDashboard';
import { useTransactionsInfinite } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useDebts, useDebtsSummary } from '@/hooks/useDebts';
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses';
import { useCategoryBudgetsStatus } from '@/hooks/useCategoryBudgets';
import { formatCurrency, formatPercentage } from '@/utils/format';
import { CATEGORIES, EXPENSE_CATEGORIES } from '@/constants';

type Period = 'week' | 'month' | 'year';

export default function ReportsScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const { data: dashboard, isLoading, refetch, isRefetching } = useDashboard();
  const { data: transactionsData } = useTransactionsInfinite({ type: 'EXPENSE' });
  const { data: goals } = useGoals();
  const { data: debts } = useDebts();
  const { data: debtsSummary } = useDebtsSummary();
  const { data: recurringExpenses } = useRecurringExpenses();
  const { data: budgetStatuses } = useCategoryBudgetsStatus();

  // Calculate category totals from transactions
  const categoryTotals = React.useMemo(() => {
    const totals: Record<number, number> = {};
    const allTransactions = transactionsData?.pages.flatMap((p) => p.items) || [];

    allTransactions.forEach((trx) => {
      if (trx.category_id && trx.type === 'EXPENSE') {
        totals[trx.category_id] = (totals[trx.category_id] || 0) + Number(trx.amount_base);
      }
    });

    return CATEGORIES.map((cat) => ({
      ...cat,
      total: totals[cat.id] || 0,
    }))
      .filter((cat) => cat.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [transactionsData]);

  const totalExpenses = categoryTotals.reduce((sum, cat) => sum + cat.total, 0);

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Header */}
        <View className="bg-white pt-14 pb-6 px-6 border-b border-gray-100">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3"
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900">Reportes</Text>
          </View>

          {/* Period Selector */}
          <View className="flex-row bg-gray-100 rounded-xl p-1">
            {[
              { key: 'week', label: 'Semana' },
              { key: 'month', label: 'Mes' },
              { key: 'year', label: 'Ano' },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                className={`flex-1 py-2 rounded-lg ${
                  period === item.key ? 'bg-white shadow-sm' : ''
                }`}
                onPress={() => setPeriod(item.key as Period)}
              >
                <Text
                  className={`text-center font-medium ${
                    period === item.key ? 'text-primary-600' : 'text-gray-500'
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary Cards */}
        <View className="p-6">
          <View className="flex-row gap-3">
            {/* Income */}
            <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
              <View className="flex-row items-center mb-2">
                <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center">
                  <Ionicons name="trending-up" size={16} color="#10B981" />
                </View>
              </View>
              <Text className="text-gray-500 text-sm">Ingresos</Text>
              <Text className="text-xl font-bold text-gray-900">
                {dashboard ? formatCurrency(dashboard.summary.income) : '$0'}
              </Text>
            </View>

            {/* Expenses */}
            <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
              <View className="flex-row items-center mb-2">
                <View className="w-8 h-8 bg-red-100 rounded-full items-center justify-center">
                  <Ionicons name="trending-down" size={16} color="#EF4444" />
                </View>
              </View>
              <Text className="text-gray-500 text-sm">Gastos</Text>
              <Text className="text-xl font-bold text-gray-900">
                {dashboard ? formatCurrency(dashboard.summary.expense) : '$0'}
              </Text>
            </View>
          </View>

          {/* Balance */}
          <View className="mt-3 bg-primary-600 rounded-2xl p-4">
            <Text className="text-primary-200 text-sm">Balance</Text>
            <Text className="text-white text-2xl font-bold">
              {dashboard ? formatCurrency(dashboard.summary.balance) : '$0'}
            </Text>
          </View>
        </View>

        {/* Category Breakdown */}
        <View className="px-6 pb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Gastos por Categoria
          </Text>

          {categoryTotals.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center">
              <Ionicons name="pie-chart-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 mt-2 text-center">
                No hay gastos registrados
              </Text>
            </View>
          ) : (
            <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {categoryTotals.map((category, index) => {
                const percentage = totalExpenses > 0 ? (category.total / totalExpenses) * 100 : 0;

                return (
                  <View
                    key={category.id}
                    className={`p-4 ${
                      index < categoryTotals.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <View
                          className="w-10 h-10 rounded-full items-center justify-center mr-3"
                          style={{ backgroundColor: category.color + '20' }}
                        >
                          <Ionicons
                            name={category.icon as keyof typeof Ionicons.glyphMap}
                            size={20}
                            color={category.color}
                          />
                        </View>
                        <Text className="text-gray-900 font-medium">{category.name}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-gray-900 font-semibold">
                          {formatCurrency(category.total)}
                        </Text>
                        <Text className="text-gray-400 text-sm">
                          {formatPercentage(percentage)}
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Budget Status */}
        {budgetStatuses && budgetStatuses.length > 0 && (
          <View className="px-6 pb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Estado de Presupuestos
            </Text>

            <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {budgetStatuses.map((budget, index) => {
                const category = EXPENSE_CATEGORIES.find((c) => c.id === budget.category_id);
                const barColor = budget.is_over_budget
                  ? '#EF4444'
                  : budget.is_alert_triggered
                  ? '#F59E0B'
                  : '#10B981';

                return (
                  <View
                    key={budget.id}
                    className={`p-4 ${
                      index < budgetStatuses.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <View
                          className="w-8 h-8 rounded-full items-center justify-center mr-2"
                          style={{ backgroundColor: category ? `${category.color}20` : '#6B728020' }}
                        >
                          <Ionicons
                            name={(category?.icon || 'wallet') as keyof typeof Ionicons.glyphMap}
                            size={16}
                            color={category?.color || '#6B7280'}
                          />
                        </View>
                        <Text className="text-gray-900 font-medium">{category?.name || 'Categoria'}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-gray-900 font-semibold">
                          {formatCurrency(budget.spent_amount)} / {formatCurrency(budget.budget_amount)}
                        </Text>
                      </View>
                    </View>
                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(budget.percentage_used, 100)}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </View>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-xs" style={{ color: barColor }}>
                        {formatPercentage(budget.percentage_used)}
                      </Text>
                      {budget.is_over_budget && (
                        <Text className="text-xs text-red-500 font-medium">Excedido</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Goals Progress */}
        {goals && goals.length > 0 && (
          <View className="px-6 pb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Progreso de Metas
            </Text>

            <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {goals.slice(0, 5).map((goal, index) => (
                <View
                  key={goal.id}
                  className={`p-4 ${index < Math.min(goals.length, 5) - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-full items-center justify-center mr-2 bg-indigo-100">
                        <Ionicons
                          name={(goal.icon || 'flag') as keyof typeof Ionicons.glyphMap}
                          size={16}
                          color="#4F46E5"
                        />
                      </View>
                      <Text className="text-gray-900 font-medium">{goal.name}</Text>
                    </View>
                    <Text className="text-gray-900 font-semibold">
                      {formatCurrency(goal.current_saved)} / {formatCurrency(goal.target_amount)}
                    </Text>
                  </View>
                  <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <View
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                    />
                  </View>
                  <Text className="text-xs text-indigo-500 mt-1">
                    {formatPercentage(goal.progress_percentage)} completado
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Debts Overview */}
        {debts && debts.length > 0 && (
          <View className="px-6 pb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Resumen de Deudas
            </Text>

            <View className="bg-white rounded-2xl p-4 shadow-sm mb-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-500">Total Deudas Activas</Text>
                <Text className="text-2xl font-bold text-red-500">
                  {debtsSummary ? formatCurrency(debtsSummary.total_debt) : '$0'}
                </Text>
              </View>
              <View className="flex-row justify-between items-center mt-2">
                <Text className="text-gray-500 text-sm">Pagado Total</Text>
                <Text className="text-green-600 font-medium">
                  {debtsSummary ? formatCurrency(debtsSummary.total_paid) : '$0'}
                </Text>
              </View>
            </View>

            <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {debts.slice(0, 5).map((debt, index) => (
                <View
                  key={debt.id}
                  className={`p-4 ${index < Math.min(debts.length, 5) - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-full items-center justify-center mr-2 bg-red-100">
                        <Ionicons name="card-outline" size={16} color="#EF4444" />
                      </View>
                      <View>
                        <Text className="text-gray-900 font-medium">{debt.creditor}</Text>
                        <Text className="text-xs text-gray-400">{debt.debt_type}</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-red-500 font-semibold">
                        {formatCurrency(debt.current_balance)}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        de {formatCurrency(debt.total_amount)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recurring Expenses */}
        {recurringExpenses && recurringExpenses.length > 0 && (
          <View className="px-6 pb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Gastos Recurrentes
            </Text>

            <View className="bg-white rounded-2xl p-4 shadow-sm mb-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-500">Total Mensual Estimado</Text>
                <Text className="text-xl font-bold text-purple-600">
                  {formatCurrency(
                    recurringExpenses.reduce((sum, exp) => {
                      const multiplier = exp.frequency === 'DAILY' ? 30
                        : exp.frequency === 'WEEKLY' ? 4
                        : exp.frequency === 'BIWEEKLY' ? 2
                        : 1;
                      return sum + exp.amount * multiplier;
                    }, 0)
                  )}
                </Text>
              </View>
            </View>

            <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {recurringExpenses.slice(0, 5).map((expense, index) => {
                const category = EXPENSE_CATEGORIES.find((c) => c.id === expense.category_id);
                const isOverdue = new Date(expense.next_due_date) <= new Date();

                return (
                  <View
                    key={expense.id}
                    className={`p-4 ${index < Math.min(recurringExpenses.length, 5) - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View
                          className="w-8 h-8 rounded-full items-center justify-center mr-2"
                          style={{ backgroundColor: category ? `${category.color}20` : '#8B5CF620' }}
                        >
                          <Ionicons
                            name={(category?.icon || 'repeat') as keyof typeof Ionicons.glyphMap}
                            size={16}
                            color={category?.color || '#8B5CF6'}
                          />
                        </View>
                        <View>
                          <Text className="text-gray-900 font-medium">{expense.name}</Text>
                          <View className="flex-row items-center gap-1">
                            <Text className="text-xs text-gray-400">
                              {expense.frequency === 'DAILY' ? 'Diario'
                                : expense.frequency === 'WEEKLY' ? 'Semanal'
                                : expense.frequency === 'BIWEEKLY' ? 'Quincenal'
                                : 'Mensual'}
                            </Text>
                            {isOverdue && (
                              <View className="bg-amber-100 px-1.5 py-0.5 rounded">
                                <Text className="text-amber-600 text-xs">Pendiente</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      <Text className="text-gray-900 font-semibold">
                        {formatCurrency(expense.amount)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Summary Stats */}
        <View className="px-6 pb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Resumen General
          </Text>

          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="flex-row justify-between py-3 border-b border-gray-100">
              <Text className="text-gray-500">Total Transacciones</Text>
              <Text className="text-gray-900 font-medium">
                {dashboard?.recent_transactions_count || 0}
              </Text>
            </View>
            <View className="flex-row justify-between py-3 border-b border-gray-100">
              <Text className="text-gray-500">Ahorro en Metas</Text>
              <Text className="text-indigo-600 font-medium">
                {goals ? formatCurrency(goals.reduce((sum, g) => sum + g.current_saved, 0)) : '$0'}
              </Text>
            </View>
            <View className="flex-row justify-between py-3 border-b border-gray-100">
              <Text className="text-gray-500">Metas Activas</Text>
              <Text className="text-gray-900 font-medium">
                {goals?.length || 0}
              </Text>
            </View>
            <View className="flex-row justify-between py-3 border-b border-gray-100">
              <Text className="text-gray-500">Deudas Activas</Text>
              <Text className="text-gray-900 font-medium">
                {debts?.length || 0}
              </Text>
            </View>
            <View className="flex-row justify-between py-3 border-b border-gray-100">
              <Text className="text-gray-500">Gastos Recurrentes</Text>
              <Text className="text-gray-900 font-medium">
                {recurringExpenses?.length || 0}
              </Text>
            </View>
            <View className="flex-row justify-between py-3">
              <Text className="text-gray-500">Presupuestos Activos</Text>
              <Text className="text-gray-900 font-medium">
                {budgetStatuses?.length || 0}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
