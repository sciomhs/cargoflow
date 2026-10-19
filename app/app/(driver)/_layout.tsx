import { Tabs } from 'expo-router/js-tabs';
import { Truck, History } from 'lucide-react-native';

import { tabOptions } from '@/navigation/options';

export default function DriverLayout() {
  return (
    <Tabs initialRouteName="today" screenOptions={tabOptions}>
      <Tabs.Screen
        name="today"
        options={{
          title: 'Сегодня',
          tabBarIcon: ({ color }) => <Truck color={color} size={20} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'История',
          tabBarIcon: ({ color }) => <History color={color} size={20} strokeWidth={1.75} />,
        }}
      />
    </Tabs>
  );
}
