import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLoad } from '@/api/useRepo';
import { Section } from '@/components/form';
import { dateTime, kilograms } from '@/domain/format';
import { Button, EmptyState, Row, Skeleton, StatusChip, Text } from '@/ui';
import { spacing } from '@/ui/tokens';
import { statusLabels } from '../trips/presentation';
import { orderStatusLabels, orderTone } from './presentation';

export default function OrderDetail() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data, error, retry } = useLoad(async (repo) => (await repo.listOrders()).find((order) => order.id === id) ?? null, `order:${id}`);
  const insets = useSafeAreaInsets();
  if (error) return <View className="flex-1 bg-background px-4"><EmptyState label={error} action={{ label: 'Повторить', onPress: retry }} /></View>;
  if (data === undefined) return <View className="flex-1 bg-background px-4"><Skeleton /></View>;
  if (data === null) return <View className="flex-1 bg-background px-4">
    <EmptyState label="Заказ не найден" action={{ label: 'К заказам', onPress: () => router.dismissTo('/(dispatcher)/(tabs)/orders') }} />
  </View>;
  const order = data;
  return <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: spacing.lg, gap: spacing.xxl, paddingBottom: insets.bottom + spacing.xl }}>
    <View style={{ gap: spacing.md }}>
      <Text mono size="title">{order.number}</Text>
      <Text size="title">{order.pickup_city} → {order.delivery_city}</Text>
      <StatusChip label={orderStatusLabels[order.status]} tone={orderTone(order)} />
    </View>
    <Section title="Рейс">
      {order.trip ? <Row label={order.trip.number} detail={statusLabels[order.trip.status]}
        onPress={() => router.push({ pathname: '/(dispatcher)/trips/[id]', params: { id: order.trip!.id } })} />
        : order.status === 'new' ? <Button label="Создать рейс" onPress={() => router.push({ pathname: '/(dispatcher)/trips/new', params: { order: order.id } })} />
        : <EmptyState label="Рейса нет" />}
    </Section>
    <Section title="Груз">
      <Row label="Клиент" detail={order.client_name} />
      <Row label={order.cargo_name} detail={`${kilograms(order.weight_kg)}${order.places ? ` · ${order.places} ${order.places_unit ?? 'мест'}` : ''}`} detailMono />
    </Section>
    <Section title="Загрузка">
      <Row label={`${order.pickup_city}, ${order.pickup_address}`} detail={dateTime(order.load_date, 'date')} />
      {order.pickup_contact_name && <Row label={order.pickup_contact_name} detail={order.pickup_contact_phone ?? undefined} detailMono />}
    </Section>
    <Section title="Доставка">
      <Row label={`${order.delivery_city}, ${order.delivery_address}`} detail={`до ${dateTime(order.desired_delivery_at)}`} />
      {order.delivery_contact_name && <Row label={order.delivery_contact_name} detail={order.delivery_contact_phone ?? undefined} detailMono />}
    </Section>
  </ScrollView>;
}
