import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransaction, useDeleteTransaction } from '@/hooks/useTransactions';
import { CATEGORIES } from '@/constants';
import {
  formatCurrency,
  formatDate,
  formatTransactionType,
  getTransactionTypeColor,
} from '@/utils/format';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: transaction, isLoading, error } = useTransaction(id);
  const deleteTransaction = useDeleteTransaction();

  const category = CATEGORIES.find((c) => c.id === transaction?.category_id);

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Transaccion',
      'Esta seguro que desea eliminar esta transaccion? Esta accion no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction.mutateAsync(id);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la transaccion');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (error || !transaction) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text className="text-xl font-semibold text-gray-900 mt-4">
          Transaccion no encontrada
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 bg-primary-600 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isIncome = transaction.type === 'INCOME';
  const amountColor = getTransactionTypeColor(transaction.type);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-14 pb-6 px-6 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Detalle</Text>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Amount Card */}
        <View className="items-center py-6">
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
            style={{ backgroundColor: `${category?.color || '#6B7280'}20` }}
          >
            <Ionicons
              name={(category?.icon || 'ellipsis-horizontal') as keyof typeof Ionicons.glyphMap}
              size={32}
              color={category?.color || '#6B7280'}
            />
          </View>
          <Text className="text-4xl font-bold" style={{ color: amountColor }}>
            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount_original, transaction.currency_code)}
          </Text>
          {transaction.currency_code !== 'MXN' && (
            <Text className="text-gray-400 mt-1">
              ~{formatCurrency(transaction.amount_base, 'MXN')} MXN
            </Text>
          )}
          <View
            className="mt-3 px-3 py-1 rounded-full"
            style={{ backgroundColor: `${amountColor}20` }}
          >
            <Text style={{ color: amountColor }} className="font-medium">
              {formatTransactionType(transaction.type)}
            </Text>
          </View>
        </View>
      </View>

      {/* Details */}
      <View className="p-6">
        {/* Receipt Image */}
        {transaction.attachment_url && (
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-500 mb-2">
              Recibo
            </Text>
            <Image
              source={{ uri: transaction.attachment_url }}
              className="w-full h-48 rounded-2xl bg-gray-100"
              resizeMode="cover"
            />
          </View>
        )}

        {/* Info Cards */}
        <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <View className="flex-row items-center px-4 py-3.5 border-b border-gray-100">
            <View className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="document-text-outline" size={20} color="#6B7280" />
            </View>
            <View className="flex-1">
              <Text className="text-sm text-gray-500">Descripcion</Text>
              <Text className="text-gray-900 font-medium">
                {transaction.description || 'Sin descripcion'}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center px-4 py-3.5 border-b border-gray-100">
            <View className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="pricetag-outline" size={20} color="#6B7280" />
            </View>
            <View className="flex-1">
              <Text className="text-sm text-gray-500">Categoria</Text>
              <Text className="text-gray-900 font-medium">
                {category?.name || 'Sin categoria'}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center px-4 py-3.5 border-b border-gray-100">
            <View className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </View>
            <View className="flex-1">
              <Text className="text-sm text-gray-500">Fecha</Text>
              <Text className="text-gray-900 font-medium">
                {formatDate(transaction.trx_date, 'EEEE, d MMMM yyyy')}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center px-4 py-3.5">
            <View className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="time-outline" size={20} color="#6B7280" />
            </View>
            <View className="flex-1">
              <Text className="text-sm text-gray-500">Registrado</Text>
              <Text className="text-gray-900 font-medium">
                {formatDate(transaction.created_at, 'd MMM yyyy, HH:mm')}
              </Text>
            </View>
          </View>
        </View>

        {/* Edit Button */}
        <TouchableOpacity className="mt-6 bg-primary-600 py-4 rounded-xl flex-row items-center justify-center">
          <Ionicons name="pencil-outline" size={20} color="white" />
          <Text className="text-white font-semibold ml-2">Editar Transaccion</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
