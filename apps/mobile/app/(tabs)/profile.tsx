import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userStr = await SecureStore.getItemAsync('user');
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert('登出', '確定要登出嗎?', [
      { text: '取消', style: 'cancel' },
      {
        text: '確認',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
          await SecureStore.deleteItemAsync('user');
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View className="flex-1 bg-[#0a0f1e] justify-center items-center">
        <Text className="text-gray-400">加載中...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#0a0f1e]" contentContainerStyle={{ paddingVertical: 24 }}>
      {/* 頭像與基本信息 */}
      <View className="items-center mb-8">
        <View className="w-20 h-20 bg-blue-600 rounded-full justify-center items-center mb-4">
          <Text className="text-4xl">👤</Text>
        </View>
        <Text className="text-2xl font-bold text-white mb-1">{user.name}</Text>
        <Text className="text-gray-400 mb-3">{user.employeeId}</Text>
        <View className="bg-blue-600/20 px-4 py-2 rounded-full border border-blue-500">
          <Text className="text-blue-400 font-semibold text-sm">{user.role}</Text>
        </View>
      </View>

      {/* 詳細信息 */}
      <View className="px-6 space-y-4 mb-8">
        <View className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
          <Text className="text-gray-400 text-xs mb-1">部門</Text>
          <Text className="text-white font-semibold text-base">{user.department}</Text>
        </View>

        <View className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
          <Text className="text-gray-400 text-xs mb-1">角色</Text>
          <Text className="text-white font-semibold text-base">
            {user.role === 'OPERATOR' ? '操作員' : user.role === 'MANAGER' ? '經理' : user.role}
          </Text>
        </View>

        <View className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
          <Text className="text-gray-400 text-xs mb-1">應用版本</Text>
          <Text className="text-white font-semibold text-base">1.0.0</Text>
        </View>
      </View>

      {/* 操作按鈕 */}
      <View className="px-6 space-y-3">
        <TouchableOpacity className="bg-blue-600 rounded-lg py-3">
          <Text className="text-white text-center font-semibold">修改PIN碼</Text>
        </TouchableOpacity>

        <TouchableOpacity className="bg-gray-600/20 border border-gray-600 rounded-lg py-3">
          <Text className="text-gray-300 text-center font-semibold">隱私政策</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-red-600/20 border border-red-600 rounded-lg py-3"
          onPress={handleLogout}
        >
          <Text className="text-red-400 text-center font-semibold">登出</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
