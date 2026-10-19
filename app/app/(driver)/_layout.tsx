import { Stack } from 'expo-router';

import { screenOptions } from '@/navigation/options';

export const unstable_settings = { anchor: '(tabs)' };

export default function DriverLayout() {
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="trips/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
