import React, { useState, useMemo } from 'react';
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
import { useReports } from '@/hooks/useDashboard';
import { useGoals } from '@/hooks/useGoals';
import { useDebts, useDebtsSummary } from '@/hooks/useDebts';
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses';
import { useCategoryBudgetsStatus } from '@/hooks/useCategoryBudgets';
import { formatCurrency, formatPercentage } from '@/utils/format';
import { EXPENSE_CATEGORIES } from '@/constants';

type Period = 'week' | 'month' | 'year';

const getDateRange = (period: Period) => {
  const now = new Date();
  let from: Date;

  switch (period) {
    case 'week': {
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case 'month': {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case 'year': {
      from = new Date(now.getFullYear(), 0, 1);
      break;
    }
  }

  return {
    date_from: from.toISOString(),
    date_to: now.toISOString(),
  };
};

const getSavingsRateStyle = (rate: number) => {
  if (rate >= 20) return { color: '#10B981', bg: '#ECFDF5', label: 'Excelente' };
  if (rate >= 10) return { color: '#F59E0B', bg: '#FFFBEB', label: 'Bien' };
  if (rate >= 0) return { color: '#EF4444', bg: '#FEF2F2', label: 'Cuidado' };
  return { color: '#991B1B', bg: '#FEF2F2', label: 'Critico' };
};

export default function ReportsScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);

  const dateRange = useMemo(() => getDateRange(period), [period]);
  const filters = useMemo(() => ({
    ...dateRange,
    category_id: selectedCategoryId,
  }), [dateRange, selectedCategoryId]);

  const { data: reports, isLoading, refetch, isRefetching } = useReports(filters);
  const { data: goals } = useGoals();
  const { data: debts } = useDebts();
  const { data: debtsSummary } = useDebtsSummary();
  const { data: recurringExpenses } = useRecurringExpenses();
  const { data: budgetStatuses } = useCategoryBudgetsStatus();

  const savingsRate = reports?.comparison.savings_rate ?? 0;
  const savingsStyle = getSavingsRateStyle(savingsRate);
  const expenseChangePct = reports?.comparison.expense_change_pct ?? 0;
  const expensesTrending = expenseChangePct > 0 ? 'up' : expenseChangePct < 0 ? 'down' : 'flat';

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
        <View className="bg-white pt-14 pb-4 px-6 border-b border-gray-100">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3"
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900">Reportes</Text>
          </View>

          {/* Period Selector - FUNCTIONAL */}
          <View className="flex-row bg-gray-100 rounded-xl p-1">
            {[
              { key: 'week' as Period, label: 'Semana' },
              { key: 'month' as Period, label: 'Mes' },
              { key: 'year' as Period, label: 'Ano' },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                className={`flex-1 py-2 rounded-lg ${
                  period === item.key ? 'bg-white shadow-sm' : ''
                }`}
                onPress={() => setPeriod(item.key)}
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

          {/* Category Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setSelectedCategoryId(undefined)}
                className={`px-3 py-1.5 rounded-full ${
                  !selectedCategoryId ? 'bg-primary-600' : 'bg-gray-100'
                }`}
              >
                <Text className={`text-sm font-medium ${
                  !selectedCategoryId ? 'text-white' : 'text-gray-600'
                }`}>
                  Todas
                </Text>
              </TouchableOpacity>
              {EXPENSE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategoryId(
                    selectedCategoryId === cat.id ? undefined : cat.id
                  )}
                  className={`px-3 py-1.5 rounded-full ${
                    selectedCategoryId === cat.id ? 'bg-primary-600' : 'bg-gray-100'
                  }`}
                >
                  <Text className={`text-sm font-medium ${
                    selectedCategoryId === cat.id ? 'text-white' : 'text-gray-600'
                  }`}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* HERO: Savings Rate - visible in first 3 seconds */}
        <View className="p-6 pb-3">
          <View
            className="rounded-2xl p-5"
            style={{ backgroundColor: savingsStyle.bg }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-gray-600 font-medium">Tasa de Ahorro</Text>
              <View
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: savingsStyle.color + '20' }}
              >
                <Text className="text-sm font-bold" style={{ color: savingsStyle.color }}>
                  {savingsStyle.label}
                </Text>
              </View>
            </View>
            <Text className="text-4xl font-bold" style={{ color: savingsStyle.color }}>
              {formatPercentage(savingsRate)}
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              (Ingreso - Gasto) / Ingreso
            </Text>
          </View>
        </View>

        {/* HERO: Expense Trend */}
        <View className="px-6 pb-3">
          <View className="bg-white rounded-2xl p-4 shadow-sm flex-row items-center">
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{
                backgroundColor: expensesTrending === 'down' ? '#ECFDF5'
                  : expensesTrending === 'up' ? '#FEF2F2' : '#F3F4F6',
              }}
            >
              <Ionicons
                name={expensesTrending === 'down' ? 'trending-down' : expensesTrending === 'up' ? 'trending-up' : 'remove'}
                size={20}
                color={expensesTrending === 'down' ? '#10B981' : expensesTrending === 'up' ? '#EF4444' : '#6B7280'}
              />
            </View>
            <View className="flex-1">
              <Text className="text-gray-500 text-sm">Tendencia de gastos</Text>
              <Text
                className="font-bold text-lg"
                style={{
                  color: expensesTrending === 'down' ? '#10B981'
                    : expensesTrending === 'up' ? '#EF4444' : '#6B7280',
                }}
              >
                {expenseChangePct === 0
                  ? 'Sin cambio'
                  : `${formatPercentage(Math.abs(expenseChangePct))} ${
                      expensesTrending === 'down' ? 'menos' : 'mas'
                    } que el periodo anterior`
                }
              </Text>
            </View>
          </View>
        </View>

        {/* HERO: Balance */}
        <View className="px-6 pb-3">
          <View className="bg-primary-600 rounded-2xl p-4">
            <Text className="text-primary-200 text-sm">Balance del Periodo</Text>
            <Text className="text-white text-3xl font-bold">
              {formatCurrency(reports?.summary.balance ?? 0)}
            </Text>
          </View>
        </View>

        {/* Income / Expense Cards */}
        <View className="px-6 pb-3">
          <View className="flex-row gap-3">
            <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
              <View className="flex-row items-center mb-2">
                <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center">
                  <Ionicons name="trending-up" size={16} color="#10B981" />
                </View>
              </View>
              <Text className="text-gray-500 text-sm">Ingresos</Text>
              <Text className="text-xl font-bold text-gray-900">
                {formatCurrency(reports?.summary.income ?? 0)}
              </Text>
            </View>

            <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
              <View className="flex-row items-center mb-2">
                <View className="w-8 h-8 bg-red-100 rounded-full items-center justify-center">
                  <Ionicons name="trending-down" size={16} color="#EF4444" />
                </View>
              </View>
              <Text className="text-gray-500 text-sm">Gastos</Text>
              <Text className="text-xl font-bold text-gray-900">
                {formatCurrency(reports?.summary.expense ?? 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Member Breakdown */}
        {reports?.members && reports.members.length > 0 && (
          <View className="px-6 pb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Contribucion por Miembro
            </Text>

            <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {reports.members.map((member, index) => {
                const totalIncome = reports.summary.income || 1;
                const contributionPct = totalIncome > 0
                  ? (Number(member.income) / Number(totalIncome)) * 100
                  : 0;

                return (
                  <View
                    key={member.user_id}
                    className={`p-4 ${
                      index < reports.members.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center mr-3">
                          <Ionicons name="person" size={20} color="#4F46E5" />
                        </View>
                        <View>
                          <Text className="text-gray-900 font-medium">{member.user_name}</Text>
                          <Text className="text-xs text-gray-400">
                            {member.transaction_count} transacciones
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className={`font-semibold ${
                          member.balance >= 0 ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {formatCurrency(member.balance)}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row gap-4 mb-2">
                      <View className="flex-1">
                        <Text className="text-xs text-gray-400">Ingreso</Text>
                        <Text className="text-sm font-medium text-green-600">
                          {formatCurrency(member.income)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs text-gray-400">Gasto</Text>
                        <Text className="text-sm font-medium text-red-500">
                          {formatCurrency(member.expense)}
                        </Text>
                      </View>
                    </View>

                    {/* Contribution bar */}
                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full bg-primary-500"
                        style={{ width: `${Math.min(contributionPct, 100)}%` }}
                      />
                    </View>
                    <Text className="text-xs text-gray-400 mt-1">
                      {formatPercentage(contributionPct)} del ingreso total
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

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
                  {debtsSummary ? formatCurrency(debtsSummary.total_balance_mxn) : '$0'}
                </Text>
              </View>
              <View className="flex-row justify-between items-center mt-2">
                <Text className="text-gray-500 text-sm">Deudas</Text>
                <Text className="text-gray-600 font-medium">
                  {debtsSummary?.total_debts || 0}
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
                {reports?.recent_transactions_count || 0}
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
