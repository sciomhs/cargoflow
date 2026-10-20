import { useEffect, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tripRepository } from '@/api/repository';
import { demoDate } from '@/demo/data';
import type { Trip } from '@/domain/TripRepository';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { Text, Row, Button, StatusChip, EmptyState, Skeleton } from '@/ui';
import { spacing } from '@/ui/tokens';
import { counts, filterTrips, segments, statusPresentation, dateTime, type Segment } from './presentation';

export default function TripList() {
  const role = useSession((state) => state.role);
  const demoMode = useSettings((state) => state.demoMode);
  const preview = useSettings((state) => state.demoPreview);
  const [result, setResult] = useState<{ key?: string; trips?: Trip[]; error?: string }>({});
  const [retry, setRetry] = useState(0);
  const [segment, setSegment] = useState<Segment>('all');
  const insets = useSafeAreaInsets();
  const requestKey = `${role}:${demoMode}:${preview}:${retry}`;
  const current = result.key === requestKey ? result : {};
  const summary = counts(current.trips ?? []);
  useEffect(() => {
    let active = true;
    if (role) tripRepository(demoMode, role, preview).then((repo) => repo.listForDispatcher({ date: demoDate }))
      .then((trips) => { if (active) setResult({ key: requestKey, trips }); })
      .catch((error: Error) => { if (active) setResult({ key: requestKey, error: error.message }); });
    return () => { active = false; };
  }, [demoMode, role, preview, requestKey]);
  return (
    <FlatList className="flex-1 bg-background" data={filterTrips(current.trips ?? [], segment)} keyExtractor={(trip) => trip.id}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}
      ListHeaderComponent={<View style={{ gap: spacing.sm, paddingVertical: spacing.lg }}>
        <Text mono>{current.trips ? `Рейсов: ${current.trips.length}` : 'Рейсы'}</Text>
        <Text size="small" tone="muted">21 окт · {demoMode ? 'Демо-данные' : 'Локальный Supabase'}</Text>
        {current.trips && <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.lg, paddingVertical: spacing.md }}>
            {segments.map(({ key, title }) => <View key={key} style={{ width: 96, gap: spacing.xs }}>
              <Text mono size="display" accessibilityLabel={`${title}: ${summary[key]}`}>{summary[key]}</Text>
              <Text size="caption" tone="muted">{title}</Text>
            </View>)}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist"
            contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.sm }}>
            {segments.map(({ key, label }) => <Button key={key} label={label}
              variant={segment === key ? 'primary' : 'secondary'} accessibilityRole="tab"
              accessibilityState={{ selected: segment === key }} onPress={() => setSegment(key)} />)}
          </ScrollView>
          <Text size="small" tone="muted" accessibilityLiveRegion="polite">Показано: {filterTrips(current.trips, segment).length}</Text>
        </>}
      </View>}
      ListEmptyComponent={current.error ? <EmptyState label={current.error} action={{ label: 'Повторить', onPress: () => setRetry(retry + 1) }} />
        : current.trips ? <EmptyState label="Рейсов в этом разделе нет" /> : <Skeleton />}
      renderItem={({ item }) => <Row label={`${item.order.pickup_city} → ${item.order.delivery_city}`}
        detail={`${item.number} · ${dateTime(item.current_planned_delivery_at)}`} detailMono
        trailing={<StatusChip {...statusPresentation(item)} />}
        onPress={() => router.push({ pathname: '/(dispatcher)/trips/[id]', params: { id: item.id } })} />}
    />
  );
}
