import { Stack } from 'expo-router';

import { useScreenOptions } from '@/navigation/options';

export const unstable_settings = { anchor: 'ui-gallery' };

export default function DevLayout() {
  const options = useScreenOptions();
  return <Stack screenOptions={options}><Stack.Screen name="ui-gallery" options={{ title: 'Компоненты' }} /></Stack>;
}
