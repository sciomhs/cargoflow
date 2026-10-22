import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';

import { Text } from './Text';
import { useTheme } from './theme';
import { cardRadius, icon, radius, spacing, touch } from './tokens';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return <View style={[{ backgroundColor: colors.surface, borderRadius: cardRadius, padding: spacing.lg, gap: spacing.md,
    shadowColor: '#2A1E66', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, style]}>
    {children}
  </View>;
}

export function IconTile({ Icon, size = 44 }: { Icon: LucideIcon; size?: number }) {
  const { colors } = useTheme();
  return <View accessible={false} style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.tint,
    alignItems: 'center', justifyContent: 'center' }}>
    <Icon size={size * 0.5} strokeWidth={icon.strokeWidth} color={colors.accentText} />
  </View>;
}

// Menu-style row: icon tile, label, optional value, chevron.
export function ActionRow({ Icon, label, detail, onPress, expanded }: {
  Icon: LucideIcon; label: string; detail?: string; onPress?: () => void; expanded?: boolean;
}) {
  const { colors } = useTheme();
  return <Pressable cssInterop={false} onPress={onPress} disabled={!onPress} accessibilityRole="button"
    accessibilityLabel={detail ? `${label}, ${detail}` : label} accessibilityState={{ expanded }}
    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: touch.driver,
      padding: spacing.md, borderRadius: cardRadius, backgroundColor: pressed ? colors.pressed : colors.surface,
      shadowColor: '#2A1E66', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 })}>
    <IconTile Icon={Icon} size={40} />
    <View style={{ flex: 1, gap: 2 }}>
      <Text medium>{label}</Text>
      {detail && <Text size="small" tone="muted">{detail}</Text>}
    </View>
    {onPress && <ChevronRight size={icon.size} strokeWidth={icon.strokeWidth} color={colors.muted}
      style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }} />}
  </Pressable>;
}
