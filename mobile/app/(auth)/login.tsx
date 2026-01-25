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
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      clearError();
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      // Error is handled by the store
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
            <Text className="text-gray-500 mt-2 text-center">
              Gestiona las finanzas de tu familia
            </Text>
          </View>

          {/* Form */}
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

            <Input
              label="Contrasena"
              value={password}
              onChangeText={setPassword}
              placeholder="Tu contrasena"
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

            {error && (
              <View className="bg-danger-50 border border-danger-200 rounded-xl p-3">
                <Text className="text-danger-600 text-sm">{error}</Text>
              </View>
            )}

            <Button
              title="Iniciar Sesion"
              onPress={handleLogin}
              loading={isLoading}
              className="mt-4"
            />
          </View>

          {/* Footer */}
          <View className="mt-auto pt-8">
            <View className="flex-row items-center justify-center">
              <Text className="text-gray-500">No tienes cuenta? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text className="text-primary-600 font-semibold">Registrate</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
