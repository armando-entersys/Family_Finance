import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES } from '@/constants';
import { formatCurrency, formatRelativeTime, getTransactionTypeColor } from '@/utils/format';
import type { Transaction } from '@/types';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
}) => {
  const category = CATEGORIES.find((c) => c.id === transaction.category_id);
  const isIncome = transaction.type === 'INCOME';
  const amountColor = getTransactionTypeColor(transaction.type);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center py-3 px-4 bg-white border-b border-gray-100"
      activeOpacity={0.7}
    >
      {/* Category Icon */}
      <View
        className="w-12 h-12 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: `${category?.color || '#6B7280'}20` }}
      >
        <Ionicons
          name={(category?.icon || 'ellipsis-horizontal') as keyof typeof Ionicons.glyphMap}
          size={24}
          color={category?.color || '#6B7280'}
        />
      </View>

      {/* Details */}
      <View className="flex-1">
        <Text className="text-base font-medium text-gray-900" numberOfLines={1}>
          {transaction.description || category?.name || 'Sin descripcion'}
        </Text>
        <View className="flex-row items-center mt-0.5">
          <Text className="text-sm text-gray-500">
            {formatRelativeTime(transaction.trx_date)}
          </Text>
          {transaction.attachment_url && (
            <>
              <View className="w-1 h-1 rounded-full bg-gray-400 mx-2" />
              <Ionicons name="image-outline" size={14} color="#9CA3AF" />
            </>
          )}
        </View>
      </View>

      {/* Amount */}
      <View className="items-end">
        <Text
          className="text-base font-semibold"
          style={{ color: amountColor }}
        >
          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount_original, transaction.currency_code)}
        </Text>
        {transaction.currency_code !== 'MXN' && (
          <Text className="text-xs text-gray-400">
            ~{formatCurrency(transaction.amount_base, 'MXN')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};
