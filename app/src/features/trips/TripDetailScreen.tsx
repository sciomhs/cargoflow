import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useState } from 'react';
import { useAction, useLoad } from '@/api/useRepo';
import { FormError, Section } from '@/components/form';
import { canTransition } from '@/domain/statusMachine';
import type { TripDetail } from '@/domain/TripRepository';
import { Button, Field, Text, Row, StatusChip, Timeline, EmptyState, Skeleton } from '@/ui';
import { Thumbnails } from '../media/PhotoPicker';
import { mediaUri } from '../media/photos';
import { stageLabels } from '../driver/TripPhotos';
import { RouteMap } from '../map/RouteMap';
import { ExportButton } from '../report/ExportButton';
import { spacing } from '@/ui/tokens';
import { dateTime, statusPresentation, timelineSteps } from './presentation';

export default function TripDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const loaded = useLoad((repo) => repo.get(id), `trip:${id}`);
  const current = loaded.data || loaded.error ? { trip: loaded.data, error: loaded.error, notFound: loaded.notFound } : undefined;
  const insets = useSafeAreaInsets();
  const trip = current?.trip;
  const steps = trip ? timelineSteps(trip) : [];
  return <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: spacing.lg,
    paddingBottom: insets.bottom + spacing.xl, gap: spacing.xxl }}>
    {current?.error ? <EmptyState label={current.error} action={current.notFound
      ? { label: 'К списку рейсов', onPress: () => router.dismissTo('/(dispatcher)/(tabs)/trips') }
      : { label: 'Повторить', onPress: loaded.retry }} /> : !trip ? <Skeleton /> : <>
      <View style={{ gap: spacing.md }}>
        <Text mono size="title">{trip.number}</Text>
        <Text size="title">{trip.order.pickup_city} → {trip.order.delivery_city}</Text>
        <StatusChip {...statusPresentation(trip)} />
      </View>
      <RouteMap from={trip.order.pickup_city} to={trip.order.delivery_city} status={trip.status} height={200} />
      <DispatcherActions trip={trip} />
      <ExportButton trip={trip} />
      <Section title="Назначение">
        <Row label={trip.driver?.full_name ?? 'Водитель не указан'} />
        <Row label={trip.vehicle?.make_model ?? 'Машина не указана'} detail={trip.vehicle?.plate} detailMono />
        <Row label="Заказ" detail={trip.order.number} detailMono />
        <Row label="Плановая доставка" detail={dateTime(trip.planned_delivery_at)} detailMono />
        {trip.current_planned_delivery_at !== trip.planned_delivery_at &&
          <Row label="Новая плановая доставка" detail={dateTime(trip.current_planned_delivery_at)} detailMono />}
      </Section>
      <Section title="Груз и адреса">
        <Row label={trip.order.cargo_name} detail={`${new Intl.NumberFormat('ru-RU').format(trip.order.weight_kg)} кг${trip.order.places ? ` · ${trip.order.places} ${trip.order.places_unit ?? 'мест'}` : ''}`} detailMono />
        <Row label="Загрузка" detail={`${trip.order.pickup_city}, ${trip.order.pickup_address}`} />
        <Row label="Выгрузка" detail={`${trip.order.delivery_city}, ${trip.order.delivery_address}`} />
        {trip.order.pickup_contact_name && <Row label="Контакт на загрузке" detail={trip.order.pickup_contact_name} />}
        {trip.order.delivery_contact_name && <Row label="Контакт на выгрузке" detail={trip.order.delivery_contact_name} />}
      </Section>
      <Section title="История рейса">
        {steps.length ? <Timeline steps={steps} /> : <EmptyState label="Событий пока нет" />}
      </Section>
      <Section title="Фотографии">
        {trip.photos.length ? <Thumbnails uris={trip.photos.map((photo) => ({ id: photo.id, uri: mediaUri(photo.storage_path),
          label: `${stageLabels[photo.stage]}, ${dateTime(photo.taken_at)}` }))} /> : <EmptyState label="Фотографий пока нет" />}
      </Section>
      <Section title="Документы">
        {trip.documents.length ? trip.documents.map((document) => <Row key={document.id} label={`${document.title}${document.number ? ` №${document.number}` : ''}`} detail={`${dateTime(document.created_at)} · Загружена`} />)
          : <EmptyState label="Документов пока нет" />}
      </Section>
      <Section title="Проблемы">
        {trip.problems.length ? trip.problems.map((problem) => <Row key={problem.id} label={problem.reason}
          detail={`${problem.status === 'open' ? 'Открыта' : 'Принята'}${problem.estimated_delay_min ? ` · задержка ${problem.estimated_delay_min} мин` : ''}`}
          onPress={() => router.push({ pathname: '/(dispatcher)/problems/[id]', params: { id: problem.id } })} />) : <EmptyState label="Проблем нет" />}
      </Section>
      {trip.handover && <Section title="Передача груза">
        <Row label={`Получатель: ${trip.handover.receiver_name}`} detail={`${dateTime(trip.handover.handed_at)}${trip.handover.comment ? ` · ${trip.handover.comment}` : ''}`} />
        {trip.handover.confirmed_at && <Row label="Получение подтверждено" detail={dateTime(trip.handover.confirmed_at)} detailMono />}
      </Section>}
    </>}
  </ScrollView>;
}

function DispatcherActions({ trip }: { trip: TripDetail }) {
  const action = useAction();
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  if (trip.status === 'awaiting_confirmation') return <View style={{ gap: spacing.sm }}>
    <Text>Груз передан: {trip.handover?.receiver_name}. Клиент ещё не подтвердил получение.</Text>
    <FormError message={action.error} />
    <Button label={action.pending ? 'Подтверждаем…' : 'Подтвердить доставку'} disabled={action.pending}
      onPress={() => void action.run({ kind: 'confirm_delivery', trip_id: trip.id })} />
  </View>;
  if (!canTransition(trip.status, 'cancelled')) return null;
  if (!cancelling) return <Button variant="secondary" label="Отменить рейс" onPress={() => setCancelling(true)} />;
  return <View style={{ gap: spacing.sm }}>
    <Field label="Причина отмены" value={reason} onChangeText={setReason} placeholder="Видна только диспетчерам" />
    <FormError message={action.error} />
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <View style={{ flex: 1 }}><Button variant="secondary" label="Не отменять" onPress={() => setCancelling(false)} /></View>
      <View style={{ flex: 1 }}><Button variant="destructive" label="Отменить рейс" disabled={action.pending || !reason.trim()}
        onPress={() => void action.run({ kind: 'cancel_trip', trip_id: trip.id, reason })} /></View>
    </View>
  </View>;
}
