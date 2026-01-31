import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';

const { width } = Dimensions.get('window');

interface OnboardingStep {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    icon: 'wallet',
    iconColor: '#4F46E5',
    iconBg: '#EEF2FF',
    title: 'Bienvenido a Family Finance',
    description:
      'Tu asistente personal para gestionar las finanzas de tu familia. Registra ingresos, gastos y alcanza tus metas financieras.',
  },
  {
    icon: 'camera',
    iconColor: '#10B981',
    iconBg: '#D1FAE5',
    title: 'Escanea tus recibos',
    description:
      'Toma una foto de tus tickets y la IA extraera automaticamente el monto, fecha y categoria. Ahorra tiempo registrando gastos.',
  },
  {
    icon: 'add-circle',
    iconColor: '#3B82F6',
    iconBg: '#DBEAFE',
    title: 'Registra transacciones',
    description:
      'Agrega tus ingresos y gastos manualmente. Categoriza cada transaccion para tener un mejor control de tu dinero.',
  },
  {
    icon: 'flag',
    iconColor: '#F59E0B',
    iconBg: '#FEF3C7',
    title: 'Crea metas de ahorro',
    description:
      'Define objetivos financieros como vacaciones, un auto o fondo de emergencia. Visualiza tu progreso y mantente motivado.',
  },
  {
    icon: 'card',
    iconColor: '#EF4444',
    iconBg: '#FEE2E2',
    title: 'Controla tus deudas',
    description:
      'Registra prestamos y tarjetas de credito. Programa pagos y observa como reduces tu saldo pendiente.',
  },
  {
    icon: 'repeat',
    iconColor: '#8B5CF6',
    iconBg: '#EDE9FE',
    title: 'Gastos recurrentes',
    description:
      'Configura pagos fijos como renta, servicios o suscripciones. Establece presupuestos por categoria y recibe alertas.',
  },
  {
    icon: 'stats-chart',
    iconColor: '#EC4899',
    iconBg: '#FCE7F3',
    title: 'Reportes y analisis',
    description:
      'Visualiza graficas de tus finanzas, compara meses y toma mejores decisiones con informacion clara y detallada.',
  },
];

interface OnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
}

export function OnboardingModal({ visible, onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { completeOnboarding } = useAuthStore();

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    await completeOnboarding();
    onComplete();
  };

  const handleSkip = async () => {
    await completeOnboarding();
    onComplete();
  };

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <View className="bg-white rounded-3xl w-full max-w-md overflow-hidden">
          {/* Skip button */}
          <View className="flex-row justify-end p-4">
            <TouchableOpacity onPress={handleSkip}>
              <Text className="text-gray-400 font-medium">Saltar</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="px-8 pb-8">
            {/* Icon */}
            <View className="items-center mb-6">
              <View
                className="w-24 h-24 rounded-full items-center justify-center"
                style={{ backgroundColor: step.iconBg }}
              >
                <Ionicons name={step.icon} size={48} color={step.iconColor} />
              </View>
            </View>

            {/* Title */}
            <Text className="text-2xl font-bold text-gray-900 text-center mb-4">
              {step.title}
            </Text>

            {/* Description */}
            <Text className="text-gray-600 text-center text-base leading-6 mb-8">
              {step.description}
            </Text>

            {/* Progress dots */}
            <View className="flex-row justify-center gap-2 mb-8">
              {ONBOARDING_STEPS.map((_, index) => (
                <View
                  key={index}
                  className={`h-2 rounded-full ${
                    index === currentStep ? 'w-6 bg-primary-600' : 'w-2 bg-gray-200'
                  }`}
                />
              ))}
            </View>

            {/* Navigation buttons */}
            <View className="flex-row gap-3">
              {currentStep > 0 && (
                <TouchableOpacity
                  className="flex-1 py-4 bg-gray-100 rounded-xl items-center"
                  onPress={handlePrevious}
                >
                  <Text className="text-gray-700 font-semibold">Anterior</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                className={`flex-1 py-4 bg-primary-600 rounded-xl items-center ${
                  currentStep === 0 ? '' : ''
                }`}
                onPress={handleNext}
              >
                <Text className="text-white font-semibold">
                  {isLastStep ? 'Comenzar' : 'Siguiente'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
