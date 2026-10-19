import { Stack } from 'expo-router';

import { screenOptions, modalOptions } from '@/navigation/options';

export const unstable_settings = { anchor: 'index' };

export default function DriverTripLayout() {
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Рейс' }} />
      <Stack.Screen name="photo" options={{ title: 'Фото рейса' }} />
      <Stack.Screen name="docs" options={{ title: 'Документы' }} />
      <Stack.Screen name="problem" options={{ ...modalOptions, title: 'Сообщить о проблеме' }} />
      <Stack.Screen name="handover" options={{ ...modalOptions, title: 'Передача груза' }} />
    </Stack>
  );
}
