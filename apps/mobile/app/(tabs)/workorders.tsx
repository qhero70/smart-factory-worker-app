import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

interface WorkOrder {
  id: string;
  orderNo: string;
  productName: string;
  quantity: number;
  completedQty: number;
  status: string;
  plannedEnd: string;
}

export default function WorkOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkOrders();
  }, []);

  const loadWorkOrders = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_API_URL}/api/workorders/mine`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrders(response.data.data);
    } catch (error) {
      console.error('Failed to load work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'IN_PROGRESS': '#10b981',
      'PENDING': '#f59e0b',
      'COMPLETED': '#3b82f6',
      'PAUSED': '#8b5cf6',
    };
    return colors[status] || '#666';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'IN_PROGRESS': '進行中',
      'PENDING': '待開始',
      'COMPLETED': '已完成',
      'PAUSED': '已暫停',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#0a0f1e] justify-center items-center">
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0a0f1e]">
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const progress = (item.completedQty / item.quantity) * 100;
          return (
            <TouchableOpacity
              className="mx-6 my-3 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.09)] rounded-xl p-4"
              onPress={() => router.push(`/workorder/${item.id}`)}
            >
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <Text className="text-blue-400 text-sm font-semibold mb-1">{item.orderNo}</Text>
                  <Text className="text-white font-bold text-lg">{item.productName}</Text>
                </View>
                <View className="bg-blue-600/20 px-3 py-1 rounded-lg">
                  <Text 
                    className="text-xs font-semibold"
                    style={{ color: getStatusColor(item.status) }}
                  >
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>

              {/* 進度條 */}
              <View className="mb-3">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-400 text-xs">進度</Text>
                  <Text className="text-gray-400 text-xs">{Math.round(progress)}%</Text>
                </View>
                <View className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                  <View
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </View>
              </View>

              {/* 統計 */}
              <View className="flex-row justify-between">
                <Text className="text-gray-400 text-xs">
                  {item.completedQty} / {item.quantity} 件
                </Text>
                <Text className="text-gray-400 text-xs">
                  截止: {new Date(item.plannedEnd).toLocaleDateString('zh-TW')}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingVertical: 16 }}
        ListEmptyComponent=(
          <View className="flex-1 justify-center items-center py-12">
            <Text className="text-gray-400">沒有工單</Text>
          </View>
        )
      />
    </View>
  );
}
