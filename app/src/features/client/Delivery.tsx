import { router, useLocalSearchParams } from 'expo-router';
import { Camera, FileText, Package, PenLine } from 'lucide-react-native';
import { useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAction, useLoad } from '@/api/useRepo';
import { FormError } from '@/components/form';
import { dateTime, kilograms } from '@/domain/format';
import { ActionRow, Button, Card, EmptyState, IconTile, Row, Skeleton, StatusChip, Text, Timeline } from '@/ui';
import { cardRadius, spacing } from '@/ui/tokens';
import { mediaUri } from '../media/photos';
import { stageLabels } from '../driver/TripPhotos';
import { RouteMap } from '../map/RouteMap';
import { ExportButton } from '../report/ExportButton';
import { statusPresentation, timelineSteps } from '../trips/presentation';
import { clientNextStage, loadedAt } from './presentation';

export default function Delivery() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data: trip, error, notFound, retry } = useLoad((repo) => repo.get(id), `delivery:${id}`);
  const [open, setOpen] = useState<'photos' | 'docs' | 'receiver' | null>(null);
  const action = useAction();
  const insets = useSafeAreaInsets();
  if (error) return <View className="flex-1 bg-background px-4"><EmptyState label={error} action={notFound
    ? { label: 'К доставкам', onPress: () => router.dismissTo('/(client)/(tabs)/deliveries') } : { label: 'Повторить', onPress: retry }} /></View>;
  if (!trip) return <View className="flex-1 bg-background px-4"><Skeleton /></View>;
  const loaded = loadedAt(trip);
  const next = clientNextStage(trip);
  const moved = trip.current_planned_delivery_at !== trip.planned_delivery_at;
  const photos = trip.photos.map((photo) => ({ ...photo, uri: mediaUri(photo.storage_path) }));
  const toggle = (key: typeof open) => setOpen(open === key ? null : key);
  return <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <IconTile Icon={Package} size={48} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text size="title" medium>Заказ №{trip.order.number}</Text>
          <Text size="small" tone="muted">{trip.order.cargo_name} · {kilograms(trip.order.weight_kg)}</Text>
        </View>
        <StatusChip {...statusPresentation(trip)} />
      </View>
    </Card>
    <Card>
      <Text size="title">{trip.order.pickup_city}  →  {trip.order.delivery_city}</Text>
      <Text tone="muted">{moved ? `Новое расчётное время: ${dateTime(trip.current_planned_delivery_at)} · задержка на маршруте`
        : `Плановая доставка: ${dateTime(trip.planned_delivery_at)}`}</Text>
      {loaded && <Text size="small" tone="muted">Груз загружен: {dateTime(loaded)}</Text>}
      {next && <Text size="small" tone="accentText" medium>Следующий этап: {next}</Text>}
      {trip.completed_at && <Text size="small" tone="completed" medium>Доставка подтверждена: {dateTime(trip.completed_at)}</Text>}
    </Card>
    {photos.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
      {photos.map((photo) => photo.uri
        ? <Image key={photo.id} source={{ uri: photo.uri }} accessibilityLabel={stageLabels[photo.stage]} style={{ width: 112, height: 84, borderRadius: cardRadius }} />
        : null)}
    </ScrollView>}
    {trip.status === 'awaiting_confirmation' && <Card>
      <Text>Груз передан получателю {trip.handover?.receiver_name}. Проверьте и подтвердите получение.</Text>
      <FormError message={action.error} />
      <Button label={action.pending ? 'Подтверждаем…' : 'Подтвердить получение'} disabled={action.pending}
        onPress={() => void action.run({ kind: 'confirm_delivery', trip_id: id })} />
    </Card>}
    <View style={{ gap: spacing.sm }}>
      <ActionRow Icon={Camera} label="Фото при доставке" detail={`Фото: ${trip.photos.length}`} expanded={open === 'photos'} onPress={() => toggle('photos')} />
      {open === 'photos' && (trip.photos.length ? trip.photos.map((photo) => <Row key={photo.id} label={stageLabels[photo.stage]} detail={dateTime(photo.taken_at)} detailMono />)
        : <EmptyState label="Фото появятся по ходу рейса" />)}
      <ActionRow Icon={FileText} label="Документы" detail={`Документов: ${trip.documents.length}`} expanded={open === 'docs'} onPress={() => toggle('docs')} />
      {open === 'docs' && (trip.documents.length ? trip.documents.map((doc) => <Row key={doc.id} label={`${doc.title}${doc.number ? ` №${doc.number}` : ''}`} detail="Загружена" />)
        : <EmptyState label="Документы появятся после доставки" />)}
      <ActionRow Icon={PenLine} label="Подпись получателя" detail={trip.handover ? trip.handover.receiver_name : 'После передачи груза'}
        expanded={open === 'receiver'} onPress={() => toggle('receiver')} />
      {open === 'receiver' && (trip.handover ? <Row label={trip.handover.receiver_name} detail={[dateTime(trip.handover.handed_at), trip.handover.comment].filter(Boolean).join(' · ')} />
        : <EmptyState label="Получатель ещё не указан" />)}
    </View>
    <Card>
      <Text size="title" accessibilityRole="header">Маршрут</Text>
      <RouteMap from={trip.order.pickup_city} to={trip.order.delivery_city} status={trip.status} />
      <Timeline steps={timelineSteps(trip)} />
    </Card>
    <ExportButton trip={trip} />
  </ScrollView>;
}
