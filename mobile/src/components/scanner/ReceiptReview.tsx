import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CATEGORIES, RECEIPT_CATEGORY_MAP } from '@/constants';
import { formatCurrency } from '@/utils/format';
import type { ParsedReceipt, TransactionCreate } from '@/types';

interface ReceiptReviewProps {
  receipt: ParsedReceipt;
  imageUri: string;
  onConfirm: (transaction: TransactionCreate) => void;
  onRetry: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ReceiptReview: React.FC<ReceiptReviewProps> = ({
  receipt,
  imageUri,
  onConfirm,
  onRetry,
  onCancel,
  isLoading = false,
}) => {
  const [merchantName, setMerchantName] = useState(receipt.merchant_name);
  const [amount, setAmount] = useState(receipt.total_amount.toString());
  const [currency, setCurrency] = useState(receipt.currency || 'MXN');
  const [date, setDate] = useState(receipt.date);
  const [selectedCategory, setSelectedCategory] = useState(
    RECEIPT_CATEGORY_MAP[receipt.category] || 9
  );
  const [description, setDescription] = useState(merchantName);

  const handleConfirm = () => {
    const transaction: TransactionCreate = {
      amount_original: parseFloat(amount) || 0,
      currency_code: currency,
      type: 'EXPENSE',
      category_id: selectedCategory,
      description: description || merchantName,
      trx_date: new Date(date).toISOString(),
    };
    onConfirm(transaction);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-12 pb-4 border-b border-gray-100">
          <TouchableOpacity onPress={onCancel}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            Revisar Recibo
          </Text>
          <TouchableOpacity onPress={onRetry}>
            <Ionicons name="camera-outline" size={24} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        <View className="p-4">
          {/* Receipt Image Preview */}
          <View className="mb-6">
            <Image
              source={{ uri: imageUri }}
              className="w-full h-48 rounded-xl bg-gray-100"
              resizeMode="cover"
            />
            <View className="absolute top-2 right-2 bg-success-500 px-2 py-1 rounded-full flex-row items-center">
              <Ionicons name="checkmark-circle" size={16} color="white" />
              <Text className="text-white text-xs ml-1 font-medium">AI Procesado</Text>
            </View>
          </View>

          {/* Amount (Main Focus) */}
          <View className="bg-gray-50 rounded-2xl p-6 mb-6">
            <Text className="text-gray-500 text-sm text-center mb-2">Monto Total</Text>
            <View className="flex-row items-center justify-center">
              <Text className="text-3xl font-bold text-gray-900 mr-2">$</Text>
              <Input
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                className="text-3xl font-bold text-center bg-transparent border-0 flex-1"
                placeholder="0.00"
              />
              <TouchableOpacity className="bg-gray-200 px-3 py-1 rounded-lg">
                <Text className="text-gray-700 font-medium">{currency}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Details Form */}
          <View className="space-y-4">
            <Input
              label="Comercio"
              value={merchantName}
              onChangeText={(text) => {
                setMerchantName(text);
                setDescription(text);
              }}
              placeholder="Nombre del comercio"
            />

            <Input
              label="Descripcion"
              value={description}
              onChangeText={setDescription}
              placeholder="Descripcion del gasto"
              multiline
            />

            <Input
              label="Fecha"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
            />

            {/* Category Selection */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 rounded-full flex-row items-center ${
                        selectedCategory === category.id
                          ? 'bg-primary-600'
                          : 'bg-gray-100'
                      }`}
                    >
                      <Ionicons
                        name={category.icon as keyof typeof Ionicons.glyphMap}
                        size={18}
                        color={selectedCategory === category.id ? 'white' : category.color}
                      />
                      <Text
                        className={`ml-2 font-medium ${
                          selectedCategory === category.id
                            ? 'text-white'
                            : 'text-gray-700'
                        }`}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Line Items (if available) */}
            {receipt.line_items.length > 0 && (
              <View className="mt-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Articulos Detectados
                </Text>
                <View className="bg-gray-50 rounded-xl p-3">
                  {receipt.line_items.map((item, index) => (
                    <View
                      key={index}
                      className="flex-row justify-between py-2 border-b border-gray-200 last:border-0"
                    >
                      <Text className="text-gray-700 flex-1">{item.name}</Text>
                      {item.total && (
                        <Text className="text-gray-900 font-medium">
                          {formatCurrency(item.total, currency)}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="p-4 border-t border-gray-100">
        <Button
          title="Guardar Gasto"
          onPress={handleConfirm}
          loading={isLoading}
          className="w-full mb-2"
        />
        <Button
          title="Escanear Otro"
          variant="secondary"
          onPress={onRetry}
          className="w-full"
        />
      </View>
    </KeyboardAvoidingView>
  );
};
