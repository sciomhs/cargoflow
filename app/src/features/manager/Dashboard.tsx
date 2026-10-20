import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLoad } from '@/api/useRepo';
import { Section } from '@/components/form';
import { data as seed } from '@/demo/data';
import { hours } from '@/domain/format';
import { EmptyState, Row, Skeleton, Text } from '@/ui';
import { spacing } from '@/ui/tokens';
import { monthStats } from './stats';

function Figure({ value, label }: { value: string | number; label: string }) {
  return <View style={{ width: '47%', gap: spacing.xs }} accessible accessibilityLabel={`${label}: ${value}`}>
    <Text mono size="display">{value}</Text>
    <Text size="caption" tone="muted">{label}</Text>
  </View>;
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const { data, error, retry } = useLoad(async (repo) => {
    const [trips, options] = await Promise.all([repo.listForDispatcher(), repo.assignmentOptions()]);
    return { stats: monthStats(trips), names: new Map(seed.profiles.map((p) => [p.id, p.full_name])), drivers: options.drivers };
  }, 'dashboard');
  if (error) return <View className="flex-1 bg-background px-4"><EmptyState label={error} action={{ label: 'Повторить', onPress: retry }} /></View>;
  if (!data) return <View className="flex-1 bg-background px-4"><Skeleton /></View>;
  const { stats, names } = data;
  return <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: spacing.lg, gap: spacing.xxl, paddingBottom: insets.bottom + spacing.xl }}>
    <Section title="За месяц">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg, columnGap: spacing.lg }}>
        <Figure value={stats.total} label="Рейсов за месяц" />
        <Figure value={stats.completed} label="Завершено" />
        <Figure value={stats.inTransit} label="В пути" />
        <Figure value={stats.delayed} label="Задерживаются" />
        <Figure value={stats.cancelled} label="Отменено" />
        <Figure value={hours(stats.averageHours)} label="Среднее время доставки" />
        <Figure value={`${Math.round(stats.onTimeShare * 100)} %`} label="Завершено без задержек" />
        <Figure value={stats.problems} label="Рейсов с проблемой" />
      </View>
    </Section>
    <Section title="Водители">
      {stats.byDriver.map((driver) => <Row key={driver.id} label={names.get(driver.id) ?? 'Водитель'}
        detail={`Активных: ${driver.active} · всего за месяц: ${driver.trips}`}
        onPress={() => router.push({ pathname: '/(manager)/drivers/[id]', params: { id: driver.id } })} />)}
    </Section>
    <Section title="Направления">
      {stats.byRoute.map((route) => <Row key={route.route} label={route.route} detail={`Рейсов: ${route.trips} · с задержкой: ${route.delayed}`} />)}
    </Section>
  </ScrollView>;
}
