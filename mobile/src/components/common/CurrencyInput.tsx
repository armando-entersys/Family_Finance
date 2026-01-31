import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  currencySymbol?: string;
  className?: string;
}

// Format number with commas and 2 decimals for display
const formatForDisplay = (value: string): string => {
  if (!value) return '';

  // Remove everything except digits and decimal point
  const cleanValue = value.replace(/[^0-9.]/g, '');

  // Handle multiple decimal points - keep only the first one
  const parts = cleanValue.split('.');
  let integerPart = parts[0] || '';
  let decimalPart = parts[1] || '';

  // Remove leading zeros (except for "0" or "0.xx")
  if (integerPart.length > 1 && integerPart[0] === '0') {
    integerPart = integerPart.replace(/^0+/, '') || '0';
  }

  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Limit decimal to 2 digits
  if (decimalPart.length > 2) {
    decimalPart = decimalPart.substring(0, 2);
  }

  // Combine parts
  if (parts.length > 1) {
    return `${formattedInteger}.${decimalPart}`;
  }

  return formattedInteger;
};

// Parse display value back to raw number string
const parseToRaw = (displayValue: string): string => {
  if (!displayValue) return '';
  // Remove commas to get raw number
  return displayValue.replace(/,/g, '');
};

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0.00',
  label,
  currencySymbol = '$',
  className = '',
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  // Initialize display value from prop
  useEffect(() => {
    if (value) {
      setDisplayValue(formatForDisplay(value));
    } else {
      setDisplayValue('');
    }
  }, []);

  // Update display when external value changes (but not from our own input)
  useEffect(() => {
    const rawDisplay = parseToRaw(displayValue);
    if (value !== rawDisplay) {
      setDisplayValue(formatForDisplay(value));
    }
  }, [value]);

  const handleChangeText = (text: string) => {
    // Format for display
    const formatted = formatForDisplay(text);
    setDisplayValue(formatted);

    // Pass raw value (without commas) to parent
    const rawValue = parseToRaw(formatted);
    onChange(rawValue);
  };

  const handleClear = () => {
    setDisplayValue('');
    onChange('');
  };

  return (
    <View className={className}>
      {label && <Text className="text-gray-600 mb-2">{label}</Text>}

      <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
        <Text className="text-2xl font-bold text-gray-400 mr-2">{currencySymbol}</Text>
        <TextInput
          value={displayValue}
          onChangeText={handleChangeText}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          className="flex-1 text-2xl font-bold py-3 text-gray-900"
          placeholderTextColor="#9CA3AF"
        />
        {displayValue ? (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// Smaller variant for inline use
export function CurrencyInputSmall({
  value,
  onChange,
  placeholder = '0.00',
  label,
  currencySymbol = '$',
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value) {
      setDisplayValue(formatForDisplay(value));
    } else {
      setDisplayValue('');
    }
  }, []);

  useEffect(() => {
    const rawDisplay = parseToRaw(displayValue);
    if (value !== rawDisplay) {
      setDisplayValue(formatForDisplay(value));
    }
  }, [value]);

  const handleChangeText = (text: string) => {
    const formatted = formatForDisplay(text);
    setDisplayValue(formatted);
    onChange(parseToRaw(formatted));
  };

  return (
    <View>
      {label && <Text className="text-gray-600 mb-2">{label}</Text>}

      <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
        <Text className="text-gray-400 mr-1">{currencySymbol}</Text>
        <TextInput
          value={displayValue}
          onChangeText={handleChangeText}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          className="flex-1 text-gray-900"
          placeholderTextColor="#9CA3AF"
        />
      </View>
    </View>
  );
}
