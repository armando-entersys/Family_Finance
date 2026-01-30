import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, RECEIPT_CATEGORY_MAP } from '@/constants';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { scanReceipt } from '@/services/receiptScanner';
import { showSuccess, showError, showFeedback } from '@/utils/feedback';
import type { TransactionType, ParsedReceipt } from '@/types';

const TRANSACTION_TYPES: { label: string; value: TransactionType; color: string }[] = [
  { label: 'Gasto', value: 'EXPENSE', color: '#EF4444' },
  { label: 'Ingreso', value: 'INCOME', color: '#10B981' },
];

export default function AddExpenseScreen() {
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number>(EXPENSE_CATEGORIES[0].id);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const createTransaction = useCreateTransaction();

  // Get categories based on transaction type
  const currentCategories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Handle type change - reset category to first of the new type
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const categories = newType === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    setCategoryId(categories[0].id);
  };

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
        await processImageWithAI(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showError('Necesitamos acceso a la camara para tomar fotos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
        await processImageWithAI(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  // Process image with Gemini AI
  const processImageWithAI = async (uri: string) => {
    setIsScanning(true);
    try {
      const { receipt } = await scanReceipt(uri);

      // Fill form with AI results
      if (receipt.total_amount) {
        setAmount(receipt.total_amount.toString());
      }
      if (receipt.merchant_name) {
        setDescription(receipt.merchant_name);
      }
      if (receipt.category) {
        setCategoryId(RECEIPT_CATEGORY_MAP[receipt.category] || EXPENSE_CATEGORIES[0].id);
      }
      if (receipt.date) {
        setDate(receipt.date);
      }

      showSuccess('Datos extraidos del recibo. Puedes modificarlos si es necesario.');
    } catch (error) {
      console.error('AI scan error:', error);
      showError('No se pudo procesar el recibo. Ingresa los datos manualmente.');
    } finally {
      setIsScanning(false);
    }
  };

  // Remove image
  const removeImage = () => {
    setImageUri(null);
  };

  // Save transaction
  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showError('Ingresa un monto valido');
      return;
    }

    try {
      await createTransaction.mutateAsync({
        amount_original: parseFloat(amount),
        type,
        category_id: categoryId,
        description: description || undefined,
        trx_date: new Date(date).toISOString(),
      });

      showSuccess('Transaccion guardada correctamente', () => {
        router.back();
      });
    } catch (error) {
      console.error('Save error:', error);
      showError('No se pudo guardar la transaccion. Intenta de nuevo.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-12 pb-4 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            Agregar Transaccion
          </Text>
          <View className="w-6" />
        </View>

        <View className="p-4">
          {/* Transaction Type Toggle */}
          <View className="flex-row bg-gray-100 rounded-xl p-1 mb-6">
            {TRANSACTION_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => handleTypeChange(t.value)}
                className={`flex-1 py-3 rounded-lg ${
                  type === t.value ? 'bg-white shadow-sm' : ''
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    type === t.value ? 'text-gray-900' : 'text-gray-500'
                  }`}
                  style={type === t.value ? { color: t.color } : {}}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Photo/Receipt Section */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Recibo (Opcional)
            </Text>
            {imageUri ? (
              <View className="relative">
                <Image
                  source={{ uri: imageUri }}
                  className="w-full h-40 rounded-xl bg-gray-100"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={removeImage}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full items-center justify-center"
                >
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
                {isScanning && (
                  <View className="absolute inset-0 bg-black/50 rounded-xl items-center justify-center">
                    <Text className="text-white font-medium">Analizando con IA...</Text>
                  </View>
                )}
              </View>
            ) : (
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={takePhoto}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-4 items-center"
                >
                  <Ionicons name="camera-outline" size={28} color="#6B7280" />
                  <Text className="text-gray-600 text-sm mt-1">Tomar Foto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={pickImage}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-4 items-center"
                >
                  <Ionicons name="images-outline" size={28} color="#6B7280" />
                  <Text className="text-gray-600 text-sm mt-1">Galeria</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text className="text-xs text-gray-400 mt-2 text-center">
              La IA llenara el formulario automaticamente si subes un recibo
            </Text>
          </View>

          {/* Amount */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Monto *</Text>
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
              <Text className="text-2xl font-bold text-gray-400 mr-2">$</Text>
              <Input
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                className="flex-1 text-2xl font-bold border-0 bg-transparent px-0"
              />
            </View>
          </View>

          {/* Description */}
          <Input
            label="Descripcion"
            value={description}
            onChangeText={setDescription}
            placeholder="Ej: Supermercado, Gasolina..."
            className="mb-4"
          />

          {/* Date */}
          <Input
            label="Fecha"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            className="mb-4"
          />

          {/* Category Selection */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {currentCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => setCategoryId(category.id)}
                    className={`px-4 py-2 rounded-full flex-row items-center ${
                      categoryId === category.id ? 'bg-primary-600' : 'bg-gray-100'
                    }`}
                  >
                    <Ionicons
                      name={category.icon as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={categoryId === category.id ? 'white' : category.color}
                    />
                    <Text
                      className={`ml-2 font-medium ${
                        categoryId === category.id ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View className="p-4 border-t border-gray-100">
        <Button
          title="Guardar"
          onPress={handleSave}
          loading={createTransaction.isPending}
          className="w-full"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
