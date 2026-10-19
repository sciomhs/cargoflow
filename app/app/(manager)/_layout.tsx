import { Stack } from 'expo-router';

import { screenOptions } from '@/navigation/options';

export default function ManagerLayout() {
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="dashboard" options={{ title: 'Обзор' }} />
    </Stack>
  );
}
