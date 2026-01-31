import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface DateInputProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function DateInput({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  label,
  minDate,
  maxDate,
}: DateInputProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Parse the string value to Date
  const dateValue = value ? new Date(value + 'T00:00:00') : new Date();

  // Format date for display
  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // On Android, the picker dismisses automatically
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      // Format to YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
    }

    // For iOS, only close when dismissed
    if (event.type === 'dismissed') {
      setShowPicker(false);
    }
  };

  const handlePress = () => {
    setShowPicker(true);
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <View>
      {label && <Text className="text-gray-600 mb-2">{label}</Text>}

      <TouchableOpacity
        className="bg-gray-100 rounded-xl px-4 py-3 flex-row items-center justify-between"
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons name="calendar-outline" size={20} color="#6B7280" />
          <Text
            className={`ml-3 ${value ? 'text-gray-900' : 'text-gray-400'}`}
          >
            {value ? formatDisplayDate(value) : placeholder}
          </Text>
        </View>
        {value && (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {showPicker && (
        <>
          {Platform.OS === 'ios' && (
            <View className="bg-white rounded-xl mt-2 border border-gray-200">
              <View className="flex-row justify-end p-2 border-b border-gray-100">
                <TouchableOpacity
                  onPress={() => setShowPicker(false)}
                  className="px-4 py-2"
                >
                  <Text className="text-primary-600 font-semibold">Listo</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minDate}
                maximumDate={maxDate}
                locale="es-MX"
              />
            </View>
          )}
          {Platform.OS === 'android' && (
            <DateTimePicker
              value={dateValue}
              mode="date"
              display="default"
              onChange={handleChange}
              minimumDate={minDate}
              maximumDate={maxDate}
            />
          )}
          {Platform.OS === 'web' && (
            <View className="mt-2">
              <input
                type="date"
                value={value}
                onChange={(e) => {
                  onChange(e.target.value);
                  setShowPicker(false);
                }}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid #E5E7EB',
                  fontSize: 16,
                  width: '100%',
                }}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}
