import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tripRepository } from '@/api/repository';
import type { TripDetail } from '@/domain/TripRepository';
import { RepositoryError } from '@/domain/TripRepository';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { Text, Row, StatusChip, Timeline, EmptyState, Skeleton } from '@/ui';
import { spacing } from '@/ui/tokens';
import { dateTime, statusPresentation, timelineSteps } from './presentation';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={{ gap: spacing.md }}>
    <Text size="title" accessibilityRole="header">{title}</Text>
    {children}
  </View>;
}

export default function TripDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const role = useSession((state) => state.role);
  const demoMode = useSettings((state) => state.demoMode);
  const preview = useSettings((state) => state.demoPreview);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; trip?: TripDetail; error?: string; notFound?: boolean }>();
  const key = `${role}:${demoMode}:${preview}:${id}:${retry}`;
  const current = result?.key === key ? result : undefined;
  const insets = useSafeAreaInsets();
  useEffect(() => {
    let active = true;
    if (role) tripRepository(demoMode, role, preview).then((repo) => repo.get(id))
      .then((trip) => { if (active) setResult({ key, trip }); })
      .catch((error: Error) => { if (active) setResult({ key, error: error.message,
        notFound: error instanceof RepositoryError && error.code === 'not_found' }); });
    return () => { active = false; };
  }, [role, demoMode, preview, id, key]);
  const trip = current?.trip;
  const steps = trip ? timelineSteps(trip) : [];
  return <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: spacing.lg,
    paddingBottom: insets.bottom + spacing.xl, gap: spacing.xxl }}>
    {current?.error ? <EmptyState label={current.error} action={current.notFound
      ? { label: 'К списку рейсов', onPress: () => router.dismissTo('/(dispatcher)/(tabs)/trips') }
      : { label: 'Повторить', onPress: () => setRetry(retry + 1) }} /> : !trip ? <Skeleton /> : <>
      <View style={{ gap: spacing.md }}>
        <Text mono size="title">{trip.number}</Text>
        <Text size="title">{trip.order.pickup_city} → {trip.order.delivery_city}</Text>
        <StatusChip {...statusPresentation(trip)} />
      </View>
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
        {trip.photos.length ? trip.photos.map((photo) => <Row key={photo.id} label="Фотография" detail={dateTime(photo.taken_at)} detailMono />)
          : <EmptyState label="Фотографий пока нет" />}
      </Section>
      <Section title="Документы">
        {trip.documents.length ? trip.documents.map((document) => <Row key={document.id} label={document.title} detail={document.number ?? undefined} detailMono />)
          : <EmptyState label="Документов пока нет" />}
      </Section>
      <Section title="Проблемы">
        {trip.problems.length ? trip.problems.map((problem) => <View key={problem.id} style={{ gap: spacing.sm }}>
          <Text>{problem.reason}</Text>
          {problem.comment && <Text size="small" tone="muted">{problem.comment}</Text>}
          {problem.estimated_delay_min !== null && <Text mono size="small">Задержка: {problem.estimated_delay_min} мин</Text>}
        </View>) : <EmptyState label="Проблем нет" />}
      </Section>
      {trip.handover && <Section title="Передача груза"><Row label={trip.handover.receiver_name} detail={dateTime(trip.handover.handed_at)} detailMono /></Section>}
    </>}
  </ScrollView>;
}
