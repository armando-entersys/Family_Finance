import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api, { getErrorMessage } from '@/services/api';
import { API_ENDPOINTS } from '@/constants';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo electronico');
      return;
    }

    try {
      setIsLoading(true);
      await api.post(API_ENDPOINTS.FORGOT_PASSWORD, { email: email.trim() });
      setIsSent(true);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-12 pb-8">
          {/* Header */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-6"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900">Recuperar Contrasena</Text>
            <Text className="text-gray-500 mt-2">
              Ingresa tu correo electronico y te enviaremos un enlace para restablecer tu contrasena.
            </Text>
          </View>

          {isSent ? (
            <View className="flex-1">
              <View className="items-center py-8">
                <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4">
                  <Ionicons name="mail-outline" size={40} color="#10B981" />
                </View>
                <Text className="text-xl font-bold text-gray-900 mb-2">Correo enviado</Text>
                <Text className="text-gray-500 text-center">
                  Si el correo esta registrado, recibiras un enlace para restablecer tu contrasena. Revisa tu bandeja de entrada.
                </Text>
              </View>

              <Button
                title="Volver al inicio de sesion"
                onPress={() => router.replace('/(auth)/login')}
                className="mt-8"
              />
            </View>
          ) : (
            <View className="space-y-4">
              <Input
                label="Correo Electronico"
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={<Ionicons name="mail-outline" size={20} color="#9CA3AF" />}
              />

              <Button
                title="Enviar enlace"
                onPress={handleSubmit}
                loading={isLoading}
                className="mt-4"
              />
            </View>
          )}

          {/* Footer */}
          {!isSent && (
            <View className="mt-auto pt-8">
              <View className="flex-row items-center justify-center">
                <Text className="text-gray-500">Recordaste tu contrasena? </Text>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text className="text-primary-600 font-semibold">Inicia Sesion</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
