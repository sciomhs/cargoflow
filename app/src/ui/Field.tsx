import { useId, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';
import { fonts, radius, spacing, touch, typeScale } from './tokens';

export function Field({ label, error, style, onFocus, onBlur, editable = true, ...props }: TextInputProps & {
  label: string; error?: string;
}) {
  const { colors, isDriver } = useTheme();
  const [focused, setFocused] = useState(false);
  const id = useId();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text size="small" nativeID={`${id}-label`}>{label}</Text>
      <TextInput
        {...props}
        editable={editable}
        accessibilityLabel={label}
        accessibilityHint={error}
        accessibilityLabelledBy={`${id}-label`}
        placeholderTextColor={colors.muted}
        selectionColor={colors.accentText}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        style={[{
          ...typeScale.body, fontFamily: fonts.sans, color: colors.text,
          minHeight: isDriver ? touch.driver : touch.normal, padding: spacing.md,
          backgroundColor: colors.surface, borderWidth: 1, borderRadius: radius,
          borderColor: error ? colors.delay : focused ? colors.accentText : colors.border,
          opacity: editable ? 1 : 0.4,
        }, style]}
      />
      {error && <Text size="small" tone="delay" accessibilityRole="alert">{error}</Text>}
    </View>
  );
}
