import React, { forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  TextInputProps,
} from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, leftIcon, rightIcon, className, ...props }, ref) => {
    return (
      <View className="w-full">
        {label && (
          <Text className="text-sm font-medium text-gray-700 mb-1.5">{label}</Text>
        )}
        <View className="relative">
          {leftIcon && (
            <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
              {leftIcon}
            </View>
          )}
          <TextInput
            ref={ref}
            className={`
              w-full bg-gray-50 border rounded-xl px-4 py-3.5 text-gray-900 text-base
              ${leftIcon ? 'pl-11' : ''}
              ${rightIcon ? 'pr-11' : ''}
              ${error ? 'border-danger-500' : 'border-gray-200'}
              ${className || ''}
            `}
            placeholderTextColor="#9CA3AF"
            {...props}
          />
          {rightIcon && (
            <View className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightIcon}
            </View>
          )}
        </View>
        {error && (
          <Text className="text-sm text-danger-500 mt-1">{error}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';
