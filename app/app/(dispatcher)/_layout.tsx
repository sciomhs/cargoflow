import { Stack } from 'expo-router';

import { useScreenOptions, modalOptions } from '@/navigation/options';

export const unstable_settings = { anchor: '(tabs)' };

export default function DispatcherLayout() {
  const screenOptions = useScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="trips/[id]" options={{ title: 'Рейс' }} />
      <Stack.Screen name="orders/[id]" options={{ title: 'Заказ' }} />
      <Stack.Screen name="problems/[id]" options={{ title: 'Проблема' }} />
      <Stack.Screen name="orders/new" options={{ ...modalOptions, title: 'Новый заказ' }} />
      <Stack.Screen name="trips/new" options={{ ...modalOptions, title: 'Новый рейс' }} />
    </Stack>
  );
}
