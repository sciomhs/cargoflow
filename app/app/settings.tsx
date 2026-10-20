import NavigationLinks from '@/components/navigation-links';
import { View } from 'react-native';
import { Row, Text } from '@/ui';
import { useSettings } from '@/store/settings';
import { spacing } from '@/ui/tokens';

export default function SettingsScreen() {
  const { demoMode, setDemoMode } = useSettings();
  return <View className="flex-1 bg-background">
    <View style={{ paddingHorizontal: spacing.lg }}>
      <Row label="Демо-режим" detail="Данные доступны без сети" accessibilityRole="switch"
        accessibilityState={{ checked: demoMode }} onPress={() => setDemoMode(!demoMode)}
        trailing={<Text size="small">{demoMode ? 'Включён' : 'Выключен'}</Text>} />
    </View>
    <NavigationLinks links={__DEV__ ? [{ label: 'Галерея компонентов', href: '/(dev)/ui-gallery' }] : []} />
  </View>;
}
