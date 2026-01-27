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
import { useDebts, useDebtSummary, useCreateDebt, useAddPayment } from '@/hooks/useDebts';
import type { Debt, CreateDebtData } from '@/services/debts';

const DEBT_TYPES = [
  { id: 'credit_card', name: 'Tarjeta de Credito', icon: 'card', color: '#EF4444' },
  { id: 'personal_loan', name: 'Prestamo Personal', icon: 'cash', color: '#F59E0B' },
  { id: 'mortgage', name: 'Hipoteca', icon: 'home', color: '#3B82F6' },
  { id: 'car_loan', name: 'Auto', icon: 'car', color: '#8B5CF6' },
  { id: 'other', name: 'Otro', icon: 'ellipsis-horizontal', color: '#6B7280' },
] as const;

const getDebtTypeInfo = (type: string) => {
  return DEBT_TYPES.find((t) => t.id === type) || DEBT_TYPES[4];
};

export default function DebtsScreen() {
  const { data: debts, isLoading, refetch, isRefetching } = useDebts();
  const { data: summary } = useDebtSummary();
  const createDebtMutation = useCreateDebt();
  const addPaymentMutation = useAddPayment();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  // Create debt form state
  const [newCreditor, setNewCreditor] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDebtType, setNewDebtType] = useState<CreateDebtData['debt_type']>('credit_card');

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');

  const handleCreateDebt = async () => {
    if (!newCreditor.trim() || !newAmount) {
      Alert.alert('Error', 'Ingresa acreedor y monto');
      return;
    }

    try {
      await createDebtMutation.mutateAsync({
        creditor: newCreditor.trim(),
        total_amount: parseFloat(newAmount),
        current_balance: parseFloat(newAmount),
        debt_type: newDebtType,
        currency_code: 'MXN',
      });
      setShowCreateModal(false);
      setNewCreditor('');
      setNewAmount('');
      setNewDebtType('credit_card');
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la deuda');
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount || !selectedDebt) {
      Alert.alert('Error', 'Ingresa el monto del pago');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount > selectedDebt.current_balance) {
      Alert.alert('Aviso', 'El pago excede el saldo pendiente. Se registrara como pago total.');
    }

    try {
      await addPaymentMutation.mutateAsync({
        debtId: selectedDebt.id,
        data: { amount },
      });
      setShowPaymentModal(false);
      setPaymentAmount('');
      setSelectedDebt(null);
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar el pago');
    }
  };

  const openPaymentModal = (debt: Debt) => {
    setSelectedDebt(debt);
    setShowPaymentModal(true);
  };

  const calculateProgress = (debt: Debt) => {
    const paid = debt.total_amount - debt.current_balance;
    return (paid / debt.total_amount) * 100;
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#EF4444" />
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
            <Text className="text-2xl font-bold text-gray-900">Deudas</Text>
            <TouchableOpacity
              className="w-10 h-10 bg-red-500 rounded-full items-center justify-center"
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-gray-500 mt-1">Controla tus compromisos</Text>
        </View>

        {/* Summary Card */}
        {summary && summary.total_debts > 0 && (
          <View className="mx-6 mt-6 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-5">
            <Text className="text-red-100 text-sm">Deuda Total</Text>
            <Text className="text-white text-3xl font-bold mt-1">
              {formatCurrency(summary.total_balance_mxn, 'MXN')}
            </Text>
            <View className="flex-row mt-3">
              <View className="flex-1">
                <Text className="text-red-100 text-xs">Deudas Activas</Text>
                <Text className="text-white font-semibold">{summary.total_debts}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Debts List */}
        <View className="p-6">
          {debts?.map((debt) => {
            const typeInfo = getDebtTypeInfo(debt.debt_type);
            const progress = calculateProgress(debt);
            const isPaidOff = debt.current_balance <= 0;

            return (
              <TouchableOpacity
                key={debt.id}
                className={`bg-white rounded-2xl p-4 mb-4 shadow-sm ${
                  isPaidOff ? 'opacity-60' : ''
                }`}
                activeOpacity={0.7}
              >
                <View className="flex-row items-start">
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: `${typeInfo.color}15` }}
                  >
                    <Ionicons
                      name={typeInfo.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={typeInfo.color}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900">
                      {debt.creditor}
                    </Text>
                    <Text className="text-gray-400 text-sm">{typeInfo.name}</Text>
                  </View>
                  {isPaidOff && (
                    <View className="bg-green-100 px-2 py-1 rounded-full">
                      <Text className="text-green-600 text-xs font-semibold">Pagada</Text>
                    </View>
                  )}
                </View>

                {/* Balance */}
                <View className="mt-3 flex-row justify-between items-baseline">
                  <View>
                    <Text className="text-gray-400 text-xs">Saldo pendiente</Text>
                    <Text className="text-2xl font-bold" style={{ color: typeInfo.color }}>
                      {formatCurrency(debt.current_balance, debt.currency_code)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-gray-400 text-xs">Deuda original</Text>
                    <Text className="text-gray-500">
                      {formatCurrency(debt.total_amount, debt.currency_code)}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View className="mt-3">
                  <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(progress, 100)}%`,
                        backgroundColor: progress >= 100 ? '#10B981' : typeInfo.color,
                      }}
                    />
                  </View>
                  <Text className="text-xs text-gray-400 mt-1">
                    {formatPercentage(progress)} pagado
                  </Text>
                </View>

                {/* Payment Button */}
                {!isPaidOff && (
                  <TouchableOpacity
                    className="mt-4 flex-row items-center justify-center py-3 rounded-xl"
                    style={{ backgroundColor: `${typeInfo.color}15` }}
                    onPress={() => openPaymentModal(debt)}
                  >
                    <Ionicons name="wallet" size={20} color={typeInfo.color} />
                    <Text style={{ color: typeInfo.color }} className="font-semibold ml-2">
                      Registrar Pago
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Empty State */}
          {(!debts || debts.length === 0) && (
            <View className="items-center py-12">
              <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="checkmark-circle" size={40} color="#10B981" />
              </View>
              <Text className="text-xl font-semibold text-gray-900 text-center">
                Sin deudas registradas
              </Text>
              <Text className="text-gray-500 text-center mt-2 px-8">
                Registra tus deudas para llevar control de tus pagos
              </Text>
              <TouchableOpacity
                className="mt-6 bg-red-500 px-6 py-3 rounded-xl"
                onPress={() => setShowCreateModal(true)}
              >
                <Text className="text-white font-semibold">Agregar Deuda</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Debt Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">Nueva Deuda</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 mb-2">Acreedor / Institucion</Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-4"
              placeholder="Ej: BBVA, Banco Azteca"
              value={newCreditor}
              onChangeText={setNewCreditor}
            />

            <Text className="text-gray-600 mb-2">Monto de la deuda (MXN)</Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-4"
              placeholder="15000"
              keyboardType="numeric"
              value={newAmount}
              onChangeText={setNewAmount}
            />

            <Text className="text-gray-600 mb-2">Tipo de deuda</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
              <View className="flex-row gap-2">
                {DEBT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    className={`px-4 py-3 rounded-xl flex-row items-center ${
                      newDebtType === type.id ? 'bg-red-500' : 'bg-gray-100'
                    }`}
                    onPress={() => setNewDebtType(type.id)}
                  >
                    <Ionicons
                      name={type.icon as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={newDebtType === type.id ? 'white' : '#6B7280'}
                    />
                    <Text
                      className={`ml-2 font-medium ${
                        newDebtType === type.id ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              className="bg-red-500 py-4 rounded-xl items-center"
              onPress={handleCreateDebt}
              disabled={createDebtMutation.isPending}
            >
              {createDebtMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-lg">Registrar Deuda</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Payment Modal */}
      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">
                Pago a {selectedDebt?.creditor}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentModal(false);
                  setPaymentAmount('');
                }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedDebt && (
              <View className="bg-red-50 rounded-xl p-4 mb-4">
                <Text className="text-red-400 text-sm">Saldo pendiente</Text>
                <Text className="text-2xl font-bold text-red-500">
                  {formatCurrency(selectedDebt.current_balance, selectedDebt.currency_code)}
                </Text>
              </View>
            )}

            <Text className="text-gray-600 mb-2">Monto del pago (MXN)</Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-6 text-xl"
              placeholder="0.00"
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
            />

            <TouchableOpacity
              className="bg-green-500 py-4 rounded-xl items-center"
              onPress={handleAddPayment}
              disabled={addPaymentMutation.isPending}
            >
              {addPaymentMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-lg">Confirmar Pago</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
