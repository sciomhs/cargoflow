import { Tabs } from 'expo-router/js-tabs';
import { Truck, ClipboardList, CircleAlert } from 'lucide-react-native';

import { useTabOptions } from '@/navigation/options';
import { icon } from '@/ui/tokens';

export default function DispatcherLayout() {
  const tabOptions = useTabOptions();
  return (
    <Tabs initialRouteName="trips" screenOptions={tabOptions}>
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Рейсы',
          tabBarIcon: ({ color }) => <Truck color={color} {...icon} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Заказы',
          tabBarIcon: ({ color }) => <ClipboardList color={color} {...icon} />,
        }}
      />
      <Tabs.Screen
        name="attention"
        options={{
          title: 'Внимание',
          tabBarIcon: ({ color }) => <CircleAlert color={color} {...icon} />,
        }}
      />
    </Tabs>
  );
}
