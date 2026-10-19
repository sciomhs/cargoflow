import { Tabs } from 'expo-router/js-tabs';
import { Truck, ClipboardList, CircleAlert } from 'lucide-react-native';

import { tabOptions } from '@/navigation/options';

export default function DispatcherLayout() {
  return (
    <Tabs initialRouteName="trips" screenOptions={tabOptions}>
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Рейсы',
          tabBarIcon: ({ color }) => <Truck color={color} size={20} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Заказы',
          tabBarIcon: ({ color }) => <ClipboardList color={color} size={20} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="attention"
        options={{
          title: 'Внимание',
          tabBarIcon: ({ color }) => <CircleAlert color={color} size={20} strokeWidth={1.75} />,
        }}
      />
    </Tabs>
  );
}
