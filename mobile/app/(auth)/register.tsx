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

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, isLoading, error, clearError } = useAuthStore();

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu nombre');
      return;
    }

    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa los campos requeridos');
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

    try {
      clearError();
      await register(email.trim(), password, name.trim(), familyName.trim() || undefined);
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
        <View className="flex-1 px-6 pt-12 pb-8">
          {/* Header */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-6"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900">Crear Cuenta</Text>
            <Text className="text-gray-500 mt-2">
              Registrate para comenzar a gestionar tus finanzas
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <Input
              label="Nombre Completo"
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              autoCapitalize="words"
              leftIcon={<Ionicons name="person-outline" size={20} color="#9CA3AF" />}
            />

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

            <Input
              label="Nombre de la Familia (Opcional)"
              value={familyName}
              onChangeText={setFamilyName}
              placeholder="ej. Familia Garcia"
              leftIcon={<Ionicons name="people-outline" size={20} color="#9CA3AF" />}
            />
            <Text className="text-xs text-gray-400 -mt-2">
              Crea una familia para compartir gastos con otros miembros
            </Text>

            {error && (
              <View className="bg-danger-50 border border-danger-200 rounded-xl p-3">
                <Text className="text-danger-600 text-sm">{error}</Text>
              </View>
            )}

            <Button
              title="Crear Cuenta"
              onPress={handleRegister}
              loading={isLoading}
              className="mt-4"
            />
          </View>

          {/* Footer */}
          <View className="mt-auto pt-8">
            <View className="flex-row items-center justify-center">
              <Text className="text-gray-500">Ya tienes cuenta? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text className="text-primary-600 font-semibold">Inicia Sesion</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
