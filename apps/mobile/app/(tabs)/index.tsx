import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

interface KPIData {
  totalQuantity: number;
  totalDefect: number;
  defectRate: string;
  reportCount: number;
}

export default function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userStr = await SecureStore.getItemAsync('user');
        if (userStr) {
          setUser(JSON.parse(userStr));
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-[#0a0f1e] justify-center items-center">
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#0a0f1e]" contentContainerStyle={{ paddingVertical: 24 }}>
      {/* 問候語 */}
      <View className="px-6 mb-8">
        <Text className="text-3xl font-bold text-white mb-1">
          早安, {user?.name}! ☀️
        </Text>
        <Text className="text-gray-400">今日班別: 早班</Text>
      </View>

      {/* KPI 卡片 */}
      <View className="px-6 space-y-4 mb-8">
        {/* 工單統計 */}
        <View className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.09)] rounded-2xl p-6">
          <Text className="text-gray-400 text-sm mb-2">今日工單進度</Text>
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-4xl font-bold text-blue-400">5</Text>
              <Text className="text-gray-500 text-sm">已完成 / 10 總數</Text>
            </View>
            <View className="w-20 h-20 bg-blue-600/20 rounded-full justify-center items-center border border-blue-500">
              <Text className="text-2xl font-bold text-blue-400">50%</Text>
            </View>
          </View>
        </View>

        {/* 報工統計 */}
        <View className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.09)] rounded-2xl p-6">
          <Text className="text-gray-400 text-sm mb-2">今日報工數</Text>
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-4xl font-bold text-green-400">145</Text>
              <Text className="text-gray-500 text-sm">件 / 200 目標</Text>
            </View>
            <Text className="text-2xl font-bold text-green-400">72%</Text>
          </View>
        </View>

        {/* 不良統計 */}
        <View className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.09)] rounded-2xl p-6">
          <Text className="text-gray-400 text-sm mb-2">今日不良統計</Text>
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-4xl font-bold text-orange-400">8</Text>
              <Text className="text-gray-500 text-sm">件 / 145 報工</Text>
            </View>
            <Text className="text-2xl font-bold text-orange-400">5.5%</Text>
          </View>
        </View>

        {/* 異常統計 */}
        <View className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.09)] rounded-2xl p-6">
          <Text className="text-gray-400 text-sm mb-2">今日異常</Text>
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-4xl font-bold text-red-400">3</Text>
              <Text className="text-gray-500 text-sm">件未解決</Text>
            </View>
            <Text className="text-lg font-bold text-red-400">⚠️</Text>
          </View>
        </View>
      </View>

      {/* AI 洞見卡片 */}
      <View className="px-6">
        <View className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/50 rounded-2xl p-6">
          <Text className="text-sm text-purple-300 mb-3">🤖 AI 每日洞見</Text>
          <Text className="text-white font-semibold mb-2">生產效率提升 15%</Text>
          <Text className="text-gray-300 text-sm leading-6">
            根據過去 7 天的數據分析,目前生產效率較上週提升 15%。不良率維持在 5% 以下。建議繼續保持當前的運作狀態。
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
