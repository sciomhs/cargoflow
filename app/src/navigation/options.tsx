import { Link, router, type NativeStackHeaderProps } from 'expo-router';
import { Header } from 'expo-router/react-navigation';
import { Settings } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { signOutServer } from '@/api/repository';
import { useSession } from '@/store/session';
import { Text } from '@/ui';
import { useTheme } from '@/ui/theme';
import { fonts, icon, spacing, touch, typeScale } from '@/ui/tokens';

function SwitchRole() {
  const signOut = useSession((state) => state.signOut);
  return (
    <Pressable
      cssInterop={false}
      accessibilityRole="button"
      accessibilityLabel="Выйти"
      onPress={() => { void signOutServer(); signOut(); }}
      style={({ pressed }) => ({
        minHeight: touch.driver,
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        opacity: pressed ? 0.5 : 1,
      })}>
      <Text maxFontSizeMultiplier={1.3} size="small">
        Выйти
      </Text>
    </Pressable>
  );
}

export function HeaderActions() {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center">
      <Link href="/settings" asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Настройки"
          className="min-h-14 min-w-14 items-center justify-center active:opacity-50">
          <Settings {...icon} color={colors.text} />
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
      <Text maxFontSizeMultiplier={1.3} size="small">
        Отмена
      </Text>
    </Pressable>
  );
}

function StackHeader({ options, route, back }: NativeStackHeaderProps) {
  const { colors } = useTheme();
  return (
    <Header
      title={options.title ?? route.name}
      back={back && { ...back, title: 'Назад' }}
      headerLeft={options.headerLeft}
      headerRight={options.headerRight}
      headerTitleAlign="left"
      headerTintColor={colors.text}
      headerStyle={{ backgroundColor: colors.background }}
      headerTitleStyle={{ fontFamily: fonts.sans, ...typeScale.title }}
    />
  );
}

export function useScreenOptions() {
  const { colors } = useTheme();
  return {
    header: StackHeader,
    headerTitleAlign: 'left' as const,
    headerTitleStyle: { fontFamily: fonts.sans, ...typeScale.title },
    headerTintColor: colors.text,
    headerStyle: { backgroundColor: colors.background },
    headerBackTitle: 'Назад',
    headerRight: () => <SwitchRole />,
    contentStyle: { backgroundColor: colors.background },
  };
}

export const modalOptions = {
  presentation: 'fullScreenModal' as const,
  gestureEnabled: false,
  headerLeft: () => <CancelModal />,
};

export function useTabOptions() {
  const screenOptions = useScreenOptions();
  const { colors } = useTheme();
  return {
    ...screenOptions,
    header: undefined,
    headerRight: () => <HeaderActions />,
    tabBarActiveTintColor: colors.accentText,
    tabBarInactiveTintColor: colors.muted,
    tabBarLabelStyle: { fontFamily: fonts.sans, fontSize: typeScale.caption.fontSize },
    tabBarItemStyle: { minHeight: touch.driver },
    tabBarStyle: { minHeight: touch.driverAction, backgroundColor: colors.background, borderTopColor: colors.border },
    sceneStyle: { backgroundColor: colors.background },
  };
}
