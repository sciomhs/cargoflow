import NavigationLinks from '@/components/navigation-links';
import { View } from 'react-native';
import { Row, Text } from '@/ui';
import { useSettings } from '@/store/settings';
import { spacing } from '@/ui/tokens';
import type { DemoPreview } from '@/demo/previewRepository';

export default function SettingsScreen() {
  const { demoMode, setDemoMode, demoPreview, setDemoPreview } = useSettings();
  return <View className="flex-1 bg-background">
    <View style={{ paddingHorizontal: spacing.lg }}>
      <Row label="Демо-режим" detail="Данные доступны без сети" accessibilityRole="switch"
        accessibilityState={{ checked: demoMode }} onPress={() => setDemoMode(!demoMode)}
        trailing={<Text size="small">{demoMode ? 'Включён' : 'Выключен'}</Text>} />
      {__DEV__ && demoMode && <View accessibilityRole="radiogroup" accessibilityLabel="Проверка экранов">
        <Text size="small" tone="muted" style={{ marginTop: spacing.lg }}>Проверка экранов</Text>
        {([['normal', 'Данные'], ['loading', 'Загрузка'], ['empty', 'Пусто'], ['error', 'Ошибка']] as [DemoPreview, string][])
          .map(([value, label]) => <Row key={value} label={label} selected={demoPreview === value}
            accessibilityRole="radio" accessibilityState={{ checked: demoPreview === value }}
            onPress={() => setDemoPreview(value)} />)}
      </View>}
    </View>
    <NavigationLinks links={__DEV__ ? [{ label: 'Галерея компонентов', href: '/(dev)/ui-gallery' }] : []} />
  </View>;
}
