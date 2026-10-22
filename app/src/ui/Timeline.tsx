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
          <View style={{ width: 14, alignItems: 'center' }}>
            <View style={{ marginTop: spacing.xs, width: 14, height: 14, borderRadius: 7,
              backgroundColor: step.state === 'pending' ? colors.border : colors.accentText,
              borderWidth: step.state === 'current' ? 3 : 0, borderColor: colors.tint }} />
            {index < steps.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: step.state === 'done' ? colors.accentText : colors.border }} />}
          </View>
          <View style={{ flex: 1, flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.xl }}>
            <Text style={{ flex: 1 }} medium={step.state === 'current'} tone={step.state === 'pending' ? 'muted' : 'text'}>
              {step.label}
            </Text>
            {step.state === 'current' ? <Text size="small" medium tone="accentText">В процессе</Text>
              : step.time && <Text mono size="small" tone="muted">{step.time}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}
