import { View } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';
import { spacing } from './tokens';

export function StatusChip({ label, tone = 'accentText' }: {
  label: string; tone?: 'accentText' | 'delay' | 'waiting' | 'completed';
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View accessible={false} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors[tone] }} />
      <Text size="small">{label}</Text>
    </View>
  );
}
