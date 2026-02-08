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
import { useCreateTransaction, useUploadAttachment } from '@/hooks/useTransactions';
import { checkDuplicate } from '@/services/transactions';
import { scanReceipt } from '@/services/receiptScanner';
import { showSuccess, showError, showConfirm } from '@/utils/feedback';
import { DateInput } from '@/components/common/DateInput';
import { CurrencyInput } from '@/components/common/CurrencyInput';
import type { TransactionType, InvoiceData } from '@/types';

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
  const [isInvoiced, setIsInvoiced] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  const createTransaction = useCreateTransaction();
  const uploadAttachment = useUploadAttachment();

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
      // On web, use HTML5 input with capture="environment" for back camera
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.setAttribute('capture', 'environment');
        input.onchange = async (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const uri = URL.createObjectURL(file);
            setImageUri(uri);
            await processImageWithAI(uri);
          }
        };
        input.click();
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showError('Necesitamos acceso a la camara para tomar fotos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        cameraType: ImagePicker.CameraType.back,
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

      // Store invoice data if found
      if (receipt.invoice_data) {
        setInvoiceData(receipt.invoice_data);
        // Auto-enable invoice if RFC was found
        if (receipt.invoice_data.rfc) {
          setIsInvoiced(true);
        }
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
    setInvoiceData(null);
  };

  // Actually create and save the transaction
  const doSave = async () => {
    try {
      const transaction = await createTransaction.mutateAsync({
        amount_original: parseFloat(amount),
        type,
        category_id: categoryId,
        description: description || undefined,
        trx_date: new Date(date).toISOString(),
        is_invoiced: isInvoiced,
      });

      // Upload image if present and invoice is marked
      if (imageUri && isInvoiced) {
        try {
          await uploadAttachment.mutateAsync({
            transactionId: transaction.id,
            imageUri,
          });
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
        }
      }

      showSuccess('Transaccion guardada correctamente', () => {
        router.back();
      });
    } catch (error) {
      console.error('Save error:', error);
      showError('No se pudo guardar la transaccion. Intenta de nuevo.');
    }
  };

  // Save transaction with duplicate check
  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showError('Ingresa un monto valido');
      return;
    }

    try {
      // Check for duplicates
      const dupCheck = await checkDuplicate({
        amount: parseFloat(amount),
        trx_date: new Date(date).toISOString(),
        description: description || undefined,
        type,
      });

      if (dupCheck.is_duplicate) {
        showConfirm(
          'Posible duplicado',
          `Ya existe una transaccion similar: "${dupCheck.existing_description}" por $${dupCheck.existing_amount?.toFixed(2)} en la misma fecha. Deseas guardarla de todos modos?`,
          doSave
        );
        return;
      }
    } catch {
      // If check fails, proceed anyway
    }

    await doSave();
  };

  const isSaving = createTransaction.isPending || uploadAttachment.isPending;

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
              Ticket / Recibo
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
                    <ActivityIndicator color="white" />
                    <Text className="text-white font-medium mt-2">Analizando con IA...</Text>
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
              La IA llenara el formulario automaticamente
            </Text>
          </View>

          {/* SAT Invoice Toggle */}
          <TouchableOpacity
            onPress={() => setIsInvoiced(!isInvoiced)}
            className={`flex-row items-center justify-between p-4 rounded-xl mb-4 ${
              isInvoiced ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <View className="flex-row items-center flex-1">
              <Ionicons
                name="receipt"
                size={24}
                color={isInvoiced ? '#10B981' : '#6B7280'}
              />
              <View className="ml-3 flex-1">
                <Text className={`font-semibold ${isInvoiced ? 'text-green-700' : 'text-gray-700'}`}>
                  Facturar ante SAT
                </Text>
                <Text className="text-xs text-gray-500">
                  {isInvoiced ? 'Se guardara el ticket para solicitar factura' : 'Marcar si requieres factura fiscal'}
                </Text>
              </View>
            </View>
            <View
              className={`w-12 h-7 rounded-full p-1 ${
                isInvoiced ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <View
                className={`w-5 h-5 rounded-full bg-white ${
                  isInvoiced ? 'ml-auto' : ''
                }`}
              />
            </View>
          </TouchableOpacity>

          {/* Invoice Data (if available and invoice enabled) */}
          {isInvoiced && invoiceData && (invoiceData.rfc || invoiceData.business_legal_name) && (
            <View className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-100">
              <View className="flex-row items-center mb-3">
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text className="text-blue-700 font-semibold ml-2">
                  Datos para facturacion (extraidos por IA)
                </Text>
              </View>

              {invoiceData.rfc && (
                <View className="mb-2">
                  <Text className="text-xs text-blue-600 font-medium">RFC:</Text>
                  <Text className="text-blue-900">{invoiceData.rfc}</Text>
                </View>
              )}

              {invoiceData.business_legal_name && (
                <View className="mb-2">
                  <Text className="text-xs text-blue-600 font-medium">Razon Social:</Text>
                  <Text className="text-blue-900">{invoiceData.business_legal_name}</Text>
                </View>
              )}

              {invoiceData.business_address && (
                <View className="mb-2">
                  <Text className="text-xs text-blue-600 font-medium">Direccion:</Text>
                  <Text className="text-blue-900">{invoiceData.business_address}</Text>
                </View>
              )}

              {invoiceData.folio && (
                <View>
                  <Text className="text-xs text-blue-600 font-medium">Folio:</Text>
                  <Text className="text-blue-900">{invoiceData.folio}</Text>
                </View>
              )}

              <Text className="text-xs text-blue-500 mt-3 italic">
                Usa estos datos para solicitar tu factura al establecimiento
              </Text>
            </View>
          )}

          {/* Warning if invoice marked but no image */}
          {isInvoiced && !imageUri && (
            <View className="bg-amber-50 rounded-xl p-3 mb-4 flex-row items-center border border-amber-200">
              <Ionicons name="warning" size={20} color="#F59E0B" />
              <Text className="text-amber-700 ml-2 flex-1 text-sm">
                Agrega una foto del ticket para guardar el comprobante
              </Text>
            </View>
          )}

          {/* Amount */}
          <CurrencyInput
            label="Monto *"
            value={amount}
            onChange={setAmount}
            placeholder="0.00"
            className="mb-4"
          />

          {/* Description */}
          <Input
            label="Descripcion"
            value={description}
            onChangeText={setDescription}
            placeholder="Ej: Supermercado, Gasolina..."
            className="mb-4"
          />

          {/* Date */}
          <View className="mb-4">
            <DateInput
              label="Fecha"
              value={date}
              onChange={setDate}
              placeholder="Seleccionar fecha"
            />
          </View>

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
          title={isSaving ? 'Guardando...' : 'Guardar'}
          onPress={handleSave}
          loading={isSaving}
          className="w-full"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
