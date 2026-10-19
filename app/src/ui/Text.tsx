import { Text as NativeText, type TextProps } from 'react-native';

import { useTheme } from './theme';
import { fonts, typeScale, type Colors } from './tokens';

type Props = TextProps & {
  size?: keyof typeof typeScale;
  tone?: keyof Colors;
  mono?: boolean;
  medium?: boolean;
};

export function Text({ size = 'body', tone = 'text', mono, medium, style, ...props }: Props) {
  const { colors } = useTheme();
  return (
    <NativeText
      {...props}
      style={[
        { ...typeScale[size], color: colors[tone], fontFamily: mono ? fonts.mono : medium ? fonts.medium : fonts.sans,
          includeFontPadding: false, fontVariant: mono ? ['tabular-nums'] : undefined },
        style,
      ]}
    />
  );
}
