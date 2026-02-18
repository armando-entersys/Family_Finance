import React, { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReceiptScanner } from '@/components/scanner/ReceiptScanner';
import { ReceiptReview } from '@/components/scanner/ReceiptReview';
import { scanReceipt } from '@/services/receiptScanner';
import { useCreateTransaction, useUploadAttachment } from '@/hooks/useTransactions';
import { showSuccess, showError, showFeedback } from '@/utils/feedback';
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
      showFeedback({
        title: 'Error al Procesar',
        message: 'No se pudo analizar el recibo. Por favor intenta de nuevo o ingresa los datos manualmente.',
        type: 'error',
        buttons: [
          { text: 'Reintentar', onPress: () => setState('camera') },
          { text: 'Cancelar', style: 'cancel', onPress: () => router.back() },
        ],
      });
    }
  };

  const handleConfirm = async (transaction: TransactionCreate) => {
    try {
      // Create the transaction
      const created = await createTransaction.mutateAsync(transaction);

      // Upload the receipt image as attachment
      let photoSaved = false;
      if (imageUri && created.id) {
        try {
          await uploadAttachment.mutateAsync({
            transactionId: created.id,
            imageUri: imageUri,
          });
          photoSaved = true;
        } catch (uploadError) {
          console.error('Attachment upload error:', uploadError);
        }
      }

      // Show success and navigate back
      showFeedback({
        title: 'Exito!',
        message: photoSaved
          ? 'El gasto y la foto se guardaron correctamente.'
          : 'El gasto se guardo pero la foto no se pudo subir.',
        type: 'success',
        buttons: [
          { text: 'Ver Transaccion', onPress: () => router.replace(`/transaction/${created.id}`) },
          { text: 'OK', style: 'cancel', onPress: () => router.back() },
        ],
      });
    } catch (error) {
      console.error('Transaction creation error:', error);
      showError('No se pudo guardar el gasto. Por favor intenta de nuevo.');
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
        <View className="bg-white/10 rounded-3xl p-10 items-center mx-6">
          <View className="w-20 h-20 bg-primary-500/20 rounded-full items-center justify-center mb-4">
            <Ionicons name="sparkles" size={40} color="#818CF8" />
          </View>
          <ActivityIndicator size="large" color="#818CF8" />
          <Text className="text-white text-2xl font-bold mt-6">
            Analizando recibo...
          </Text>
          <Text className="text-white/60 text-center mt-3 text-base">
            La inteligencia artificial esta{'\n'}extrayendo los datos del recibo
          </Text>
          <Text className="text-white/40 text-center mt-4 text-sm">
            Esto puede tardar unos segundos
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
