import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatPercentage } from '@/utils/format';
import {
  useRecurringExpenses,
  useCreateRecurringExpense,
  useUpdateRecurringExpense,
  useDeleteRecurringExpense,
  useExecuteRecurringExpense,
} from '@/hooks/useRecurringExpenses';
import {
  useCategoryBudgetsStatus,
  useCreateCategoryBudget,
  useUpdateCategoryBudget,
  useDeleteCategoryBudget,
} from '@/hooks/useCategoryBudgets';
import { showSuccess, showError } from '@/utils/feedback';
import { EXPENSE_CATEGORIES, FREQUENCIES, BUDGET_PERIODS } from '@/constants';
import { DateInput } from '@/components/common/DateInput';
import type { RecurringExpense, FrequencyType } from '@/services/recurringExpenses';
import type { CategoryBudgetStatus, BudgetPeriod } from '@/services/categoryBudgets';

const getFrequencyName = (freq: string) => {
  return FREQUENCIES.find((f) => f.id === freq)?.name || freq;
};

const getCategoryInfo = (categoryId: number | null) => {
  return EXPENSE_CATEGORIES.find((c) => c.id === categoryId) || null;
};

export default function RecurringScreen() {
  const { data: expenses, isLoading: expensesLoading, refetch, isRefetching } = useRecurringExpenses();
  const { data: budgetStatuses, isLoading: budgetsLoading, refetch: refetchBudgets } = useCategoryBudgetsStatus();

  const createExpenseMutation = useCreateRecurringExpense();
  const updateExpenseMutation = useUpdateRecurringExpense();
  const deleteExpenseMutation = useDeleteRecurringExpense();
  const executeExpenseMutation = useExecuteRecurringExpense();
  const createBudgetMutation = useCreateCategoryBudget();
  const updateBudgetMutation = useUpdateCategoryBudget();
  const deleteBudgetMutation = useDeleteCategoryBudget();

  // Modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<RecurringExpense | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<CategoryBudgetStatus | null>(null);

  // Expense form state
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<number | null>(null);
  const [expenseFrequency, setExpenseFrequency] = useState<FrequencyType>('MONTHLY');
  const [expenseNextDate, setExpenseNextDate] = useState('');
  const [expenseIsAutomatic, setExpenseIsAutomatic] = useState(false);

  // Budget form state
  const [budgetCategory, setBudgetCategory] = useState<number | null>(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>('MONTHLY');
  const [budgetThreshold, setBudgetThreshold] = useState('80');

  const resetExpenseForm = () => {
    setExpenseName('');
    setExpenseAmount('');
    setExpenseCategory(null);
    setExpenseFrequency('MONTHLY');
    setExpenseNextDate('');
    setExpenseIsAutomatic(false);
    setIsEditing(false);
    setSelectedExpense(null);
  };

  const resetBudgetForm = () => {
    setBudgetCategory(null);
    setBudgetAmount('');
    setBudgetPeriod('MONTHLY');
    setBudgetThreshold('80');
    setIsEditing(false);
    setSelectedBudget(null);
  };

  const openCreateExpenseModal = () => {
    resetExpenseForm();
    const today = new Date().toISOString().split('T')[0];
    setExpenseNextDate(today);
    setShowExpenseModal(true);
  };

  const openEditExpenseModal = (expense: RecurringExpense) => {
    setSelectedExpense(expense);
    setExpenseName(expense.name);
    setExpenseAmount(expense.amount.toString());
    setExpenseCategory(expense.category_id);
    setExpenseFrequency(expense.frequency);
    setExpenseNextDate(expense.next_due_date);
    setExpenseIsAutomatic(expense.is_automatic);
    setIsEditing(true);
    setShowExpenseModal(true);
  };

  const openDeleteExpenseModal = (expense: RecurringExpense) => {
    setSelectedExpense(expense);
    setSelectedBudget(null);
    setShowDeleteModal(true);
  };

  const openCreateBudgetModal = () => {
    resetBudgetForm();
    setShowBudgetModal(true);
  };

  const openEditBudgetModal = (budget: CategoryBudgetStatus) => {
    setSelectedBudget(budget);
    setBudgetCategory(budget.category_id);
    setBudgetAmount(budget.budget_amount.toString());
    setBudgetPeriod(budget.period as BudgetPeriod);
    setBudgetThreshold(budget.alert_threshold.toString());
    setIsEditing(true);
    setShowBudgetModal(true);
  };

  const openDeleteBudgetModal = (budget: CategoryBudgetStatus) => {
    setSelectedBudget(budget);
    setSelectedExpense(null);
    setShowDeleteModal(true);
  };

  const handleSaveExpense = async () => {
    if (!expenseName.trim() || !expenseAmount || !expenseNextDate) {
      showError('Ingresa nombre, monto y fecha');
      return;
    }

    try {
      if (isEditing && selectedExpense) {
        await updateExpenseMutation.mutateAsync({
          id: selectedExpense.id,
          data: {
            name: expenseName.trim(),
            amount: parseFloat(expenseAmount),
            category_id: expenseCategory,
            frequency: expenseFrequency,
            next_due_date: expenseNextDate,
            is_automatic: expenseIsAutomatic,
          },
        });
        showSuccess('Gasto recurrente actualizado');
      } else {
        await createExpenseMutation.mutateAsync({
          name: expenseName.trim(),
          amount: parseFloat(expenseAmount),
          category_id: expenseCategory || undefined,
          frequency: expenseFrequency,
          next_due_date: expenseNextDate,
          is_automatic: expenseIsAutomatic,
        });
        showSuccess('Gasto recurrente creado');
      }
      setShowExpenseModal(false);
      resetExpenseForm();
    } catch (error) {
      showError('Error al guardar el gasto recurrente');
    }
  };

  const handleSaveBudget = async () => {
    if (!budgetCategory || !budgetAmount) {
      showError('Selecciona categoria y monto');
      return;
    }

    try {
      if (isEditing && selectedBudget) {
        await updateBudgetMutation.mutateAsync({
          id: selectedBudget.id,
          data: {
            budget_amount: parseFloat(budgetAmount),
            period: budgetPeriod,
            alert_threshold: parseInt(budgetThreshold),
          },
        });
        showSuccess('Presupuesto actualizado');
      } else {
        await createBudgetMutation.mutateAsync({
          category_id: budgetCategory,
          budget_amount: parseFloat(budgetAmount),
          period: budgetPeriod,
          alert_threshold: parseInt(budgetThreshold),
        });
        showSuccess('Presupuesto creado');
      }
      setShowBudgetModal(false);
      resetBudgetForm();
    } catch (error: any) {
      if (error?.response?.data?.detail?.includes('already exists')) {
        showError('Ya existe un presupuesto para esta categoria');
      } else {
        showError('Error al guardar el presupuesto');
      }
    }
  };

  const handleDelete = async () => {
    try {
      if (selectedExpense) {
        await deleteExpenseMutation.mutateAsync(selectedExpense.id);
        showSuccess('Gasto recurrente eliminado');
      } else if (selectedBudget) {
        await deleteBudgetMutation.mutateAsync(selectedBudget.id);
        showSuccess('Presupuesto eliminado');
      }
      setShowDeleteModal(false);
      setSelectedExpense(null);
      setSelectedBudget(null);
    } catch (error) {
      showError('Error al eliminar');
    }
  };

  const handleExecuteExpense = async (expense: RecurringExpense) => {
    try {
      await executeExpenseMutation.mutateAsync({ id: expense.id });
      showSuccess('Gasto registrado correctamente');
    } catch (error) {
      showError('Error al registrar el gasto');
    }
  };

  const handleRefresh = () => {
    refetch();
    refetchBudgets();
  };

  const isLoading = expensesLoading || budgetsLoading;

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View className="bg-white pt-14 pb-6 px-6 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900">Gastos Recurrentes</Text>
          <Text className="text-gray-500 mt-1">Automatiza tus pagos fijos</Text>
        </View>

        {/* Recurring Expenses Section */}
        <View className="p-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">Gastos Programados</Text>
            <TouchableOpacity
              className="w-9 h-9 bg-purple-500 rounded-full items-center justify-center"
              onPress={openCreateExpenseModal}
            >
              <Ionicons name="add" size={22} color="white" />
            </TouchableOpacity>
          </View>

          {expenses?.map((expense) => {
            const category = getCategoryInfo(expense.category_id);
            const isOverdue = new Date(expense.next_due_date) <= new Date();

            return (
              <View
                key={expense.id}
                className={`bg-white rounded-2xl p-4 mb-3 shadow-sm ${
                  isOverdue ? 'border-2 border-amber-400' : ''
                }`}
              >
                <View className="flex-row items-start">
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: category ? `${category.color}15` : '#8B5CF615' }}
                  >
                    <Ionicons
                      name={(category?.icon || 'repeat') as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={category?.color || '#8B5CF6'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">{expense.name}</Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <Text className="text-xs text-gray-400">{getFrequencyName(expense.frequency)}</Text>
                      {expense.is_automatic && (
                        <View className="bg-green-100 px-2 py-0.5 rounded">
                          <Text className="text-green-600 text-xs">Auto</Text>
                        </View>
                      )}
                      {isOverdue && (
                        <View className="bg-amber-100 px-2 py-0.5 rounded">
                          <Text className="text-amber-600 text-xs">Pendiente</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-lg font-bold text-gray-900">
                      {formatCurrency(expense.amount, expense.currency_code)}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {new Date(expense.next_due_date).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                </View>

                <View className="flex-row gap-2 mt-3">
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center py-2 bg-purple-50 rounded-xl"
                    onPress={() => handleExecuteExpense(expense)}
                    disabled={executeExpenseMutation.isPending}
                  >
                    {executeExpenseMutation.isPending ? (
                      <ActivityIndicator size="small" color="#8B5CF6" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
                        <Text className="text-purple-600 font-medium ml-1">Registrar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="w-10 h-10 bg-gray-100 rounded-xl items-center justify-center"
                    onPress={() => openEditExpenseModal(expense)}
                  >
                    <Ionicons name="pencil" size={18} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center"
                    onPress={() => openDeleteExpenseModal(expense)}
                  >
                    <Ionicons name="trash" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {(!expenses || expenses.length === 0) && (
            <View className="bg-white rounded-2xl p-6 items-center">
              <Ionicons name="repeat-outline" size={40} color="#D1D5DB" />
              <Text className="text-gray-400 mt-2 text-center">
                No tienes gastos recurrentes
              </Text>
            </View>
          )}
        </View>

        {/* Category Budgets Section */}
        <View className="px-6 pb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">Presupuestos</Text>
            <TouchableOpacity
              className="w-9 h-9 bg-blue-500 rounded-full items-center justify-center"
              onPress={openCreateBudgetModal}
            >
              <Ionicons name="add" size={22} color="white" />
            </TouchableOpacity>
          </View>

          {budgetStatuses?.map((budget) => {
            const category = getCategoryInfo(budget.category_id);
            const barColor = budget.is_over_budget
              ? '#EF4444'
              : budget.is_alert_triggered
              ? '#F59E0B'
              : '#10B981';

            return (
              <View key={budget.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className="w-10 h-10 rounded-lg items-center justify-center mr-3"
                      style={{ backgroundColor: category ? `${category.color}15` : '#3B82F615' }}
                    >
                      <Ionicons
                        name={(category?.icon || 'wallet') as keyof typeof Ionicons.glyphMap}
                        size={20}
                        color={category?.color || '#3B82F6'}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-900">
                        {budget.category_name || category?.name || 'Categoria'}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        {budget.period === 'WEEKLY' ? 'Semanal' : 'Mensual'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-1">
                    <TouchableOpacity
                      className="w-8 h-8 bg-gray-100 rounded-lg items-center justify-center"
                      onPress={() => openEditBudgetModal(budget)}
                    >
                      <Ionicons name="pencil" size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="w-8 h-8 bg-red-50 rounded-lg items-center justify-center"
                      onPress={() => openDeleteBudgetModal(budget)}
                    >
                      <Ionicons name="trash" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mt-3">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-sm text-gray-600">
                      {formatCurrency(budget.spent_amount, budget.currency_code)} gastado
                    </Text>
                    <Text className="text-sm text-gray-400">
                      de {formatCurrency(budget.budget_amount, budget.currency_code)}
                    </Text>
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
                      <Text className="text-xs text-red-500">Excedido</Text>
                    )}
                    {!budget.is_over_budget && budget.is_alert_triggered && (
                      <Text className="text-xs text-amber-500">Alerta</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {(!budgetStatuses || budgetStatuses.length === 0) && (
            <View className="bg-white rounded-2xl p-6 items-center">
              <Ionicons name="pie-chart-outline" size={40} color="#D1D5DB" />
              <Text className="text-gray-400 mt-2 text-center">
                No tienes presupuestos definidos
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create/Edit Expense Modal */}
      <Modal visible={showExpenseModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10 max-h-[90%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">
                {isEditing ? 'Editar Gasto' : 'Nuevo Gasto Recurrente'}
              </Text>
              <TouchableOpacity onPress={() => setShowExpenseModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-gray-600 mb-2">Nombre</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-4"
                placeholder="Ej: Netflix, Renta"
                value={expenseName}
                onChangeText={setExpenseName}
              />

              <Text className="text-gray-600 mb-2">Monto (MXN)</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-4"
                placeholder="199"
                keyboardType="numeric"
                value={expenseAmount}
                onChangeText={setExpenseAmount}
              />

              <Text className="text-gray-600 mb-2">Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row gap-2">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      className={`px-3 py-2 rounded-xl flex-row items-center ${
                        expenseCategory === cat.id ? 'bg-purple-500' : 'bg-gray-100'
                      }`}
                      onPress={() => setExpenseCategory(cat.id)}
                    >
                      <Ionicons
                        name={cat.icon as keyof typeof Ionicons.glyphMap}
                        size={16}
                        color={expenseCategory === cat.id ? 'white' : cat.color}
                      />
                      <Text
                        className={`ml-1 text-sm ${
                          expenseCategory === cat.id ? 'text-white' : 'text-gray-600'
                        }`}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text className="text-gray-600 mb-2">Frecuencia</Text>
              <View className="flex-row gap-2 mb-4">
                {FREQUENCIES.map((freq) => (
                  <TouchableOpacity
                    key={freq.id}
                    className={`flex-1 py-3 rounded-xl items-center ${
                      expenseFrequency === freq.id ? 'bg-purple-500' : 'bg-gray-100'
                    }`}
                    onPress={() => setExpenseFrequency(freq.id as FrequencyType)}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        expenseFrequency === freq.id ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      {freq.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <DateInput
                label="Proxima fecha"
                value={expenseNextDate}
                onChange={setExpenseNextDate}
                placeholder="Seleccionar fecha"
              />
              <View className="mb-4" />

              <TouchableOpacity
                className={`flex-row items-center justify-between p-4 rounded-xl mb-6 ${
                  expenseIsAutomatic ? 'bg-green-50' : 'bg-gray-100'
                }`}
                onPress={() => setExpenseIsAutomatic(!expenseIsAutomatic)}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name={expenseIsAutomatic ? 'flash' : 'flash-outline'}
                    size={20}
                    color={expenseIsAutomatic ? '#10B981' : '#6B7280'}
                  />
                  <Text className="ml-2 text-gray-700">Registro automatico</Text>
                </View>
                <View
                  className={`w-6 h-6 rounded-full items-center justify-center ${
                    expenseIsAutomatic ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  {expenseIsAutomatic && <Ionicons name="checkmark" size={16} color="white" />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-purple-500 py-4 rounded-xl items-center"
                onPress={handleSaveExpense}
                disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
              >
                {createExpenseMutation.isPending || updateExpenseMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-lg">
                    {isEditing ? 'Guardar Cambios' : 'Crear Gasto'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create/Edit Budget Modal */}
      <Modal visible={showBudgetModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">
                {isEditing ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
              </Text>
              <TouchableOpacity onPress={() => setShowBudgetModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {!isEditing && (
              <>
                <Text className="text-gray-600 mb-2">Categoria</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  <View className="flex-row gap-2">
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        className={`px-3 py-2 rounded-xl flex-row items-center ${
                          budgetCategory === cat.id ? 'bg-blue-500' : 'bg-gray-100'
                        }`}
                        onPress={() => setBudgetCategory(cat.id)}
                      >
                        <Ionicons
                          name={cat.icon as keyof typeof Ionicons.glyphMap}
                          size={16}
                          color={budgetCategory === cat.id ? 'white' : cat.color}
                        />
                        <Text
                          className={`ml-1 text-sm ${
                            budgetCategory === cat.id ? 'text-white' : 'text-gray-600'
                          }`}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <Text className="text-gray-600 mb-2">Monto limite (MXN)</Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-4"
              placeholder="5000"
              keyboardType="numeric"
              value={budgetAmount}
              onChangeText={setBudgetAmount}
            />

            <Text className="text-gray-600 mb-2">Periodo</Text>
            <View className="flex-row gap-2 mb-4">
              {BUDGET_PERIODS.map((period) => (
                <TouchableOpacity
                  key={period.id}
                  className={`flex-1 py-3 rounded-xl items-center ${
                    budgetPeriod === period.id ? 'bg-blue-500' : 'bg-gray-100'
                  }`}
                  onPress={() => setBudgetPeriod(period.id as BudgetPeriod)}
                >
                  <Text
                    className={`font-medium ${
                      budgetPeriod === period.id ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {period.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-gray-600 mb-2">Alerta al llegar a (%)</Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-6"
              placeholder="80"
              keyboardType="numeric"
              value={budgetThreshold}
              onChangeText={setBudgetThreshold}
            />

            <TouchableOpacity
              className="bg-blue-500 py-4 rounded-xl items-center"
              onPress={handleSaveBudget}
              disabled={createBudgetMutation.isPending || updateBudgetMutation.isPending}
            >
              {createBudgetMutation.isPending || updateBudgetMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-lg">
                  {isEditing ? 'Guardar Cambios' : 'Crear Presupuesto'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="trash" size={32} color="#EF4444" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center">
                {selectedExpense ? 'Eliminar Gasto' : 'Eliminar Presupuesto'}
              </Text>
              <Text className="text-gray-500 text-center mt-2">
                ¿Estas seguro de eliminar{' '}
                {selectedExpense ? `"${selectedExpense.name}"` : 'este presupuesto'}?
              </Text>
            </View>

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                className="flex-1 py-3 bg-gray-100 rounded-xl items-center"
                onPress={() => {
                  setShowDeleteModal(false);
                  setSelectedExpense(null);
                  setSelectedBudget(null);
                }}
              >
                <Text className="text-gray-700 font-semibold">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 bg-red-500 rounded-xl items-center"
                onPress={handleDelete}
                disabled={deleteExpenseMutation.isPending || deleteBudgetMutation.isPending}
              >
                {deleteExpenseMutation.isPending || deleteBudgetMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold">Eliminar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
