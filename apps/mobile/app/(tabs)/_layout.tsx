import { Tabs } from 'expo-router';
import { Home, ClipboardList, QrCode, AlertCircle, User } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f1629',
          borderTopColor: 'rgba(255,255,255,0.09)',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首頁',
          tabBarLabel: '首頁',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="workorders"
        options={{
          title: '工單',
          tabBarLabel: '工單',
          tabBarIcon: ({ color }) => <ClipboardList color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: '掃描',
          tabBarLabel: '掃描',
          tabBarIcon: ({ color }) => <QrCode color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: '警報',
          tabBarLabel: '警報',
          tabBarIcon: ({ color }) => <AlertCircle color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '資料',
          tabBarLabel: '資料',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
