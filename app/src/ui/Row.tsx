import type { ReactNode } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';
import { cardRadius, spacing, touch } from './tokens';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  detail?: string;
  detailMono?: boolean;
  trailing?: ReactNode;
  selected?: boolean;
};

export function Row({ label, detail, detailMono, trailing, selected, onPress, disabled, ...props }: Props) {
  const { colors, isDriver } = useTheme();
  const style = {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.lg,
    minHeight: isDriver ? touch.driver : touch.normal,
    paddingVertical: isDriver ? spacing.lg : spacing.md, paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm, borderRadius: cardRadius, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  };
  const content = <>
    <View style={{ flex: 1, gap: spacing.xs }}>
      <Text medium={!!detail}>{label}</Text>
      {detail && <Text size="small" tone="muted" mono={detailMono}>{detail}</Text>}
    </View>
    {trailing}
  </>;
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable
      {...props}
      cssInterop={false}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={props.accessibilityRole ?? 'button'}
      accessibilityLabel={props.accessibilityLabel ?? (detail ? `${label}, ${detail}` : label)}
      style={({ pressed }) => [style, { opacity: disabled ? 0.4 : 1,
        backgroundColor: pressed || selected ? colors.pressed : colors.surface,
        borderColor: selected ? colors.accentText : colors.border }]}>
      {content}
    </Pressable>
  );
}
