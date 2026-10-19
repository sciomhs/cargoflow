import { Tabs } from 'expo-router/js-tabs';
import { Package, Bell } from 'lucide-react-native';

import { useTabOptions } from '@/navigation/options';
import { icon } from '@/ui/tokens';

export default function ClientLayout() {
  const tabOptions = useTabOptions();
  return (
    <Tabs initialRouteName="deliveries" screenOptions={tabOptions}>
      <Tabs.Screen
        name="deliveries"
        options={{
          title: 'Доставки',
          tabBarIcon: ({ color }) => <Package color={color} {...icon} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Уведомления',
          tabBarIcon: ({ color }) => <Bell color={color} {...icon} />,
        }}
      />
    </Tabs>
  );
}
