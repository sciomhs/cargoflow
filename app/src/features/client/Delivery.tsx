import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAction, useLoad } from '@/api/useRepo';
import { FormError, Section } from '@/components/form';
import { dateTime, kilograms } from '@/domain/format';
import { Button, EmptyState, Row, Skeleton, StatusChip, Text, Timeline } from '@/ui';
import { spacing } from '@/ui/tokens';
import { Thumbnails } from '../media/PhotoPicker';
import { mediaUri } from '../media/photos';
import { stageLabels } from '../driver/TripPhotos';
import { statusPresentation, timelineSteps } from '../trips/presentation';
import { clientNextStage, loadedAt } from './presentation';

export default function Delivery() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data: trip, error, notFound, retry } = useLoad((repo) => repo.get(id), `delivery:${id}`);
  const action = useAction();
  const insets = useSafeAreaInsets();
  if (error) return <View className="flex-1 bg-background px-4"><EmptyState label={error} action={notFound
    ? { label: 'К доставкам', onPress: () => router.dismissTo('/(client)/(tabs)/deliveries') } : { label: 'Повторить', onPress: retry }} /></View>;
  if (!trip) return <View className="flex-1 bg-background px-4"><Skeleton /></View>;
  const loaded = loadedAt(trip);
  const next = clientNextStage(trip);
  const moved = trip.current_planned_delivery_at !== trip.planned_delivery_at;
  return <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: spacing.lg, gap: spacing.xxl, paddingBottom: insets.bottom + spacing.xl }}>
    <View style={{ gap: spacing.md }}>
      <Text mono size="title">Заказ {trip.order.number}</Text>
      <Text size="title">{trip.order.pickup_city} → {trip.order.delivery_city}</Text>
      <StatusChip {...statusPresentation(trip)} />
    </View>
    {trip.status === 'awaiting_confirmation' && <View style={{ gap: spacing.sm }}>
      <Text>Груз передан получателю {trip.handover?.receiver_name}. Проверьте и подтвердите получение.</Text>
      <FormError message={action.error} />
      <Button label={action.pending ? 'Подтверждаем…' : 'Подтвердить получение'} disabled={action.pending}
        onPress={() => void action.run({ kind: 'confirm_delivery', trip_id: id })} />
    </View>}
    <Section title="Доставка">
      {loaded && <Row label="Груз загружен" detail={dateTime(loaded)} detailMono />}
      <Row label="Плановая доставка" detail={dateTime(trip.planned_delivery_at)} detailMono />
      {moved && <Row label="Новое расчётное время" detail={`${dateTime(trip.current_planned_delivery_at)} · задержка на маршруте`} detailMono />}
      {next && <Row label="Следующий этап" detail={next} />}
      {trip.completed_at && <Row label="Доставка подтверждена" detail={dateTime(trip.completed_at)} detailMono />}
      {trip.handover && <Row label={`Получатель: ${trip.handover.receiver_name}`} detail={trip.handover.comment ?? undefined} />}
    </Section>
    <Section title="Груз">
      <Row label={trip.order.cargo_name} detail={`${kilograms(trip.order.weight_kg)}${trip.order.places ? ` · ${trip.order.places} ${trip.order.places_unit ?? 'мест'}` : ''}`} detailMono />
    </Section>
    <Section title="Этапы"><Timeline steps={timelineSteps(trip)} /></Section>
    {trip.photos.length > 0 && <Section title="Фото">
      <Thumbnails uris={trip.photos.map((photo) => ({ id: photo.id, uri: mediaUri(photo.storage_path), label: stageLabels[photo.stage] }))} />
    </Section>}
    <Section title="Документы">
      {trip.documents.length ? trip.documents.map((doc) => <Row key={doc.id} label={`${doc.title}${doc.number ? ` №${doc.number}` : ''}`} detail="Загружена" />)
        : <EmptyState label="Документы появятся после доставки" />}
    </Section>
  </ScrollView>;
}
