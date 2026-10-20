import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLoad, useUser } from '@/api/useRepo';
import { Section } from '@/components/form';
import { dateTime, kilograms } from '@/domain/format';
import { Button, EmptyState, Row, Skeleton, StatusChip, Text } from '@/ui';
import { useTheme } from '@/ui/theme';
import { radius, spacing } from '@/ui/tokens';
import { statusPresentation } from '../trips/presentation';
import { driverQueue } from './presentation';

export default function Today() {
  const user = useUser();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, error, retry } = useLoad(async (repo) => ({
    trips: driverQueue(await repo.listForDriver(user!.id)),
    notifications: (await repo.listNotifications()).filter((item) => !item.read_at),
    markRead: (id: string) => repo.markRead(id),
  }), `today:${user?.id}`);
  if (error) return <View className="flex-1 bg-background px-4"><EmptyState label={error} action={{ label: 'Повторить', onPress: retry }} /></View>;
  if (!data) return <View className="flex-1 bg-background px-4"><Skeleton /></View>;
  const [current, ...next] = data.trips;
  const open = (id: string) => router.push({ pathname: '/(driver)/trips/[id]', params: { id } });
  return <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: spacing.lg, gap: spacing.xxl, paddingBottom: insets.bottom + spacing.xl }}>
    {data.notifications.length > 0 && <Section title="Новое">
      {data.notifications.map((item) => <Row key={item.id} label={item.title} detail={item.body ?? undefined}
        onPress={() => { void data.markRead(item.id); if (item.trip_id) open(item.trip_id); }} />)}
    </Section>}
    {current ? <View style={{ gap: spacing.md, padding: spacing.lg, borderRadius: radius, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
      <Text size="small" tone="muted">Текущий рейс</Text>
      <Text mono size="display">{current.number}</Text>
      <Text size="title">{current.order.pickup_city} → {current.order.delivery_city}</Text>
      <Text tone="muted">{current.order.cargo_name} · {kilograms(current.order.weight_kg)}</Text>
      <Text mono size="small" tone="muted">Выезд {dateTime(current.depart_date, 'date')} · доставка {dateTime(current.current_planned_delivery_at)}</Text>
      <StatusChip {...statusPresentation(current)} />
      <Button variant="driver-xl" label={current.status === 'assigned' ? 'Открыть и принять рейс' : 'Открыть рейс'} onPress={() => open(current.id)} />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}><Button variant="secondary" label="Проблема"
          onPress={() => router.push({ pathname: '/(driver)/trips/[id]/problem', params: { id: current.id } })} /></View>
        <View style={{ flex: 1 }}><Button variant="secondary" label="Документ"
          onPress={() => router.push({ pathname: '/(driver)/trips/[id]/docs', params: { id: current.id } })} /></View>
      </View>
    </View> : <EmptyState label="Назначенных рейсов нет. Новый рейс появится здесь и в уведомлении." />}
    {next.length > 0 && <Section title="Следующие">
      {next.map((trip) => <Row key={trip.id} label={`${trip.order.pickup_city} → ${trip.order.delivery_city}`}
        detail={`${trip.number} · выезд ${dateTime(trip.depart_date, 'date')}`} detailMono
        trailing={<StatusChip {...statusPresentation(trip)} />} onPress={() => open(trip.id)} />)}
    </Section>}
  </ScrollView>;
}
