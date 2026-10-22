import NavigationLinks from '@/components/navigation-links';
import { Alert, View } from 'react-native';
import { demoStore } from '@/demo/store';
import { signOutServer } from '@/api/repository';
import { useSession } from '@/store/session';
import { Row, Text } from '@/ui';
import { useSettings } from '@/store/settings';
import { spacing } from '@/ui/tokens';
import type { DemoPreview } from '@/demo/previewRepository';

export default function SettingsScreen() {
  const { demoMode, setDemoMode, demoPreview, setDemoPreview } = useSettings();
  const signOut = useSession((state) => state.signOut);
  return <View className="flex-1 bg-background">
    <View style={{ paddingHorizontal: spacing.lg }}>
      <Row label="Демо-режим" detail="Переключение режима завершает сеанс" accessibilityRole="switch"
        accessibilityState={{ checked: demoMode }} onPress={() => { setDemoMode(!demoMode); void signOutServer(); signOut(); }}
        trailing={<Text size="small">{demoMode ? 'Включён' : 'Выключен'}</Text>} />
      {demoMode && <Row label="Сбросить демо" detail="Удалить созданные заказы, рейсы и действия" onPress={() =>
        Alert.alert('Сбросить демо?', 'Созданные на этом устройстве заказы, рейсы, фото и уведомления будут удалены. Исходные данные 21 октября вернутся.', [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Сбросить', style: 'destructive', onPress: () => demoStore().reset() },
        ])} />}
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
