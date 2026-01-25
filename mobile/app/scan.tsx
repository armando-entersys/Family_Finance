import React, { useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { ReceiptScanner } from '@/components/scanner/ReceiptScanner';
import { ReceiptReview } from '@/components/scanner/ReceiptReview';
import { scanReceipt } from '@/services/receiptScanner';
import { useCreateTransaction, useUploadAttachment } from '@/hooks/useTransactions';
import type { ParsedReceipt, TransactionCreate } from '@/types';

type ScanState = 'camera' | 'processing' | 'review';

export default function ScanScreen() {
  const [state, setState] = useState<ScanState>('camera');
  const [receipt, setReceipt] = useState<ParsedReceipt | null>(null);
  const [imageUri, setImageUri] = useState<string>('');

  const createTransaction = useCreateTransaction();
  const uploadAttachment = useUploadAttachment();

  const handleCapture = async (uri: string) => {
    setState('processing');
    setImageUri(uri);

    try {
      const { receipt: parsedReceipt, optimizedUri } = await scanReceipt(uri);
      setReceipt(parsedReceipt);
      setImageUri(optimizedUri);
      setState('review');
    } catch (error) {
      console.error('Receipt scan error:', error);
      Alert.alert(
        'Error al Procesar',
        'No se pudo analizar el recibo. Por favor intenta de nuevo o ingresa los datos manualmente.',
        [
          { text: 'Reintentar', onPress: () => setState('camera') },
          { text: 'Cancelar', onPress: () => router.back() },
        ]
      );
    }
  };

  const handleConfirm = async (transaction: TransactionCreate) => {
    try {
      // Create the transaction
      const created = await createTransaction.mutateAsync(transaction);

      // Upload the receipt image as attachment
      if (imageUri && created.id) {
        try {
          await uploadAttachment.mutateAsync({
            transactionId: created.id,
            imageUri: imageUri,
          });
        } catch (uploadError) {
          // Don't fail the whole operation if attachment upload fails
          console.error('Attachment upload error:', uploadError);
        }
      }

      // Show success and navigate back
      Alert.alert(
        'Exito!',
        'El gasto se ha guardado correctamente.',
        [
          {
            text: 'Ver Transaccion',
            onPress: () => router.replace(`/transaction/${created.id}`),
          },
          { text: 'OK', onPress: () => router.back() },
        ]
      );
    } catch (error) {
      console.error('Transaction creation error:', error);
      Alert.alert(
        'Error',
        'No se pudo guardar el gasto. Por favor intenta de nuevo.'
      );
    }
  };

  const handleRetry = () => {
    setReceipt(null);
    setImageUri('');
    setState('camera');
  };

  const handleCancel = () => {
    router.back();
  };

  // Camera view
  if (state === 'camera') {
    return (
      <ReceiptScanner
        onCapture={handleCapture}
        onClose={handleCancel}
      />
    );
  }

  // Processing view
  if (state === 'processing') {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center">
        <View className="bg-white/10 rounded-2xl p-8 items-center mx-6">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text className="text-white text-xl font-semibold mt-4">
            Analizando recibo...
          </Text>
          <Text className="text-white/60 text-center mt-2">
            Usando inteligencia artificial para{'\n'}extraer los datos del recibo
          </Text>
        </View>
      </View>
    );
  }

  // Review view
  if (state === 'review' && receipt) {
    return (
      <ReceiptReview
        receipt={receipt}
        imageUri={imageUri}
        onConfirm={handleConfirm}
        onRetry={handleRetry}
        onCancel={handleCancel}
        isLoading={createTransaction.isPending || uploadAttachment.isPending}
      />
    );
  }

  return null;
}
