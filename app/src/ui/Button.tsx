import { Pressable, type PressableProps } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';
import { radius, spacing, touch } from './tokens';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  hint?: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'driver-xl';
};

export function Button({ label, hint, variant = 'primary', disabled, ...props }: Props) {
  const { colors } = useTheme();
  const secondary = variant === 'secondary';
  const destructive = variant === 'destructive';
  // NativeWind v4 drops Pressable style callbacks unless interop is disabled.
  return (
    <Pressable
      {...props}
      cssInterop={false}
      disabled={disabled}
      accessibilityRole={props.accessibilityRole ?? 'button'}
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ ...props.accessibilityState, disabled: disabled ?? false }}
      style={({ pressed }) => ({
        minHeight: variant === 'driver-xl' ? touch.driverAction : touch.normal,
        justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
        borderRadius: radius, borderWidth: secondary ? 1 : 0, borderColor: colors.border,
        backgroundColor: secondary ? colors.surface : destructive ? colors.destructive : colors.accent,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}>
      <Text medium maxFontSizeMultiplier={1.3} tone={secondary ? 'text' : destructive ? 'onDestructive' : 'onAccent'}>
        {label}
      </Text>
      {hint && <Text size="caption" maxFontSizeMultiplier={1.3} tone={secondary ? 'muted' : 'onAccent'}>{hint}</Text>}
    </Pressable>
  );
}
