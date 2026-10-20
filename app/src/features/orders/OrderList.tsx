import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLoad } from '@/api/useRepo';
import { dateTime, kilograms } from '@/domain/format';
import { Button, EmptyState, Row, Skeleton, StatusChip } from '@/ui';
import { spacing } from '@/ui/tokens';
import { orderGroup, orderSegments, orderStatusLabels, orderTone, type OrderSegment } from './presentation';

export default function OrderList() {
  const { data, error, retry } = useLoad((repo) => repo.listOrders(), 'orders');
  const [segment, setSegment] = useState<OrderSegment>('new');
  const insets = useSafeAreaInsets();
  const shown = (data ?? []).filter((order) => orderGroup(order) === segment);
  return <FlatList className="flex-1 bg-background" data={shown} keyExtractor={(order) => order.id}
    initialNumToRender={15} windowSize={7}
    contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}
    ListHeaderComponent={<View style={{ gap: spacing.md, paddingVertical: spacing.lg }}>
      <Button label="Создать заказ" onPress={() => router.push('/(dispatcher)/orders/new')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={{ gap: spacing.sm }}>
        {orderSegments.map(({ key, label }) => {
          const count = (data ?? []).filter((order) => orderGroup(order) === key).length;
          return <Button key={key} label={data ? `${label} · ${count}` : label} variant={segment === key ? 'primary' : 'secondary'}
            accessibilityRole="tab" accessibilityState={{ selected: segment === key }} onPress={() => setSegment(key)} />;
        })}
      </ScrollView>
    </View>}
    ListEmptyComponent={error ? <EmptyState label={error} action={{ label: 'Повторить', onPress: retry }} />
      : data ? <EmptyState label={segment === 'new' ? 'Новых заказов нет' : 'В этом разделе заказов нет'} /> : <Skeleton />}
    renderItem={({ item }) => <Row label={`${item.pickup_city} → ${item.delivery_city}`}
      detail={`${item.number} · ${kilograms(item.weight_kg)} · загрузка ${dateTime(item.load_date, 'date')}`} detailMono
      trailing={<StatusChip label={orderStatusLabels[item.status]} tone={orderTone(item)} />}
      onPress={() => router.push({ pathname: '/(dispatcher)/orders/[id]', params: { id: item.id } })} />}
  />;
}
