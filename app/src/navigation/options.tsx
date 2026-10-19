import { Pressable, Text } from 'react-native';

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

export const screenOptions = {
  headerTitleAlign: 'left' as const,
  headerTitleStyle: { fontFamily: 'IBMPlexSans_400Regular', fontSize: 20 },
  headerTintColor: 'black',
  headerRight: () => <SwitchRole />,
  contentStyle: { backgroundColor: 'white' },
};

export const tabOptions = {
  ...screenOptions,
  tabBarActiveTintColor: 'black',
  tabBarInactiveTintColor: 'dimgray',
  tabBarLabelStyle: { fontFamily: 'IBMPlexSans_400Regular', fontSize: 12 },
  tabBarItemStyle: { minHeight: 56 },
  tabBarStyle: { minHeight: 64 },
  sceneStyle: { backgroundColor: 'white' },
};
