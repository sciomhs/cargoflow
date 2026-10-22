import { View } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';
import { spacing } from './tokens';

const tints = { accentText: 'tint', delay: '#FBE9E5', waiting: '#F7EFD9', completed: '#E3F4EA' } as const;

// Pill with a tinted background; colour is never the only signal, the label always names the state.
export function StatusChip({ label, tone = 'accentText' }: {
  label: string; tone?: 'accentText' | 'delay' | 'waiting' | 'completed';
}) {
  const { colors, mode } = useTheme();
  const background = tone === 'accentText' ? colors.tint : mode === 'dark' ? colors.pressed : tints[tone];
  return <View style={{ alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999, backgroundColor: background }}>
    <Text size="small" medium style={{ color: colors[tone] }}>{label}</Text>
  </View>;
}
