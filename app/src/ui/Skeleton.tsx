import { View } from 'react-native';

import { useTheme } from './theme';
import { spacing } from './tokens';

export function Skeleton() {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Загрузка" accessibilityState={{ busy: true }}
      style={{ gap: spacing.md, paddingVertical: spacing.lg }}>
      <View style={{ height: 16, width: '70%', backgroundColor: colors.border }} />
      <View style={{ height: 12, width: '45%', backgroundColor: colors.border }} />
    </View>
  );
}
