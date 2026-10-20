import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLoad } from '@/api/useRepo';
import { Section } from '@/components/form';
import { demoDate } from '@/demo/data';
import { dateTime } from '@/domain/format';
import type { Trip } from '@/domain/TripRepository';
import { EmptyState, Row, Skeleton, StatusChip } from '@/ui';
import { spacing } from '@/ui/tokens';

export default function Attention() {
  const insets = useSafeAreaInsets();
  const { data, error, retry } = useLoad(async (repo) => {
    const [problems, trips] = await Promise.all([repo.listProblems(), repo.listForDispatcher({ date: demoDate })]);
    return { problems: problems.filter((problem) => problem.status === 'open'), trips };
  }, 'attention');
  if (error) return <View className="flex-1 bg-background px-4"><EmptyState label={error} action={{ label: 'Повторить', onPress: retry }} /></View>;
  if (!data) return <View className="flex-1 bg-background px-4"><Skeleton /></View>;
  const open = (trip: Trip) => router.push({ pathname: '/(dispatcher)/trips/[id]', params: { id: trip.id } });
  const delayed = data.trips.filter((trip) => trip.delayed && !['completed', 'cancelled'].includes(trip.status));
  const notAccepted = data.trips.filter((trip) => trip.status === 'assigned');
  const awaiting = data.trips.filter((trip) => trip.status === 'awaiting_confirmation');
  const tripRow = (trip: Trip, detail: string, tone: 'delay' | 'waiting') => <Row key={trip.id} label={`${trip.number} · ${trip.order.pickup_city} → ${trip.order.delivery_city}`}
    detail={detail} detailMono trailing={<StatusChip label={tone === 'delay' ? 'Задержка' : 'Ждёт'} tone={tone} />} onPress={() => open(trip)} />;
  return <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: spacing.lg, gap: spacing.xxl, paddingBottom: insets.bottom + spacing.xl }}>
    <Section title={`Проблемы: ${data.problems.length}`}>
      {data.problems.length ? data.problems.map((problem) => <Row key={problem.id} label={`${problem.trip.number} · ${problem.reason}`}
        detail={`${dateTime(problem.created_at)}${problem.estimated_delay_min ? ` · задержка ${problem.estimated_delay_min} мин` : ''}`}
        trailing={<StatusChip label="Открыта" tone="delay" />}
        onPress={() => router.push({ pathname: '/(dispatcher)/problems/[id]', params: { id: problem.id } })} />) : <EmptyState label="Открытых проблем нет" />}
    </Section>
    <Section title={`Задержки: ${delayed.length}`}>
      {delayed.length ? delayed.map((trip) => tripRow(trip, `новая доставка ${dateTime(trip.current_planned_delivery_at)}`, 'delay')) : <EmptyState label="Задержек нет" />}
    </Section>
    <Section title={`Не приняты водителем: ${notAccepted.length}`}>
      {notAccepted.length ? notAccepted.map((trip) => tripRow(trip, `выезд ${dateTime(trip.depart_date, 'date')}`, 'waiting')) : <EmptyState label="Все рейсы приняты" />}
    </Section>
    <Section title={`Ожидают подтверждения: ${awaiting.length}`}>
      {awaiting.length ? awaiting.map((trip) => tripRow(trip, `плановая ${dateTime(trip.current_planned_delivery_at)}`, 'waiting')) : <EmptyState label="Нет рейсов, ожидающих подтверждения" />}
    </Section>
  </ScrollView>;
}
