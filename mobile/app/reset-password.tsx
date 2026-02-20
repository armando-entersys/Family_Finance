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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api, { getErrorMessage } from '@/services/api';
import { API_ENDPOINTS } from '@/constants';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contrasenas no coinciden');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'La contrasena debe tener al menos 8 caracteres');
      return;
    }

    if (!token) {
      setError('Token invalido o expirado');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      await api.post(API_ENDPOINTS.RESET_PASSWORD, { token, new_password: password });
      setIsSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
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
        <View className="flex-1 px-6 pt-20 pb-8">
          {/* Logo/Header */}
          <View className="items-center mb-10">
            <View className="w-20 h-20 bg-primary-100 rounded-2xl items-center justify-center mb-4">
              <Ionicons name="wallet-outline" size={40} color="#4F46E5" />
            </View>
            <Text className="text-3xl font-bold text-gray-900">Family Finance</Text>
          </View>

          {isSuccess ? (
            <View className="flex-1">
              <View className="items-center py-8">
                <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4">
                  <Ionicons name="checkmark-circle-outline" size={40} color="#10B981" />
                </View>
                <Text className="text-xl font-bold text-gray-900 mb-2">Contrasena actualizada</Text>
                <Text className="text-gray-500 text-center">
                  Tu contrasena ha sido restablecida exitosamente. Ya puedes iniciar sesion con tu nueva contrasena.
                </Text>
              </View>

              <Button
                title="Ir al inicio de sesion"
                onPress={() => router.replace('/(auth)/login')}
                className="mt-8"
              />
            </View>
          ) : (
            <View>
              <View className="mb-8">
                <Text className="text-xl font-bold text-gray-900 text-center">Nueva contrasena</Text>
                <Text className="text-gray-500 mt-2 text-center">
                  Ingresa tu nueva contrasena para restablecer el acceso a tu cuenta.
                </Text>
              </View>

              <View className="space-y-4">
                <Input
                  label="Nueva Contrasena"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minimo 8 caracteres"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  }
                />

                <Input
                  label="Confirmar Contrasena"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repite tu contrasena"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />}
                />

                {error && (
                  <View className="bg-danger-50 border border-danger-200 rounded-xl p-3">
                    <Text className="text-danger-600 text-sm">{error}</Text>
                  </View>
                )}

                <Button
                  title="Restablecer contrasena"
                  onPress={handleSubmit}
                  loading={isLoading}
                  className="mt-4"
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
