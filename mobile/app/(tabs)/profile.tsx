import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Switch,
  RefreshControl,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import {
  useUserSettings,
  useUpdateUserSettings,
  useFamilySettings,
  useUpdateFamilySettings,
  useUpdateFamilyName,
  useFamilyMembers,
  useInviteFamilyMember,
  useRemoveFamilyMember,
} from '@/hooks/useSettings';
import { CURRENCIES } from '@/constants';

const LANGUAGES = [
  { code: 'es', name: 'Espanol' },
  { code: 'en', name: 'English' },
] as const;

// Web-compatible confirm dialog
const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', style: 'destructive', onPress: onConfirm },
    ]);
  }
};

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  // Settings queries
  const { data: userSettings, isLoading: loadingUserSettings, refetch: refetchUserSettings } = useUserSettings();
  const { data: familySettings, refetch: refetchFamilySettings } = useFamilySettings();
  const { data: familyMembers, refetch: refetchMembers } = useFamilyMembers();

  // Mutations
  const updateUserSettingsMutation = useUpdateUserSettings();
  const updateFamilySettingsMutation = useUpdateFamilySettings();
  const updateFamilyNameMutation = useUpdateFamilyName();
  const inviteMemberMutation = useInviteFamilyMember();
  const removeMemberMutation = useRemoveFamilyMember();

  // Modal states
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [editName, setEditName] = useState(user?.name || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [editFamilyName, setEditFamilyName] = useState('');
  const [isEditingFamilyName, setIsEditingFamilyName] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchUserSettings(), refetchFamilySettings(), refetchMembers()]);
    setIsRefreshing(false);
  };

  const handleLogout = () => {
    showConfirm('Cerrar Sesion', 'Estas seguro que deseas cerrar sesion?', async () => {
      await logout();
      router.replace('/(auth)/login');
    });
  };

  const handleUpdateCurrency = async (currencyCode: string) => {
    try {
      await updateUserSettingsMutation.mutateAsync({ preferred_currency: currencyCode });
      setShowCurrencyModal(false);
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Error: No se pudo actualizar la moneda');
      }
    }
  };

  const handleUpdateLanguage = async (languageCode: string) => {
    try {
      await updateUserSettingsMutation.mutateAsync({ language: languageCode });
      setShowLanguageModal(false);
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Error: No se pudo actualizar el idioma');
      }
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    try {
      await updateUserSettingsMutation.mutateAsync({ daily_summary_enabled: value });
    } catch (error) {
      console.error('Error updating notifications:', error);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Error: Ingresa un correo electronico');
      }
      return;
    }
    try {
      await inviteMemberMutation.mutateAsync({ email: inviteEmail.trim(), role: inviteRole });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('MEMBER');
      if (Platform.OS === 'web') {
        window.alert('Invitacion enviada correctamente');
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Error: No se pudo enviar la invitacion');
      }
    }
  };

  const handleRemoveMember = (memberId: string, memberEmail: string) => {
    showConfirm('Eliminar miembro', `Estas seguro que deseas eliminar a ${memberEmail}?`, async () => {
      try {
        await removeMemberMutation.mutateAsync(memberId);
      } catch (error) {
        if (Platform.OS === 'web') {
          window.alert('Error: No se pudo eliminar el miembro');
        }
      }
    });
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Error: El nombre no puede estar vacio');
      }
      return;
    }
    setIsUpdatingProfile(true);
    try {
      await updateProfile({ name: editName.trim() });
      setShowEditProfileModal(false);
      if (Platform.OS === 'web') {
        window.alert('Perfil actualizado correctamente');
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Error: No se pudo actualizar el perfil');
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const openEditProfileModal = () => {
    setEditName(user?.name || '');
    setShowEditProfileModal(true);
  };

  const handleUpdateFamilyName = async () => {
    if (!editFamilyName.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Error: El nombre de la familia no puede estar vacio');
      }
      return;
    }
    try {
      await updateFamilyNameMutation.mutateAsync(editFamilyName.trim());
      setIsEditingFamilyName(false);
      if (Platform.OS === 'web') {
        window.alert('Nombre de familia actualizado correctamente');
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Error: No se pudo actualizar el nombre de la familia');
      }
    }
  };

  const startEditingFamilyName = () => {
    setEditFamilyName(familySettings?.name || '');
    setIsEditingFamilyName(true);
  };

  const currentCurrency = CURRENCIES.find((c) => c.code === userSettings?.preferred_currency) || CURRENCIES[0];
  const currentLanguage = LANGUAGES.find((l) => l.code === userSettings?.language) || LANGUAGES[0];

  if (loadingUserSettings) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View className="bg-primary-600 pt-14 pb-8 px-6 rounded-b-3xl">
        <View className="items-center">
          <View className="w-24 h-24 bg-white/20 rounded-full items-center justify-center mb-4">
            <Text className="text-white text-4xl font-bold">
              {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text className="text-white text-xl font-semibold">
            {user?.name || user?.email?.split('@')[0] || 'Usuario'}
          </Text>
          <Text className="text-primary-200 mt-1">{user?.email}</Text>
          <View className="flex-row items-center mt-2 gap-2">
            <View className="bg-white/20 px-3 py-1 rounded-full">
              <Text className="text-white text-sm">
                {isAdmin ? 'Administrador' : 'Miembro'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={openEditProfileModal}
              className="bg-white/20 px-3 py-1 rounded-full flex-row items-center"
            >
              <Ionicons name="pencil" size={14} color="white" />
              <Text className="text-white text-sm ml-1">Editar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Menu Sections */}
      <View className="px-6 py-6">
        {/* Configuracion */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-500 uppercase mb-2 px-2">
            Configuracion
          </Text>
          <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {/* Familia */}
            <TouchableOpacity
              onPress={() => setShowFamilyModal(true)}
              className="flex-row items-center px-4 py-3.5 border-b border-gray-100"
            >
              <View className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="people-outline" size={20} color="#6B7280" />
              </View>
              <Text className="flex-1 text-gray-900 font-medium">Mi Familia</Text>
              <Text className="text-gray-400 mr-2">{familyMembers?.length || 0} miembros</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            {/* Notificaciones */}
            <View className="flex-row items-center px-4 py-3.5 border-b border-gray-100">
              <View className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="notifications-outline" size={20} color="#6B7280" />
              </View>
              <Text className="flex-1 text-gray-900 font-medium">Resumen Diario</Text>
              <Switch
                value={userSettings?.daily_summary_enabled ?? true}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
                thumbColor="white"
              />
            </View>

            {/* Idioma */}
            <TouchableOpacity
              onPress={() => setShowLanguageModal(true)}
              className="flex-row items-center px-4 py-3.5 border-b border-gray-100"
            >
              <View className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="language-outline" size={20} color="#6B7280" />
              </View>
              <Text className="flex-1 text-gray-900 font-medium">Idioma</Text>
              <Text className="text-gray-400 mr-2">{currentLanguage.name}</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            {/* Moneda */}
            <TouchableOpacity
              onPress={() => setShowCurrencyModal(true)}
              className="flex-row items-center px-4 py-3.5"
            >
              <View className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="cash-outline" size={20} color="#6B7280" />
              </View>
              <Text className="flex-1 text-gray-900 font-medium">Moneda</Text>
              <Text className="text-gray-400 mr-2">{currentCurrency.code}</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Soporte */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-500 uppercase mb-2 px-2">
            Soporte
          </Text>
          <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <TouchableOpacity className="flex-row items-center px-4 py-3.5 border-b border-gray-100">
              <View className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="help-circle-outline" size={20} color="#6B7280" />
              </View>
              <Text className="flex-1 text-gray-900 font-medium">Ayuda</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center px-4 py-3.5">
              <View className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
              </View>
              <Text className="flex-1 text-gray-900 font-medium">Acerca de</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-white rounded-2xl overflow-hidden shadow-sm"
        >
          <View className="flex-row items-center px-4 py-3.5">
            <View className="w-9 h-9 bg-danger-50 rounded-full items-center justify-center mr-3">
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </View>
            <Text className="flex-1 text-danger-500 font-medium">Cerrar Sesion</Text>
          </View>
        </TouchableOpacity>

        {/* App Version */}
        <Text className="text-center text-gray-400 text-sm mt-6">
          Family Finance v1.0.0
        </Text>
      </View>

      {/* Currency Modal */}
      <Modal visible={showCurrencyModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">Seleccionar Moneda</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {CURRENCIES.map((currency) => (
              <TouchableOpacity
                key={currency.code}
                className={`flex-row items-center p-4 rounded-xl mb-2 ${
                  userSettings?.preferred_currency === currency.code ? 'bg-primary-50' : 'bg-gray-50'
                }`}
                onPress={() => handleUpdateCurrency(currency.code)}
              >
                <Text className="text-2xl mr-3">{currency.symbol}</Text>
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900">{currency.code}</Text>
                  <Text className="text-gray-500 text-sm">{currency.name}</Text>
                </View>
                {userSettings?.preferred_currency === currency.code && (
                  <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal visible={showLanguageModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">Seleccionar Idioma</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {LANGUAGES.map((language) => (
              <TouchableOpacity
                key={language.code}
                className={`flex-row items-center p-4 rounded-xl mb-2 ${
                  userSettings?.language === language.code ? 'bg-primary-50' : 'bg-gray-50'
                }`}
                onPress={() => handleUpdateLanguage(language.code)}
              >
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900">{language.name}</Text>
                </View>
                {userSettings?.language === language.code && (
                  <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Family Modal */}
      <Modal visible={showFamilyModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">Mi Familia</Text>
              <TouchableOpacity onPress={() => setShowFamilyModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Family Name Section */}
            <View className="mb-4">
              <Text className="text-gray-600 mb-2">Nombre de la Familia</Text>
              {isEditingFamilyName ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-gray-900"
                    placeholder="Nombre de la familia"
                    value={editFamilyName}
                    onChangeText={setEditFamilyName}
                    autoCapitalize="words"
                  />
                  <TouchableOpacity
                    onPress={handleUpdateFamilyName}
                    disabled={updateFamilyNameMutation.isPending}
                    className="bg-primary-600 p-3 rounded-xl"
                  >
                    {updateFamilyNameMutation.isPending ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="checkmark" size={20} color="white" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setIsEditingFamilyName(false)}
                    className="bg-gray-200 p-3 rounded-xl"
                  >
                    <Ionicons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row items-center bg-gray-50 rounded-xl p-3">
                  <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="home" size={20} color="#4F46E5" />
                  </View>
                  <Text className="flex-1 text-gray-900 font-medium text-lg">
                    {familySettings?.name || 'Sin nombre'}
                  </Text>
                  {isAdmin && (
                    <TouchableOpacity onPress={startEditingFamilyName} className="p-2">
                      <Ionicons name="pencil" size={20} color="#4F46E5" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Members List */}
            <Text className="text-gray-600 mb-2">Miembros ({familyMembers?.length || 0})</Text>
            <ScrollView className="max-h-64 mb-4">
              {familyMembers?.map((member) => (
                <View
                  key={member.id}
                  className="flex-row items-center bg-gray-50 rounded-xl p-3 mb-2"
                >
                  <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center mr-3">
                    <Text className="text-primary-600 font-bold">
                      {member.email.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium">{member.email}</Text>
                    <Text className="text-gray-400 text-sm">
                      {member.role === 'ADMIN' ? 'Administrador' : 'Miembro'}
                    </Text>
                  </View>
                  {isAdmin && member.id !== user?.id && (
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(member.id, member.email)}
                      className="p-2"
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>

            {/* Invite Button */}
            {isAdmin && (
              <TouchableOpacity
                className="bg-primary-600 py-4 rounded-xl items-center flex-row justify-center"
                onPress={() => {
                  setShowFamilyModal(false);
                  setShowInviteModal(true);
                }}
              >
                <Ionicons name="person-add" size={20} color="white" />
                <Text className="text-white font-semibold text-lg ml-2">Invitar Miembro</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Invite Member Modal */}
      <Modal visible={showInviteModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">Invitar Miembro</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 mb-2">Correo electronico</Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-4"
              placeholder="correo@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={inviteEmail}
              onChangeText={setInviteEmail}
            />

            <Text className="text-gray-600 mb-2">Rol</Text>
            <View className="flex-row gap-2 mb-6">
              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl items-center ${
                  inviteRole === 'MEMBER' ? 'bg-primary-600' : 'bg-gray-100'
                }`}
                onPress={() => setInviteRole('MEMBER')}
              >
                <Text
                  className={`font-semibold ${
                    inviteRole === 'MEMBER' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  Miembro
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl items-center ${
                  inviteRole === 'ADMIN' ? 'bg-primary-600' : 'bg-gray-100'
                }`}
                onPress={() => setInviteRole('ADMIN')}
              >
                <Text
                  className={`font-semibold ${
                    inviteRole === 'ADMIN' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  Administrador
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="bg-primary-600 py-4 rounded-xl items-center"
              onPress={handleInviteMember}
              disabled={inviteMemberMutation.isPending}
            >
              {inviteMemberMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-lg">Enviar Invitacion</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={showEditProfileModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">Editar Perfil</Text>
              <TouchableOpacity onPress={() => setShowEditProfileModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 mb-2">Nombre</Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-4"
              placeholder="Tu nombre completo"
              value={editName}
              onChangeText={setEditName}
              autoCapitalize="words"
            />

            <Text className="text-gray-600 mb-2">Correo electronico</Text>
            <View className="bg-gray-100 rounded-xl px-4 py-3 mb-6">
              <Text className="text-gray-500">{user?.email}</Text>
            </View>

            <TouchableOpacity
              className="bg-primary-600 py-4 rounded-xl items-center"
              onPress={handleUpdateProfile}
              disabled={isUpdatingProfile}
            >
              {isUpdatingProfile ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-lg">Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
