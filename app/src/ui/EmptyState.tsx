import { View } from 'react-native';

import { Button } from './Button';
import { Text } from './Text';
import { spacing } from './tokens';

export function EmptyState({ label, action }: { label: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ gap: spacing.lg, paddingVertical: spacing.xl }}>
      <Text tone="muted">{label}</Text>
      {action && <Button variant="secondary" label={action.label} onPress={action.onPress} />}
    </View>
  );
}
