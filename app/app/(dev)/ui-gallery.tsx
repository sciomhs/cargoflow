import { Check } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from 'expo-router/react-navigation';

import { Text, Button, Row, StatusChip, Timeline, Field, EmptyState, Skeleton } from '@/ui';
import { ThemeProvider, useTheme } from '@/ui/theme';
import { icon, spacing, type Mode } from '@/ui/tokens';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={{ gap: spacing.lg }}>
    <Text size="title" accessibilityRole="header">{title}</Text>
    {children}
  </View>;
}

function Specimens({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  const [presses, setPresses] = useState(0);
  const [selected, setSelected] = useState(false);
  const [receiver, setReceiver] = useState('');
  const [error, setError] = useState<string>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const countPress = () => setPresses((value) => value + 1);
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={headerHeight}>
      <ScrollView className="flex-1 bg-background" keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.xxl }}>
        <Button variant="secondary" label={mode === 'light' ? 'Тёмная тема' : 'Светлая тема'}
          onPress={() => setMode(mode === 'light' ? 'dark' : 'light')} />
        <Section title="Текст">
          <Text size="display" mono>8 500 кг</Text>
          <Text>Павлодар → Астана</Text>
          <Text size="small" mono tone="muted">22 окт, 14:30 · 32 500 ₸</Text>
          <Text size="caption" tone="muted">IBM Plex Sans / IBM Plex Mono</Text>
        </Section>
        <Section title="Кнопки">
          <Button label="Создать заказ" onPress={countPress} />
          <Button label="Открыть рейс" variant="secondary" onPress={countPress} />
          <Button label="Удалить черновик" variant="destructive" onPress={countPress} />
          <Button label="Груз загружен" hint="Следующий: В пути" variant="driver-xl" onPress={countPress} />
          <Button label="Недоступно" disabled onPress={countPress} />
          <Text size="small" mono accessibilityLiveRegion="polite">Проверка нажатий: {presses}</Text>
        </Section>
        <Section title="Строка">
          <Row label="Руслан Касымов" detail="Volvo FH · 777 ABC 14" detailMono selected={selected}
            accessibilityRole="checkbox" accessibilityState={{ checked: selected }}
            onPress={() => setSelected(!selected)} trailing={selected && <Check {...icon} color={colors.accentText} />} />
        </Section>
        <Section title="Статусы">
          <StatusChip label="В пути" />
          <StatusChip label="Задерживается" tone="delay" />
          <StatusChip label="Ожидает подтверждения" tone="waiting" />
          <StatusChip label="Завершён" tone="completed" />
        </Section>
        <Section title="Этапы рейса">
          <Timeline steps={[
            { id: 'loaded', label: 'Груз загружен', time: '09:40', state: 'done' },
            { id: 'in_transit', label: 'В пути', time: '09:45', state: 'current' },
            { id: 'at_delivery', label: 'Прибытие на выгрузку', state: 'pending' },
          ]} />
        </Section>
        <Section title="Поле">
          <Field label="Получатель" value={receiver} onChangeText={setReceiver} error={error}
            keyboardType="default" textContentType="name" autoComplete="name" returnKeyType="done" />
          <Button label="Проверить поле" variant="secondary" onPress={() => setError(receiver.trim() ? undefined : 'Укажите получателя')} />
        </Section>
        <Section title="Пустое состояние">
          <EmptyState label="Заказов пока нет" action={{ label: 'Создать первый заказ', onPress: countPress }} />
        </Section>
        <Section title="Загрузка"><Skeleton /></Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function UIGallery() {
  const [mode, setMode] = useState<Mode>('light');
  return <ThemeProvider mode={mode}><Specimens mode={mode} setMode={setMode} /></ThemeProvider>;
}
