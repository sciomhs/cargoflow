import { Link, router, type NativeStackHeaderProps } from 'expo-router';
import { Header } from 'expo-router/react-navigation';
import { Settings } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useSession } from '@/store/session';

function SwitchRole() {
  const signOut = useSession((state) => state.signOut);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Сменить роль"
      onPress={signOut}
      style={({ pressed }) => ({
        minHeight: 56,
        justifyContent: 'center',
        paddingHorizontal: 16,
        opacity: pressed ? 0.5 : 1,
      })}>
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: 'IBMPlexSans_400Regular', fontSize: 14 }}>
        Сменить роль
      </Text>
    </Pressable>
  );
}

export function HeaderActions() {
  return (
    <View className="flex-row items-center">
      <Link href="/settings" asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Настройки"
          className="min-h-14 min-w-14 items-center justify-center active:opacity-50">
          <Settings size={20} strokeWidth={1.75} color="black" />
        </Pressable>
      </Link>
      <SwitchRole />
    </View>
  );
}

function CancelModal() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Отмена"
      onPress={() => router.back()}
      className="min-h-14 justify-center pr-4 active:opacity-50">
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: 'IBMPlexSans_400Regular', fontSize: 14 }}>
        Отмена
      </Text>
    </Pressable>
  );
}

function StackHeader({ options, route, back }: NativeStackHeaderProps) {
  return (
    <Header
      title={options.title ?? route.name}
      back={back && { ...back, title: 'Назад' }}
      headerLeft={options.headerLeft}
      headerRight={options.headerRight}
      headerTitleAlign="left"
      headerTintColor="black"
      headerTitleStyle={{ fontFamily: 'IBMPlexSans_400Regular', fontSize: 20 }}
    />
  );
}

export const screenOptions = {
  header: StackHeader,
  headerTitleAlign: 'left' as const,
  headerTitleStyle: { fontFamily: 'IBMPlexSans_400Regular', fontSize: 20 },
  headerTintColor: 'black',
  headerBackTitle: 'Назад',
  headerRight: () => <SwitchRole />,
  contentStyle: { backgroundColor: 'white' },
};

export const modalOptions = {
  presentation: 'fullScreenModal' as const,
  gestureEnabled: false,
  headerLeft: () => <CancelModal />,
};

export const tabOptions = {
  ...screenOptions,
  header: undefined,
  headerRight: () => <HeaderActions />,
  tabBarActiveTintColor: 'black',
  tabBarInactiveTintColor: 'dimgray',
  tabBarLabelStyle: { fontFamily: 'IBMPlexSans_400Regular', fontSize: 12 },
  tabBarItemStyle: { minHeight: 56 },
  tabBarStyle: { minHeight: 64 },
  sceneStyle: { backgroundColor: 'white' },
};
