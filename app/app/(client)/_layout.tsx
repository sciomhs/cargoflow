import { Tabs } from 'expo-router/js-tabs';
import { Package, Bell } from 'lucide-react-native';

import { tabOptions } from '@/navigation/options';

export default function ClientLayout() {
  return (
    <Tabs initialRouteName="deliveries" screenOptions={tabOptions}>
      <Tabs.Screen
        name="deliveries"
        options={{
          title: 'Доставки',
          tabBarIcon: ({ color }) => <Package color={color} size={20} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Уведомления',
          tabBarIcon: ({ color }) => <Bell color={color} size={20} strokeWidth={1.75} />,
        }}
      />
    </Tabs>
  );
}
