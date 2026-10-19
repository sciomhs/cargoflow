import { Stack } from 'expo-router';

import { screenOptions, HeaderActions } from '@/navigation/options';

export const unstable_settings = { anchor: 'dashboard' };

export default function ManagerLayout() {
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="dashboard" options={{ title: 'Обзор', headerRight: () => <HeaderActions /> }} />
      <Stack.Screen name="drivers/[id]" options={{ title: 'Рейсы водителя' }} />
    </Stack>
  );
}
