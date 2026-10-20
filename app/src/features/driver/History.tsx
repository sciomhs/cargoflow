import { router } from 'expo-router';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLoad, useUser } from '@/api/useRepo';
import { dateTime } from '@/domain/format';
import { EmptyState, Row, Skeleton, StatusChip } from '@/ui';
import { spacing } from '@/ui/tokens';
import { statusPresentation } from '../trips/presentation';
import { isOpen } from './presentation';

export default function History() {
  const user = useUser();
  const insets = useSafeAreaInsets();
  const { data, error, retry } = useLoad(async (repo) => (await repo.listForDriver(user!.id)).filter((trip) => !isOpen(trip))
    .sort((a, b) => (b.completed_at ?? b.created_at).localeCompare(a.completed_at ?? a.created_at)), `history:${user?.id}`);
  return <FlatList className="flex-1 bg-background" data={data ?? []} keyExtractor={(trip) => trip.id}
    contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}
    ListEmptyComponent={error ? <EmptyState label={error} action={{ label: 'Повторить', onPress: retry }} />
      : data ? <EmptyState label="Завершённых рейсов пока нет" /> : <Skeleton />}
    renderItem={({ item }) => <Row label={`${item.order.pickup_city} → ${item.order.delivery_city}`}
      detail={`${item.number} · ${item.completed_at ? `завершён ${dateTime(item.completed_at)}` : dateTime(item.depart_date, 'date')}`} detailMono
      trailing={<StatusChip {...statusPresentation(item)} />}
      onPress={() => router.push({ pathname: '/(driver)/trips/[id]', params: { id: item.id } })} />} />;
}
