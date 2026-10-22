import { router, useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAction, useLoad } from '@/api/useRepo';
import { FormError, Section } from '@/components/form';
import { dateTime, kilograms } from '@/domain/format';
import { Button, EmptyState, Row, Skeleton, StatusChip, Text, Timeline } from '@/ui';
import { spacing } from '@/ui/tokens';
import { statusPresentation, timelineSteps } from '../trips/presentation';
import { driverStep } from './presentation';
import { RouteMap } from '../map/RouteMap';

function Contact({ title, city, address, name, phone }: { title: string; city: string; address: string; name: string | null; phone: string | null }) {
  return <Section title={title}>
    <Row label={city} detail={address} />
    {name && <Row label={name} detail={phone ?? 'Телефон не указан'} detailMono />}
    {phone && <Button variant="secondary" label={`Позвонить: ${name ?? phone}`} onPress={() => void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`)} />}
  </Section>;
}

export default function DriverTrip() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data: trip, error, notFound, retry } = useLoad((repo) => repo.get(id), `driver-trip:${id}`);
  const action = useAction();
  const insets = useSafeAreaInsets();
  if (error) return <View className="flex-1 bg-background px-4"><EmptyState label={error} action={notFound
    ? { label: 'К рейсам', onPress: () => router.dismissTo('/(driver)/(tabs)/today') } : { label: 'Повторить', onPress: retry }} /></View>;
  if (!trip) return <View className="flex-1 bg-background px-4"><Skeleton /></View>;
  const step = driverStep(trip);
  const go = (path: '/(driver)/trips/[id]/photo' | '/(driver)/trips/[id]/handover', stage?: string) =>
    router.push({ pathname: path, params: stage ? { id, stage } : { id } });
  const press = () => {
    if (step.kind === 'photo') go('/(driver)/trips/[id]/photo', 'after_load');
    else if (step.kind === 'handover') go('/(driver)/trips/[id]/handover');
    else if (step.kind === 'transition') void action.run({ kind: 'transition', trip_id: id, to: step.to });
  };
  const open = !['completed', 'cancelled', 'awaiting_confirmation'].includes(trip.status);
  return <View className="flex-1 bg-background">
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xxl, paddingBottom: spacing.xl }}>
      <View style={{ gap: spacing.md }}>
        <Text mono size="display">{trip.number}</Text>
        <Text size="title">{trip.order.pickup_city} → {trip.order.delivery_city}</Text>
        <StatusChip {...statusPresentation(trip)} />
      </View>
      <RouteMap from={trip.order.pickup_city} to={trip.order.delivery_city} status={trip.status} height={180} />
      <Section title="Груз">
        <Row label={trip.order.cargo_name} detail={`${kilograms(trip.order.weight_kg)}${trip.order.places ? ` · ${trip.order.places} ${trip.order.places_unit ?? 'мест'}` : ''}`} detailMono />
        <Row label="Машина" detail={trip.vehicle ? `${trip.vehicle.make_model} · ${trip.vehicle.plate}` : 'Не указана'} detailMono />
        <Row label="Плановая доставка" detail={dateTime(trip.current_planned_delivery_at)} detailMono />
      </Section>
      <Contact title="Загрузка" city={trip.order.pickup_city} address={`${trip.order.pickup_address} · ${dateTime(trip.order.load_date, 'date')}`}
        name={trip.order.pickup_contact_name} phone={trip.order.pickup_contact_phone} />
      <Contact title="Доставка" city={trip.order.delivery_city} address={trip.order.delivery_address}
        name={trip.order.delivery_contact_name} phone={trip.order.delivery_contact_phone} />
      <Section title="Рейс">
        <Row label="Фото рейса" detail={`Добавлено: ${trip.photos.length}`} onPress={() => go('/(driver)/trips/[id]/photo')} />
        <Row label="Документы" detail={`Добавлено: ${trip.documents.length}`} onPress={() => router.push({ pathname: '/(driver)/trips/[id]/docs', params: { id } })} />
        {open && <Row label="Сообщить о проблеме" detail={trip.problems.some((p) => p.status === 'open') ? 'Есть открытая проблема' : 'Задержка, поломка, дорога, груз'}
          onPress={() => router.push({ pathname: '/(driver)/trips/[id]/problem', params: { id } })} />}
      </Section>
      <Section title="История рейса"><Timeline steps={timelineSteps(trip)} /></Section>
    </ScrollView>
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.md, gap: spacing.sm }}>
      <FormError message={action.error} />
      {step.kind === 'wait' ? <Text tone="muted" accessibilityLiveRegion="polite">{step.label}</Text>
        : <Button variant="driver-xl" label={action.pending ? 'Сохраняем…' : step.label} hint={step.hint} disabled={action.pending} onPress={press} />}
    </View>
  </View>;
}
