import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';

interface Alert {
  id: string;
  severity: string;
  message: string;
  time: string;
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    severity: 'CRITICAL',
    message: '機台 M001 停止回應心跳信號',
    time: '5 分鐘前',
  },
  {
    id: '2',
    severity: 'HIGH',
    message: '不良率超過 5%，建議檢查設備',
    time: '15 分鐘前',
  },
  {
    id: '3',
    severity: 'MEDIUM',
    message: '刀具壽命剩餘 20%',
    time: '30 分鐘前',
  },
];

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [filter, setFilter] = useState<string>('ALL');

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      'CRITICAL': '#ef4444',
      'HIGH': '#f59e0b',
      'MEDIUM': '#3b82f6',
      'LOW': '#10b981',
    };
    return colors[severity] || '#666';
  };

  const handleAcknowledge = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAlerts(alerts.filter((a) => a.id !== id));
  };

  const filteredAlerts = filter === 'ALL' ? alerts : alerts.filter((a) => a.severity === filter);

  return (
    <View className="flex-1 bg-[#0a0f1e]">
      {/* 篩選按鈕 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 12 }}
        className="border-b border-[rgba(255,255,255,0.09)]"
      >
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((f) => (
          <TouchableOpacity
            key={f}
            className={`px-4 py-2 rounded-full mr-3 ${filter === f ? 'bg-blue-600' : 'bg-[rgba(255,255,255,0.04)]'}`}
            onPress={() => setFilter(f)}
          >
            <Text
              className={`font-semibold ${filter === f ? 'text-white' : 'text-gray-400'}`}
            >
              {f === 'ALL' ? '全部' : f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 警報列表 */}
      <FlatList
        data={filteredAlerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="mx-6 my-3 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.09)] rounded-xl overflow-hidden">
            <View className="flex-row items-center">
              {/* 嚴重性指示器 */}
              <View
                className="w-1 h-20"
                style={{ backgroundColor: getSeverityColor(item.severity) }}
              />

              {/* 內容 */}
              <View className="flex-1 px-4 py-3">
                <View className="flex-row justify-between items-start mb-2">
                  <Text
                    className="font-bold text-sm"
                    style={{ color: getSeverityColor(item.severity) }}
                  >
                    {item.severity}
                  </Text>
                  <Text className="text-gray-400 text-xs">{item.time}</Text>
                </View>
                <Text className="text-white text-sm">{item.message}</Text>
              </View>

              {/* 確認按鈕 */}
              <TouchableOpacity
                className="pr-4"
                onPress={() => handleAcknowledge(item.id)}
              >
                <Text className="text-blue-400 font-semibold">✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingVertical: 16 }}
        ListEmptyComponent=(
          <View className="flex-1 justify-center items-center py-12">
            <Text className="text-gray-400 text-lg">✨</Text>
            <Text className="text-gray-400 mt-2">沒有警報</Text>
          </View>
        )
      />
    </View>
  );
}
