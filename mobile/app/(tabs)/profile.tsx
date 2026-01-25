import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesion',
      'Estas seguro que deseas cerrar sesion?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      title: 'Configuracion',
      items: [
        { icon: 'person-outline', label: 'Mi Perfil', onPress: () => {} },
        { icon: 'people-outline', label: 'Mi Familia', onPress: () => {} },
        { icon: 'notifications-outline', label: 'Notificaciones', onPress: () => {} },
        { icon: 'language-outline', label: 'Idioma', value: 'Espanol', onPress: () => {} },
        { icon: 'cash-outline', label: 'Moneda', value: 'MXN', onPress: () => {} },
      ],
    },
    {
      title: 'Preferencias',
      items: [
        { icon: 'moon-outline', label: 'Modo Oscuro', toggle: true, value: false },
        { icon: 'finger-print-outline', label: 'Biometricos', toggle: true, value: false },
      ],
    },
    {
      title: 'Soporte',
      items: [
        { icon: 'help-circle-outline', label: 'Ayuda', onPress: () => {} },
        { icon: 'document-text-outline', label: 'Terminos y Condiciones', onPress: () => {} },
        { icon: 'shield-checkmark-outline', label: 'Privacidad', onPress: () => {} },
      ],
    },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary-600 pt-14 pb-8 px-6 rounded-b-3xl">
        <View className="items-center">
          <View className="w-24 h-24 bg-white/20 rounded-full items-center justify-center mb-4">
            <Text className="text-white text-4xl font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text className="text-white text-xl font-semibold">
            {user?.email?.split('@')[0] || 'Usuario'}
          </Text>
          <Text className="text-primary-200 mt-1">{user?.email}</Text>
          <View className="flex-row items-center mt-2">
            <View className="bg-white/20 px-3 py-1 rounded-full">
              <Text className="text-white text-sm">
                {user?.role === 'ADMIN' ? 'Administrador' : 'Miembro'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Menu Sections */}
      <View className="px-6 py-6">
        {menuItems.map((section, sectionIndex) => (
          <View key={sectionIndex} className="mb-6">
            <Text className="text-sm font-semibold text-gray-500 uppercase mb-2 px-2">
              {section.title}
            </Text>
            <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  onPress={item.onPress}
                  className={`flex-row items-center px-4 py-3.5 ${
                    itemIndex < section.items.length - 1
                      ? 'border-b border-gray-100'
                      : ''
                  }`}
                >
                  <View className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center mr-3">
                    <Ionicons
                      name={item.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color="#6B7280"
                    />
                  </View>
                  <Text className="flex-1 text-gray-900 font-medium">
                    {item.label}
                  </Text>
                  {item.value && (
                    <Text className="text-gray-400 mr-2">{item.value}</Text>
                  )}
                  {item.toggle !== undefined ? (
                    <View
                      className={`w-12 h-7 rounded-full p-1 ${
                        item.value ? 'bg-primary-600' : 'bg-gray-200'
                      }`}
                    >
                      <View
                        className={`w-5 h-5 rounded-full bg-white ${
                          item.value ? 'ml-auto' : ''
                        }`}
                      />
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-white rounded-2xl overflow-hidden shadow-sm"
        >
          <View className="flex-row items-center px-4 py-3.5">
            <View className="w-9 h-9 bg-danger-50 rounded-full items-center justify-center mr-3">
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </View>
            <Text className="flex-1 text-danger-500 font-medium">
              Cerrar Sesion
            </Text>
          </View>
        </TouchableOpacity>

        {/* App Version */}
        <Text className="text-center text-gray-400 text-sm mt-6">
          Family Finance v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}
