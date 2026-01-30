import React, { useEffect, useState } from 'react';
import { View, Text, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
}

const TOAST_CONFIG = {
  success: {
    icon: 'checkmark-circle' as const,
    bgColor: 'bg-green-500',
    iconColor: '#ffffff',
  },
  error: {
    icon: 'close-circle' as const,
    bgColor: 'bg-red-500',
    iconColor: '#ffffff',
  },
  warning: {
    icon: 'warning' as const,
    bgColor: 'bg-yellow-500',
    iconColor: '#ffffff',
  },
  info: {
    icon: 'information-circle' as const,
    bgColor: 'bg-blue-500',
    iconColor: '#ffffff',
  },
};

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onHide,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const config = TOAST_CONFIG[type];

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onHide?.();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, fadeAnim, onHide]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          {
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0],
            }),
          },
        ],
        position: 'absolute',
        top: Platform.OS === 'web' ? 20 : 60,
        left: 20,
        right: 20,
        zIndex: 9999,
      }}
    >
      <View
        className={`${config.bgColor} rounded-xl px-4 py-3 flex-row items-center shadow-lg`}
      >
        <Ionicons name={config.icon} size={24} color={config.iconColor} />
        <Text className="text-white font-medium ml-3 flex-1">{message}</Text>
      </View>
    </Animated.View>
  );
};

// Toast context for global usage
import { createContext, useContext, useCallback } from 'react';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a fallback that uses alert for web compatibility
    return {
      showToast: (message: string, type?: ToastType) => {
        if (Platform.OS === 'web') {
          // Use a simple notification for web
          const emoji = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
          window.alert(`${emoji} ${message}`);
        } else {
          const { Alert } = require('react-native');
          Alert.alert(type === 'error' ? 'Error' : 'Aviso', message);
        }
      },
    };
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
  }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      setToast({ visible: true, message, type });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
};
