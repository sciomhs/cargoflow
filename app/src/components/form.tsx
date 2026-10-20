import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import type { ReactNode } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Row, Text } from '@/ui';
import { useTheme } from '@/ui/theme';
import { icon, spacing } from '@/ui/tokens';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={{ gap: spacing.md }}>
    <Text size="title" accessibilityRole="header">{title}</Text>
    {children}
  </View>;
}

// Scrollable form; the main action scrolls with it so the keyboard never hides fields behind it.
export function FormScreen({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <ScrollView className="flex-1 bg-background" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets
    contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }}>
    {children}
    <View style={{ gap: spacing.sm }}>{footer}</View>
  </ScrollView>;
}

// Asks before leaving a form with unsaved input: covers Cancel, Android back and gestures.
export function useDiscardGuard(dirty: boolean) {
  const navigation = useNavigation();
  usePreventRemove(dirty, ({ data }) => {
    Alert.alert('Отменить изменения?', 'Введённые данные не сохранятся.', [
      { text: 'Продолжить ввод', style: 'cancel' },
      { text: 'Отменить изменения', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
}

export function Choice({ label, detail, selected, disabled, onPress }: {
  label: string; detail?: string; selected: boolean; disabled?: boolean; onPress: () => void;
}) {
  const { colors } = useTheme();
  return <Row label={label} detail={detail} selected={selected} disabled={disabled} onPress={onPress}
    accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: !!disabled }}
    trailing={selected ? <Check {...icon} color={colors.accentText} /> : undefined} />;
}

export function FormError({ message }: { message?: string }) {
  return message ? <Text tone="delay" accessibilityRole="alert" accessibilityLiveRegion="assertive">{message}</Text> : null;
}
