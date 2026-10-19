import { Stack } from 'expo-router';

import { screenOptions } from '@/navigation/options';

export const unstable_settings = { anchor: '(tabs)' };

export default function ClientLayout() {
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="deliveries/[id]" options={{ title: 'Доставка' }} />
    </Stack>
  );
}
