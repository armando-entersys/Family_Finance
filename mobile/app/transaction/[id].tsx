import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransaction, useUpdateTransaction, useDeleteTransaction } from '@/hooks/useTransactions';
import { CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants';
import { showSuccess, showError, showConfirm } from '@/utils/feedback';
import {
  formatCurrency,
  formatDate,
  formatTransactionType,
  getTransactionTypeColor,
} from '@/utils/format';
import { DateInput } from '@/components/common/DateInput';
import { CurrencyInput } from '@/components/common/CurrencyInput';
import type { TransactionType } from '@/types';

const TRANSACTION_TYPES: { label: string; value: TransactionType; color: string }[] = [
  { label: 'Gasto', value: 'EXPENSE', color: '#EF4444' },
  { label: 'Ingreso', value: 'INCOME', color: '#10B981' },
];

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: transaction, isLoading, error } = useTransaction(id);
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  // Image viewer state
  const [showImageViewer, setShowImageViewer] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editType, setEditType] = useState<TransactionType>('EXPENSE');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number>(1);
  const [editDate, setEditDate] = useState('');
  const [editIsInvoiced, setEditIsInvoiced] = useState(false);

  // Initialize edit form when transaction loads
  useEffect(() => {
    if (transaction) {
      setEditType(transaction.type);
      setEditAmount(transaction.amount_original.toString());
      setEditDescription(transaction.description || '');
      setEditCategoryId(transaction.category_id || 1);
      setEditDate(transaction.trx_date.split('T')[0]);
      setEditIsInvoiced(transaction.is_invoiced || false);
    }
  }, [transaction]);

  const category = CATEGORIES.find((c) => c.id === transaction?.category_id);

  const handleDelete = () => {
    showConfirm(
      'Eliminar Transaccion',
      'Esta seguro que desea eliminar esta transaccion? Esta accion no se puede deshacer.',
      async () => {
        try {
          await deleteTransaction.mutateAsync(id);
          showSuccess('Transaccion eliminada', () => {
            router.back();
          });
        } catch (error) {
          showError('No se pudo eliminar la transaccion');
        }
      }
    );
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editAmount || parseFloat(editAmount) <= 0) {
      showError('Ingresa un monto valido');
      return;
    }

    try {
      await updateTransaction.mutateAsync({
        id,
        data: {
          amount_original: parseFloat(editAmount),
          type: editType,
          category_id: editCategoryId,
          description: editDescription || undefined,
          trx_date: new Date(editDate).toISOString(),
          is_invoiced: editIsInvoiced,
        },
      });
      setShowEditModal(false);
      showSuccess('Transaccion actualizada correctamente');
    } catch (error) {
      console.error('Update error:', error);
      showError('No se pudo actualizar la transaccion');
    }
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
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
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
              <TouchableOpacity
                onPress={() => setShowImageViewer(true)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: transaction.attachment_url }}
                  className="w-full h-48 rounded-2xl bg-gray-100"
                  resizeMode="cover"
                />
                <View className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1.5">
                  <Ionicons name="expand-outline" size={16} color="white" />
                </View>
              </TouchableOpacity>
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

            <View className="flex-row items-center px-4 py-3.5 border-b border-gray-100">
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

            {transaction.user_name && (
              <View className="flex-row items-center px-4 py-3.5 border-b border-gray-100">
                <View className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="person-outline" size={20} color="#6B7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500">Registrado por</Text>
                  <Text className="text-gray-900 font-medium">
                    {transaction.user_name}
                  </Text>
                </View>
              </View>
            )}

            <View className="flex-row items-center px-4 py-3.5">
              <View
                className="w-9 h-9 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: transaction.is_invoiced ? '#D1FAE5' : '#F3F4F6' }}
              >
                <Ionicons
                  name="receipt"
                  size={20}
                  color={transaction.is_invoiced ? '#10B981' : '#6B7280'}
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-500">Factura SAT</Text>
                <Text className={`font-medium ${transaction.is_invoiced ? 'text-green-600' : 'text-gray-900'}`}>
                  {transaction.is_invoiced ? 'Facturado' : 'Sin factura'}
                </Text>
              </View>
            </View>
          </View>

          {/* Edit Button */}
          <TouchableOpacity
            onPress={handleEdit}
            className="mt-6 bg-primary-600 py-4 rounded-xl flex-row items-center justify-center"
          >
            <Ionicons name="pencil-outline" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">Editar Transaccion</Text>
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity
            onPress={handleDelete}
            className="mt-3 bg-red-50 py-4 rounded-xl flex-row items-center justify-center"
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text className="text-red-500 font-semibold ml-2">Eliminar Transaccion</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Image Viewer Modal */}
      {transaction.attachment_url && (
        <Modal visible={showImageViewer} animationType="fade" transparent>
          <View className="flex-1 bg-black">
            <TouchableOpacity
              onPress={() => setShowImageViewer(false)}
              className="absolute top-14 right-4 z-10 bg-white/20 rounded-full p-2"
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <View className="flex-1 items-center justify-center">
              <Image
                source={{ uri: transaction.attachment_url }}
                className="w-full h-full"
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10 max-h-[90%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">Editar Transaccion</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Transaction Type Toggle */}
              <View className="flex-row bg-gray-100 rounded-xl p-1 mb-4">
                {TRANSACTION_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => {
                      setEditType(t.value);
                      // Reset category to first of new type
                      const categories = t.value === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
                      setEditCategoryId(categories[0].id);
                    }}
                    className={`flex-1 py-3 rounded-lg ${
                      editType === t.value ? 'bg-white shadow-sm' : ''
                    }`}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        editType === t.value ? 'text-gray-900' : 'text-gray-500'
                      }`}
                      style={editType === t.value ? { color: t.color } : {}}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <CurrencyInput
                label="Monto"
                value={editAmount}
                onChange={setEditAmount}
                placeholder="0.00"
                className="mb-4"
              />

              {/* Description */}
              <Text className="text-gray-600 mb-2">Descripcion</Text>
              <TextInput
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Ej: Supermercado, Gasolina..."
                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-4"
              />

              {/* Date */}
              <DateInput
                label="Fecha"
                value={editDate}
                onChange={setEditDate}
                placeholder="Seleccionar fecha"
              />
              <View className="mb-4" />

              {/* Category Selection */}
              <Text className="text-gray-600 mb-2">Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row gap-2">
                  {(editType === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setEditCategoryId(cat.id)}
                      className={`px-4 py-2 rounded-full flex-row items-center ${
                        editCategoryId === cat.id ? 'bg-primary-600' : 'bg-gray-100'
                      }`}
                    >
                      <Ionicons
                        name={cat.icon as keyof typeof Ionicons.glyphMap}
                        size={18}
                        color={editCategoryId === cat.id ? 'white' : cat.color}
                      />
                      <Text
                        className={`ml-2 font-medium ${
                          editCategoryId === cat.id ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* SAT Invoice Toggle */}
              <TouchableOpacity
                onPress={() => setEditIsInvoiced(!editIsInvoiced)}
                className={`flex-row items-center justify-between p-4 rounded-xl mb-6 ${
                  editIsInvoiced ? 'bg-green-50' : 'bg-gray-100'
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="receipt"
                    size={24}
                    color={editIsInvoiced ? '#10B981' : '#6B7280'}
                  />
                  <View className="ml-3">
                    <Text className={`font-medium ${editIsInvoiced ? 'text-green-700' : 'text-gray-700'}`}>
                      Factura SAT
                    </Text>
                    <Text className="text-sm text-gray-500">
                      {editIsInvoiced ? 'Tiene factura fiscal' : 'Sin factura fiscal'}
                    </Text>
                  </View>
                </View>
                <View
                  className={`w-12 h-7 rounded-full p-1 ${
                    editIsInvoiced ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <View
                    className={`w-5 h-5 rounded-full bg-white ${
                      editIsInvoiced ? 'ml-auto' : ''
                    }`}
                  />
                </View>
              </TouchableOpacity>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={updateTransaction.isPending}
                className="bg-primary-600 py-4 rounded-xl items-center"
              >
                {updateTransaction.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-lg">Guardar Cambios</Text>
                )}
              </TouchableOpacity>

              {/* Delete from Edit Modal */}
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  setTimeout(handleDelete, 300);
                }}
                className="mt-3 py-4 rounded-xl items-center"
              >
                <Text className="text-red-500 font-semibold">Eliminar Transaccion</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
