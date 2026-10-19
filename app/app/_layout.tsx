import '../global.css';
import 'react-native-reanimated';

import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono';
import { IBMPlexSans_400Regular, IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { useSession } from '@/store/session';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const role = useSession((state) => state.role);
  const [loaded, error] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexMono_400Regular,
  });

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  if (error) {
    return (
      <View className="flex-1 justify-center bg-white p-4">
        <Text accessibilityRole="alert">
          Не удалось загрузить шрифты. Перезапустите приложение.
        </Text>
      </View>
    );
  }
  if (!loaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={role === null}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'dispatcher'}>
          <Stack.Screen name="(dispatcher)" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'driver'}>
          <Stack.Screen name="(driver)" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'client'}>
          <Stack.Screen name="(client)" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'manager'}>
          <Stack.Screen name="(manager)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
