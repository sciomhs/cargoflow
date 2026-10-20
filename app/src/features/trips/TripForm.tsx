import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useAction, useActionId, useLoad } from '@/api/useRepo';
import { Choice, FormError, FormScreen, Section, useDiscardGuard } from '@/components/form';
import { almatyMoment, dateTime, dayInput, kilograms, parseDay, parseTime } from '@/domain/format';
import { Button, EmptyState, Field, Row, Skeleton } from '@/ui';
import { spacing } from '@/ui/tokens';

export default function TripForm() {
  const params = useLocalSearchParams<{ order?: string }>();
  const orderId = typeof params.order === 'string' ? params.order : '';
  const options = useLoad(async (repo) => ({ ...(await repo.assignmentOptions()), number: await repo.nextNumber('trip'),
    order: (await repo.listOrders()).find((order) => order.id === orderId) ?? null }), `trip-form:${orderId}`);
  const [driver, setDriver] = useState<string>();
  const [vehicle, setVehicle] = useState<string>();
  const [departDay, setDepartDay] = useState<string>();
  const [deliveryDay, setDeliveryDay] = useState<string>();
  const [deliveryTime, setDeliveryTime] = useState('');
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);
  const actionId = useActionId();
  const action = useAction();
  useDiscardGuard(!saved && (!!driver || !!vehicle || !!deliveryTime));
  const order = options.data?.order;
  if (!options.data) return <View className="flex-1 bg-background px-4">{options.error ? <FormError message={options.error} /> : <Skeleton />}</View>;
  if (!order || order.status !== 'new') return <View className="flex-1 bg-background px-4">
    <EmptyState label={order ? 'По заказу уже создан рейс' : 'Заказ не найден'} action={{ label: 'Назад', onPress: () => router.back() }} />
  </View>;
  const year = Number(order.load_date.slice(0, 4));
  const depart = departDay ?? dayInput(order.load_date);
  const delivery = deliveryDay ?? dayInput(order.desired_delivery_at.slice(0, 10));
  const parsedDepart = parseDay(depart, year);
  const parsedDelivery = parseDay(delivery, year);
  const parsedTime = parseTime(deliveryTime);
  const errors = {
    driver: driver ? undefined : 'Выберите водителя', vehicle: vehicle ? undefined : 'Выберите машину',
    depart: parsedDepart ? undefined : 'Формат 21.10.2026',
    delivery: !parsedDelivery ? 'Формат 22.10.2026' : parsedDepart && parsedDelivery < parsedDepart ? 'Не раньше выезда' : undefined,
    time: parsedTime ? undefined : 'Формат 13:00',
  };
  const invalid = Object.values(errors).some(Boolean);
  const save = async () => {
    setTouched(true);
    if (invalid || !driver || !vehicle || !parsedDepart || !parsedDelivery || !parsedTime) return;
    const ok = await action.run({ kind: 'create_trip', trip: { id: actionId, number: options.data!.number, order_id: order.id,
      driver_id: driver, vehicle_id: vehicle, depart_date: parsedDepart, planned_delivery_at: almatyMoment(parsedDelivery, parsedTime) } }, actionId);
    if (ok) {
      setSaved(true);
      router.replace({ pathname: '/(dispatcher)/trips/[id]', params: { id: actionId } });
    }
  };
  return <FormScreen footer={<>
    <FormError message={action.error ?? (touched && invalid ? 'Проверьте отмеченные поля' : undefined)} />
    <Button label={action.pending ? 'Назначаем…' : `Назначить рейс ${options.data.number}`} disabled={action.pending} onPress={save} />
  </>}>
    <Section title="Заказ">
      <Row label={`${order.number} · ${order.pickup_city} → ${order.delivery_city}`} detail={`${order.cargo_name} · ${kilograms(order.weight_kg)} · до ${dateTime(order.desired_delivery_at)}`} />
    </Section>
    <Section title="Водитель">
      <View accessibilityRole="radiogroup">
        {options.data.drivers.map((item) => <Choice key={item.id} label={item.full_name} detail={`Активных рейсов: ${item.active_trips}`}
          selected={driver === item.id} onPress={() => setDriver(item.id)} />)}
      </View>
      <FormError message={touched ? errors.driver : undefined} />
    </Section>
    <Section title="Машина">
      <View accessibilityRole="radiogroup">
        {options.data.vehicles.map((item) => <Choice key={item.id} label={`${item.make_model} · ${item.plate}`}
          detail={item.status === 'free' ? `Свободна · ${kilograms(item.capacity_kg ?? 0)}` : item.status === 'on_trip' ? 'В рейсе' : 'На обслуживании'}
          disabled={item.status !== 'free'} selected={vehicle === item.id} onPress={() => setVehicle(item.id)} />)}
      </View>
      <FormError message={touched ? errors.vehicle : undefined} />
    </Section>
    <Section title="Сроки">
      <Field label="Дата выезда" value={depart} onChangeText={setDepartDay} keyboardType="numbers-and-punctuation" error={touched ? errors.depart : undefined} />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 3 }}><Field label="Плановая доставка" value={delivery} onChangeText={setDeliveryDay}
          keyboardType="numbers-and-punctuation" error={touched ? errors.delivery : undefined} /></View>
        <View style={{ flex: 2 }}><Field testID="trip-time" label="Время" value={deliveryTime} onChangeText={setDeliveryTime} placeholder="13:00"
          keyboardType="numbers-and-punctuation" error={touched ? errors.time : undefined} /></View>
      </View>
    </Section>
  </FormScreen>;
}
