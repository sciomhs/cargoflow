import '../global.css';
import 'react-native-reanimated';

import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono';
import { IBMPlexSans_400Regular, IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans';
import { useFonts } from 'expo-font';
import { DefaultTheme, ThemeProvider as NavigationThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text as NativeText, View } from 'react-native';

import { useSession } from '@/store/session';
import { useScreenOptions } from '@/navigation/options';
import { ThemeProvider, useTheme } from '@/ui/theme';
import { palettes } from '@/ui/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
      <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: palettes.light.background }}>
        <NativeText accessibilityRole="alert">
          Не удалось загрузить шрифты. Перезапустите приложение.
        </NativeText>
      </View>
    );
  }
  if (!loaded) return null;

  return <ThemeProvider><AppNavigator /></ThemeProvider>;
}

function AppNavigator() {
  const role = useSession((state) => state.role);
  const { mode, colors } = useTheme();
  const screenOptions = useScreenOptions();
  const navigationTheme = {
    ...DefaultTheme,
    dark: mode === 'dark',
    colors: { ...DefaultTheme.colors, background: colors.background, card: colors.background,
      text: colors.text, border: colors.border, primary: colors.accentText, notification: colors.delay },
  };
  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="trip/[id]" />
        <Stack.Protected guard={__DEV__ && role !== null}>
          <Stack.Screen name="(dev)" />
        </Stack.Protected>
        <Stack.Protected guard={role !== null}>
          <Stack.Screen name="settings" options={{ ...screenOptions, headerShown: true, title: 'Настройки' }} />
        </Stack.Protected>
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
    </NavigationThemeProvider>
  );
}
