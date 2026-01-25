import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatPercentage } from '@/utils/format';

// Placeholder data - would be replaced with actual API calls
const MOCK_GOALS = [
  {
    id: '1',
    name: 'Vacaciones de Verano',
    icon: 'airplane',
    target_amount: 50000,
    current_saved: 32000,
    currency_code: 'MXN',
    progress_percentage: 64,
    deadline: '2026-07-15',
  },
  {
    id: '2',
    name: 'Fondo de Emergencia',
    icon: 'shield-checkmark',
    target_amount: 100000,
    current_saved: 45000,
    currency_code: 'MXN',
    progress_percentage: 45,
    deadline: null,
  },
  {
    id: '3',
    name: 'Nuevo Auto',
    icon: 'car',
    target_amount: 200000,
    current_saved: 15000,
    currency_code: 'MXN',
    progress_percentage: 7.5,
    deadline: '2027-01-01',
  },
];

export default function GoalsScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-14 pb-6 px-6 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900">Metas de Ahorro</Text>
          <TouchableOpacity className="w-10 h-10 bg-primary-600 rounded-full items-center justify-center">
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <Text className="text-gray-500 mt-1">Tus cochinitos financieros</Text>
      </View>

      {/* Goals List */}
      <View className="p-6">
        {MOCK_GOALS.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
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
                    Meta: {new Date(goal.deadline).toLocaleDateString('es-MX', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                )}
              </View>
            </View>

            {/* Quick Add Button */}
            <TouchableOpacity className="mt-4 flex-row items-center justify-center py-3 bg-primary-50 rounded-xl">
              <Ionicons name="add-circle" size={20} color="#4F46E5" />
              <Text className="text-primary-600 font-semibold ml-2">
                Agregar Ahorro
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {/* Empty State */}
        {MOCK_GOALS.length === 0 && (
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
          </View>
        )}
      </View>
    </ScrollView>
  );
}
