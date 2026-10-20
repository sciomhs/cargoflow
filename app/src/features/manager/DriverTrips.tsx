import { useLocalSearchParams } from 'expo-router';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLoad } from '@/api/useRepo';
import { data as seed } from '@/demo/data';
import { dateTime } from '@/domain/format';
import { EmptyState, Row, Skeleton, StatusChip, Text } from '@/ui';
import { spacing } from '@/ui/tokens';
import { statusPresentation } from '../trips/presentation';

export default function DriverTrips() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const insets = useSafeAreaInsets();
  const { data, error, retry } = useLoad(async (repo) => (await repo.listForDispatcher()).filter((trip) => trip.driver_id === id)
    .sort((a, b) => b.depart_date.localeCompare(a.depart_date)), `manager-driver:${id}`);
  const name = seed.profiles.find((profile) => profile.id === id)?.full_name ?? 'Водитель';
  return <FlatList className="flex-1 bg-background" data={data ?? []} keyExtractor={(trip) => trip.id} initialNumToRender={15}
    contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}
    ListHeaderComponent={<Text size="title" style={{ paddingVertical: spacing.lg }}>{name}{data ? ` · ${data.length}` : ''}</Text>}
    ListEmptyComponent={error ? <EmptyState label={error} action={{ label: 'Повторить', onPress: retry }} /> : data ? <EmptyState label="Рейсов нет" /> : <Skeleton />}
    renderItem={({ item }) => <Row label={`${item.number} · ${item.order.pickup_city} → ${item.order.delivery_city}`}
      detail={dateTime(item.depart_date, 'date')} detailMono trailing={<StatusChip {...statusPresentation(item)} />} />} />;
}
