import { Tabs } from 'expo-router/js-tabs';
import { Truck, History } from 'lucide-react-native';

import { useTabOptions } from '@/navigation/options';
import { icon } from '@/ui/tokens';

export default function DriverLayout() {
  const tabOptions = useTabOptions();
  return (
    <Tabs initialRouteName="today" screenOptions={tabOptions}>
      <Tabs.Screen
        name="today"
        options={{
          title: 'Сегодня',
          tabBarIcon: ({ color }) => <Truck color={color} {...icon} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'История',
          tabBarIcon: ({ color }) => <History color={color} {...icon} />,
        }}
      />
    </Tabs>
  );
}
