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
import { useGoals, useCreateGoal, useAddContribution } from '@/hooks/useGoals';
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
  const addContributionMutation = useAddContribution();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // Create goal form state
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalIcon, setNewGoalIcon] = useState('sparkles');

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
