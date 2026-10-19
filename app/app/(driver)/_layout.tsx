import { Stack } from 'expo-router';

import { useScreenOptions } from '@/navigation/options';

export const unstable_settings = { anchor: '(tabs)' };

export default function DriverLayout() {
  const screenOptions = useScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="trips/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
