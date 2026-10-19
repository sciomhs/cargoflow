import { View } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';
import { spacing } from './tokens';

type Step = { id: string; label: string; time?: string; state: 'done' | 'current' | 'pending' };

export function Timeline({ steps }: { steps: Step[] }) {
  const { colors } = useTheme();
  return (
    <View>
      {steps.map((step, index) => (
        <View key={step.id} accessible
          accessibilityLabel={[step.label, { done: 'Пройден', current: 'Текущий этап', pending: 'Предстоит' }[step.state], step.time].filter(Boolean).join(', ')}
          style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ width: 8, alignItems: 'center' }}>
            <View style={{ marginTop: spacing.sm, width: 8, height: 8, borderRadius: 4,
              backgroundColor: step.state === 'current' ? colors.accentText : step.state === 'done' ? colors.completed : colors.border }} />
            {index < steps.length - 1 && <View style={{ width: 1, flex: 1, backgroundColor: colors.border }} />}
          </View>
          <View style={{ flex: 1, flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.xl }}>
            <Text style={{ flex: 1 }} medium={step.state === 'current'} tone={step.state === 'pending' ? 'muted' : 'text'}>
              {step.label}
            </Text>
            {step.time && <Text mono size="small" tone="muted">{step.time}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}
