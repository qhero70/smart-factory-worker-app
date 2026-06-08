import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

export default function LoginScreen() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // 檢查生物識別
  const checkBiometric = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    } catch (error) {
      console.error('Biometric check failed:', error);
    }
  };

  React.useEffect(() => {
    checkBiometric();
  }, []);

  // 登入
  const handleLogin = async () => {
    if (!employeeId || !pin) {
      Alert.alert('錯誤', '請輸入員工ID和PIN碼');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_API_URL}/api/auth/login`,
        { employeeId, pin }
      );

      const { accessToken, refreshToken, user } = response.data;

      // 保存令牌
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      await SecureStore.setItemAsync('user', JSON.stringify(user));

      Alert.alert('成功', `歡迎, ${user.name}!`);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('登入失敗', error.response?.data?.error || '請檢查員工ID和PIN碼');
    } finally {
      setLoading(false);
    }
  };

  // 生物識別登入
  const handleBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
        reason: '使用生物識別登入',
      });

      if (result.success) {
        const stored = await SecureStore.getItemAsync('user');
        if (stored) {
          router.replace('/(tabs)');
        }
      }
    } catch (error) {
      Alert.alert('生物識別失敗', '請重試或使用PIN碼登入');
    }
  };

  return (
    <View className="flex-1 bg-[#0a0f1e] justify-center px-6">
      {/* Logo 區域 */}
      <View className="mb-12">
        <Text className="text-4xl font-bold text-white text-center mb-2">🏭</Text>
        <Text className="text-2xl font-bold text-white text-center mb-2">智慧工廠</Text>
        <Text className="text-gray-400 text-center">員工行動應用程式</Text>
      </View>

      {/* 登入表單 */}
      <View className="space-y-4 mb-8">
        <View>
          <Text className="text-white mb-2 font-semibold">員工ID</Text>
          <TextInput
            className="bg-[#0f1629] border border-[rgba(255,255,255,0.09)] rounded-lg px-4 py-3 text-white"
            placeholder="輸入員工ID"
            placeholderTextColor="#666"
            value={employeeId}
            onChangeText={setEmployeeId}
            editable={!loading}
          />
        </View>

        <View>
          <Text className="text-white mb-2 font-semibold">PIN碼</Text>
          <TextInput
            className="bg-[#0f1629] border border-[rgba(255,255,255,0.09)] rounded-lg px-4 py-3 text-white"
            placeholder="輸入4位PIN碼"
            placeholderTextColor="#666"
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            maxLength={4}
            keyboardType="numeric"
            editable={!loading}
          />
        </View>
      </View>

      {/* 登入按鈕 */}
      <TouchableOpacity
        className="bg-blue-600 rounded-lg py-3 mb-4"
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white text-center font-bold text-lg">登入</Text>
        )}
      </TouchableOpacity>

      {/* 生物識別登入 */}
      {biometricAvailable && (
        <TouchableOpacity
          className="border border-blue-600 rounded-lg py-3"
          onPress={handleBiometric}
          disabled={loading}
        >
          <Text className="text-blue-400 text-center font-semibold">👆 生物識別登入</Text>
        </TouchableOpacity>
      )}

      {/* 底部提示 */}
      <View className="mt-12">
        <Text className="text-gray-500 text-center text-xs">
          測試帳號: EMP001 / PIN: 1234
        </Text>
      </View>
    </View>
  );
}
