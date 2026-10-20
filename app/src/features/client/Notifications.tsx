import { router } from 'expo-router';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLoad } from '@/api/useRepo';
import { dateTime } from '@/domain/format';
import { EmptyState, Row, Skeleton, Text } from '@/ui';
import { spacing } from '@/ui/tokens';

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const { data, error, retry } = useLoad(async (repo) => ({ items: await repo.listNotifications(), markRead: (id: string) => repo.markRead(id) }), 'notifications');
  return <FlatList className="flex-1 bg-background" data={data?.items ?? []} keyExtractor={(item) => item.id}
    contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}
    ListEmptyComponent={error ? <EmptyState label={error} action={{ label: 'Повторить', onPress: retry }} />
      : data ? <EmptyState label="Уведомлений пока нет" /> : <Skeleton />}
    renderItem={({ item }) => <Row label={item.title} detail={`${item.body ?? ''}\n${dateTime(item.created_at)}`}
      accessibilityLabel={`${item.read_at ? '' : 'Новое. '}${item.title}. ${item.body ?? ''}`}
      trailing={!item.read_at ? <Text size="caption" tone="accentText">новое</Text> : undefined}
      onPress={() => { void data?.markRead(item.id); if (item.trip_id) router.push({ pathname: '/(client)/deliveries/[id]', params: { id: item.trip_id } }); }} />} />;
}

export function useUnread() {
  const { data } = useLoad(async (repo) => (await repo.listNotifications()).filter((item) => !item.read_at).length, 'unread');
  return data ?? 0;
}
