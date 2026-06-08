import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const getPermission = async () => {
      const { status } = await CameraView.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getPermission();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    setLoading(true);

    try {
      // 觸發振動反饋
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // 驗證 QR Code
      Alert.alert('掃描成功', `工單編號: ${data}`);

      // 延遲後重置
      setTimeout(() => {
        setScanned(false);
      }, 1000);
    } catch (error) {
      Alert.alert('錯誤', '掃描失敗，請重試');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View className="flex-1 bg-[#0a0f1e] justify-center items-center">
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View className="flex-1 bg-[#0a0f1e] justify-center items-center px-6">
        <Text className="text-white text-center text-lg mb-4">📷</Text>
        <Text className="text-white font-bold text-lg text-center mb-2">需要相機權限</Text>
        <Text className="text-gray-400 text-center">請在設置中允許相機訪問</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0a0f1e]">
      <CameraView
        style={{ flex: 1 }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        {/* 掃描框 */}
        <View className="flex-1 justify-center items-center">
          <View className="w-64 h-64 border-2 border-blue-400 rounded-2xl opacity-75" />
        </View>

        {/* 底部提示 */}
        <View className="absolute bottom-0 left-0 right-0 bg-black/50 px-6 py-8">
          <Text className="text-white text-center font-semibold mb-2">
            📱 對準二維碼掃描
          </Text>
          <Text className="text-gray-300 text-center text-sm">
            將工單二維碼對準框內
          </Text>
        </View>

        {/* 加載指示器 */}
        {loading && (
          <View className="absolute inset-0 bg-black/50 justify-center items-center">
            <ActivityIndicator color="#3b82f6" size="large" />
          </View>
        )}
      </CameraView>
    </View>
  );
}
