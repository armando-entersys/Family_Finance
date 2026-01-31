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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatPercentage } from '@/utils/format';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, useAddContribution } from '@/hooks/useGoals';
import { showSuccess, showError } from '@/utils/feedback';
import type { Goal } from '@/services/goals';

const GOAL_ICONS = [
  { name: 'airplane', label: 'Viaje' },
  { name: 'car', label: 'Auto' },
  { name: 'home', label: 'Casa' },
  { name: 'school', label: 'Educacion' },
  { name: 'medical', label: 'Salud' },
  { name: 'gift', label: 'Regalo' },
  { name: 'shield-checkmark', label: 'Emergencia' },
  { name: 'sparkles', label: 'Otro' },
];

export default function GoalsScreen() {
  const { data: goals, isLoading, refetch, isRefetching } = useGoals();
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();
  const addContributionMutation = useAddContribution();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // Create goal form state
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalIcon, setNewGoalIcon] = useState('sparkles');

  // Edit goal form state
  const [editGoalName, setEditGoalName] = useState('');
  const [editGoalAmount, setEditGoalAmount] = useState('');
  const [editGoalIcon, setEditGoalIcon] = useState('sparkles');
  const [editGoalDeadline, setEditGoalDeadline] = useState('');

  // Contribution form state
  const [contributionAmount, setContributionAmount] = useState('');
  const [isWithdrawal, setIsWithdrawal] = useState(false);

  const handleCreateGoal = async () => {
    if (!newGoalName.trim() || !newGoalAmount) {
      showError('Ingresa nombre y monto de la meta');
      return;
    }

    try {
      await createGoalMutation.mutateAsync({
        name: newGoalName.trim(),
        target_amount: parseFloat(newGoalAmount),
        icon: newGoalIcon,
        currency_code: 'MXN',
      });
      setShowCreateModal(false);
      setNewGoalName('');
      setNewGoalAmount('');
      setNewGoalIcon('sparkles');
      showSuccess('Meta creada correctamente');
    } catch (error) {
      showError('No se pudo crear la meta. Intenta de nuevo.');
    }
  };

  const openEditModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setEditGoalName(goal.name);
    setEditGoalAmount(goal.target_amount.toString());
    setEditGoalIcon(goal.icon);
    setEditGoalDeadline(goal.deadline ? goal.deadline.split('T')[0] : '');
    setShowEditModal(true);
  };

  const handleUpdateGoal = async () => {
    if (!selectedGoal) return;

    if (!editGoalName.trim() || !editGoalAmount) {
      showError('Ingresa nombre y monto de la meta');
      return;
    }

    try {
      await updateGoalMutation.mutateAsync({
        goalId: selectedGoal.id,
        data: {
          name: editGoalName.trim(),
          target_amount: parseFloat(editGoalAmount),
          icon: editGoalIcon,
          deadline: editGoalDeadline ? new Date(editGoalDeadline).toISOString() : undefined,
        },
      });
      setShowEditModal(false);
      setSelectedGoal(null);
      showSuccess('Meta actualizada correctamente');
    } catch (error) {
      showError('No se pudo actualizar la meta. Intenta de nuevo.');
    }
  };

  const openDeleteModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowDeleteModal(true);
  };

  const handleDeleteGoal = async () => {
    if (!selectedGoal) return;

    try {
      await deleteGoalMutation.mutateAsync(selectedGoal.id);
      setShowDeleteModal(false);
      setSelectedGoal(null);
      showSuccess('Meta eliminada correctamente');
    } catch (error) {
      showError('No se pudo eliminar la meta. Intenta de nuevo.');
    }
  };

  const handleAddContribution = async () => {
    if (!contributionAmount || !selectedGoal) {
      showError('Ingresa el monto');
      return;
    }

    const amount = parseFloat(contributionAmount);
    if (isWithdrawal && amount > selectedGoal.current_saved) {
      showError('El monto a retirar excede el ahorro actual');
      return;
    }

    try {
      await addContributionMutation.mutateAsync({
        goalId: selectedGoal.id,
        data: {
          amount,
          is_withdrawal: isWithdrawal,
        },
      });
      setShowContributionModal(false);
      setContributionAmount('');
      setIsWithdrawal(false);
      setSelectedGoal(null);
      showSuccess(isWithdrawal ? 'Retiro registrado' : 'Ahorro agregado correctamente');
    } catch (error) {
      showError('No se pudo registrar el movimiento');
    }
  };

  const openContributionModal = (goal: Goal, withdrawal = false) => {
    setSelectedGoal(goal);
    setIsWithdrawal(withdrawal);
    setShowContributionModal(true);
  };

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
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-gray-900">Metas de Ahorro</Text>
            <TouchableOpacity
              className="w-10 h-10 bg-primary-600 rounded-full items-center justify-center"
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-gray-500 mt-1">Tus cochinitos financieros</Text>
        </View>

        {/* Goals List */}
        <View className="p-6">
          {goals?.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
              activeOpacity={0.7}
            >
              <View className="flex-row items-start">
                <View
                  className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
                  style={{ backgroundColor: '#EEF2FF' }}
                >
                  <Ionicons
                    name={goal.icon as keyof typeof Ionicons.glyphMap}
                    size={28}
                    color="#4F46E5"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900">
                    {goal.name}
                  </Text>
                  <View className="flex-row items-baseline mt-1">
                    <Text className="text-2xl font-bold text-primary-600">
                      {formatCurrency(goal.current_saved, goal.currency_code)}
                    </Text>
                    <Text className="text-gray-400 ml-1">
                      / {formatCurrency(goal.target_amount, goal.currency_code)}
                    </Text>
                  </View>
                </View>
                {/* Edit and Delete Buttons */}
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center"
                    onPress={() => openEditModal(goal)}
                  >
                    <Ionicons name="pencil" size={18} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="w-9 h-9 bg-red-50 rounded-full items-center justify-center"
                    onPress={() => openDeleteModal(goal)}
                  >
                    <Ionicons name="trash" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Progress Bar */}
              <View className="mt-4">
                <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-primary-500 rounded-full"
                    style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                  />
                </View>
                <View className="flex-row justify-between mt-2">
                  <Text className="text-sm text-gray-500">
                    {formatPercentage(goal.progress_percentage)} completado
                  </Text>
                  {goal.deadline && (
                    <Text className="text-sm text-gray-400">
                      Meta:{' '}
                      {new Date(goal.deadline).toLocaleDateString('es-MX', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  )}
                </View>
              </View>

              {/* Action Buttons */}
              <View className="mt-4 flex-row gap-2">
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center py-3 bg-primary-50 rounded-xl"
                  onPress={() => openContributionModal(goal, false)}
                >
                  <Ionicons name="add-circle" size={20} color="#4F46E5" />
                  <Text className="text-primary-600 font-semibold ml-2">
                    Agregar
                  </Text>
                </TouchableOpacity>
                {goal.current_saved > 0 && (
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center py-3 bg-red-50 rounded-xl"
                    onPress={() => openContributionModal(goal, true)}
                  >
                    <Ionicons name="remove-circle" size={20} color="#EF4444" />
                    <Text className="text-red-500 font-semibold ml-2">
                      Retirar
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Empty State */}
          {(!goals || goals.length === 0) && (
            <View className="items-center py-12">
              <View className="w-20 h-20 bg-primary-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="flag-outline" size={40} color="#4F46E5" />
              </View>
              <Text className="text-xl font-semibold text-gray-900 text-center">
                Crea tu primera meta
              </Text>
              <Text className="text-gray-500 text-center mt-2 px-8">
                Define tus objetivos financieros y empieza a ahorrar
              </Text>
              <TouchableOpacity
                className="mt-6 bg-primary-600 px-6 py-3 rounded-xl"
                onPress={() => setShowCreateModal(true)}
              >
                <Text className="text-white font-semibold">Crear Meta</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Goal Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">Nueva Meta</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 mb-2">Nombre de la meta</Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-4"
              placeholder="Ej: Vacaciones de verano"
              value={newGoalName}
              onChangeText={setNewGoalName}
            />

            <Text className="text-gray-600 mb-2">Monto objetivo (MXN)</Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-4"
              placeholder="50000"
              keyboardType="numeric"
              value={newGoalAmount}
              onChangeText={setNewGoalAmount}
            />

            <Text className="text-gray-600 mb-2">Icono</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
              <View className="flex-row gap-2">
                {GOAL_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon.name}
                    className={`w-14 h-14 rounded-xl items-center justify-center ${
                      newGoalIcon === icon.name ? 'bg-primary-600' : 'bg-gray-100'
                    }`}
                    onPress={() => setNewGoalIcon(icon.name)}
                  >
                    <Ionicons
                      name={icon.name as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={newGoalIcon === icon.name ? 'white' : '#6B7280'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              className="bg-primary-600 py-4 rounded-xl items-center"
              onPress={handleCreateGoal}
              disabled={createGoalMutation.isPending}
            >
              {createGoalMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-lg">Crear Meta</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Goal Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">Editar Meta</Text>
              <TouchableOpacity onPress={() => {
                setShowEditModal(false);
                setSelectedGoal(null);
              }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 mb-2">Nombre de la meta</Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-4"
              placeholder="Ej: Vacaciones de verano"
              value={editGoalName}
              onChangeText={setEditGoalName}
            />

            <Text className="text-gray-600 mb-2">Monto objetivo (MXN)</Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-4"
              placeholder="50000"
              keyboardType="numeric"
              value={editGoalAmount}
              onChangeText={setEditGoalAmount}
            />

            <Text className="text-gray-600 mb-2">Fecha limite (opcional)</Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-4"
              placeholder="AAAA-MM-DD"
              value={editGoalDeadline}
              onChangeText={setEditGoalDeadline}
            />

            <Text className="text-gray-600 mb-2">Icono</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
              <View className="flex-row gap-2">
                {GOAL_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon.name}
                    className={`w-14 h-14 rounded-xl items-center justify-center ${
                      editGoalIcon === icon.name ? 'bg-primary-600' : 'bg-gray-100'
                    }`}
                    onPress={() => setEditGoalIcon(icon.name)}
                  >
                    <Ionicons
                      name={icon.name as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={editGoalIcon === icon.name ? 'white' : '#6B7280'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              className="bg-primary-600 py-4 rounded-xl items-center"
              onPress={handleUpdateGoal}
              disabled={updateGoalMutation.isPending}
            >
              {updateGoalMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-lg">Guardar Cambios</Text>
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
                Eliminar Meta
              </Text>
              <Text className="text-gray-500 text-center mt-2">
                ¿Estas seguro de eliminar "{selectedGoal?.name}"? Esta accion no se puede deshacer.
              </Text>
            </View>

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                className="flex-1 py-3 bg-gray-100 rounded-xl items-center"
                onPress={() => {
                  setShowDeleteModal(false);
                  setSelectedGoal(null);
                }}
              >
                <Text className="text-gray-700 font-semibold">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 bg-red-500 rounded-xl items-center"
                onPress={handleDeleteGoal}
                disabled={deleteGoalMutation.isPending}
              >
                {deleteGoalMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold">Eliminar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Contribution Modal */}
      <Modal visible={showContributionModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">
                {isWithdrawal ? 'Retirar de' : 'Agregar a'} {selectedGoal?.name}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowContributionModal(false);
                  setContributionAmount('');
                }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedGoal && (
              <View className="bg-gray-100 rounded-xl p-4 mb-4">
                <Text className="text-gray-500 text-sm">Saldo actual</Text>
                <Text className="text-2xl font-bold text-gray-900">
                  {formatCurrency(selectedGoal.current_saved, selectedGoal.currency_code)}
                </Text>
              </View>
            )}

            <Text className="text-gray-600 mb-2">
              Monto a {isWithdrawal ? 'retirar' : 'agregar'} (MXN)
            </Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-6 text-xl"
              placeholder="0.00"
              keyboardType="numeric"
              value={contributionAmount}
              onChangeText={setContributionAmount}
            />

            {isWithdrawal && (
              <View className="bg-yellow-50 rounded-xl p-4 mb-4 flex-row items-start">
                <Ionicons name="warning" size={20} color="#F59E0B" />
                <Text className="text-yellow-700 ml-2 flex-1">
                  Los retiros reducen tu progreso hacia la meta
                </Text>
              </View>
            )}

            <TouchableOpacity
              className={`py-4 rounded-xl items-center ${
                isWithdrawal ? 'bg-red-500' : 'bg-primary-600'
              }`}
              onPress={handleAddContribution}
              disabled={addContributionMutation.isPending}
            >
              {addContributionMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-lg">
                  {isWithdrawal ? 'Confirmar Retiro' : 'Agregar Ahorro'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
