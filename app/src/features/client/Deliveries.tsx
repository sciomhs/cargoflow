import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLoad } from '@/api/useRepo';
import { dateTime } from '@/domain/format';
import { Button, EmptyState, Row, Skeleton, StatusChip } from '@/ui';
import { spacing } from '@/ui/tokens';
import { statusPresentation } from '../trips/presentation';
import { isActiveDelivery } from './presentation';

export default function Deliveries() {
  const { data, error, retry } = useLoad(async (repo) => (await repo.listForDispatcher())
    .sort((a, b) => b.depart_date.localeCompare(a.depart_date) || b.order.number.localeCompare(a.order.number, undefined, { numeric: true })), 'deliveries');
  const [active, setActive] = useState(true);
  const insets = useSafeAreaInsets();
  const shown = (data ?? []).filter((trip) => isActiveDelivery(trip) === active);
  return <FlatList className="flex-1 bg-background" data={shown} keyExtractor={(trip) => trip.id} initialNumToRender={15} windowSize={7}
    contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}
    ListHeaderComponent={<ScrollView horizontal accessibilityRole="tablist" contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.lg }}>
      {[true, false].map((value) => <Button key={String(value)} label={value ? 'Активные' : 'Завершённые'} variant={active === value ? 'primary' : 'secondary'}
        accessibilityRole="tab" accessibilityState={{ selected: active === value }} onPress={() => setActive(value)} />)}
    </ScrollView>}
    ListEmptyComponent={error ? <EmptyState label={error} action={{ label: 'Повторить', onPress: retry }} />
      : data ? <EmptyState label={active ? 'Активных доставок нет' : 'Завершённых доставок нет'} /> : <Skeleton />}
    renderItem={({ item }) => <Row label={`${item.order.number} · ${item.order.pickup_city} → ${item.order.delivery_city}`}
      detail={item.completed_at ? `Доставлено ${dateTime(item.completed_at, 'date')}` : `Плановая доставка ${dateTime(item.current_planned_delivery_at)}`} detailMono
      trailing={<StatusChip {...statusPresentation(item)} />}
      onPress={() => router.push({ pathname: '/(client)/deliveries/[id]', params: { id: item.id } })} />} />;
}
