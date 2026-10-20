import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';

import { useAction, useActionId, useLoad } from '@/api/useRepo';
import { Choice, FormError, FormScreen, Section, useDiscardGuard } from '@/components/form';
import { demoDate } from '@/demo/data';
import { almatyMoment, parseDay, parseTime } from '@/domain/format';
import { Button, Field, Skeleton } from '@/ui';
import { spacing } from '@/ui/tokens';

const empty = { cargo: '', weight: '', places: '', pickupCity: '', pickupAddress: '', pickupName: '', pickupPhone: '',
  deliveryCity: '', deliveryAddress: '', deliveryName: '', deliveryPhone: '', loadDay: '', deliveryDay: '', deliveryTime: '' };
type Values = typeof empty;
const year = Number(demoDate.slice(0, 4));

export function validateOrder(values: Values) {
  const errors: Partial<Record<keyof Values, string>> = {};
  const required: (keyof Values)[] = ['cargo', 'weight', 'pickupCity', 'pickupAddress', 'deliveryCity', 'deliveryAddress', 'loadDay', 'deliveryDay', 'deliveryTime'];
  for (const key of required) if (!values[key].trim()) errors[key] = 'Обязательное поле';
  const weight = Number(values.weight.replace(/\s/g, ''));
  if (values.weight.trim() && (!Number.isInteger(weight) || weight <= 0 || weight > 100000)) errors.weight = 'Целое число от 1 до 100 000';
  const places = values.places.trim() ? Number(values.places) : null;
  if (places !== null && (!Number.isInteger(places) || places <= 0)) errors.places = 'Целое число';
  const loadDay = parseDay(values.loadDay, year);
  const deliveryDay = parseDay(values.deliveryDay, year);
  const deliveryTime = parseTime(values.deliveryTime);
  if (values.loadDay.trim() && !loadDay) errors.loadDay = 'Формат 21.10.2026';
  if (values.deliveryDay.trim() && !deliveryDay) errors.deliveryDay = 'Формат 22.10.2026';
  if (values.deliveryTime.trim() && !deliveryTime) errors.deliveryTime = 'Формат 15:00';
  if (loadDay && deliveryDay && deliveryDay < loadDay) errors.deliveryDay = 'Не раньше даты загрузки';
  return { errors, weight, places, loadDay, desired: deliveryDay && deliveryTime ? almatyMoment(deliveryDay, deliveryTime) : null };
}

export default function OrderForm() {
  const options = useLoad(async (repo) => ({ ...(await repo.assignmentOptions()), number: await repo.nextNumber('order') }), 'order-form');
  const [values, setValues] = useState(empty);
  const [client, setClient] = useState<string>();
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);
  const actionId = useActionId();
  const [orderId] = useState(actionId);
  const action = useAction();
  const dirty = !saved && Object.values(values).some((value) => value.trim());
  useDiscardGuard(dirty);
  const clients = options.data?.clients ?? [];
  const clientId = client ?? (clients.length === 1 ? clients[0].id : undefined);
  const check = validateOrder(values);
  const shown = touched ? check.errors : {};
  const inputs = useRef<Partial<Record<keyof Values, TextInput | null>>>({});
  const order = Object.keys(empty) as (keyof Values)[];
  const field = (key: keyof Values, label: string, extra: object = {}) => {
    const next = order[order.indexOf(key) + 1];
    return <Field testID={`order-${key}`} label={label} value={values[key]} error={shown[key]}
      ref={(input: TextInput | null) => { inputs.current[key] = input; }}
      returnKeyType={next ? 'next' : 'done'} submitBehavior={next ? 'submit' : 'blurAndSubmit'}
      onSubmitEditing={() => next && inputs.current[next]?.focus()}
      onChangeText={(text) => setValues((current) => ({ ...current, [key]: text }))} {...extra} />;
  };

  const save = async () => {
    setTouched(true);
    if (Object.keys(check.errors).length || !clientId || !options.data || !check.loadDay || !check.desired) return;
    const ok = await action.run({ kind: 'create_order', order: { id: orderId, number: options.data.number, client_company_id: clientId,
      cargo_name: values.cargo, weight_kg: check.weight, places: check.places, places_unit: 'паллет',
      pickup_city: values.pickupCity, pickup_address: values.pickupAddress, pickup_contact_name: values.pickupName || null,
      pickup_contact_phone: values.pickupPhone || null, delivery_city: values.deliveryCity, delivery_address: values.deliveryAddress,
      delivery_contact_name: values.deliveryName || null, delivery_contact_phone: values.deliveryPhone || null,
      load_date: check.loadDay, desired_delivery_at: check.desired } }, actionId);
    if (ok) {
      setSaved(true);
      router.replace({ pathname: '/(dispatcher)/orders/[id]', params: { id: orderId } });
    }
  };

  if (!options.data) return <View className="flex-1 bg-background px-4">
    {options.error ? <FormError message={options.error} /> : <Skeleton />}
  </View>;
  return <FormScreen footer={<>
    <FormError message={action.error ?? (touched && Object.keys(check.errors).length ? 'Проверьте отмеченные поля' : undefined)} />
    <Button label={action.pending ? 'Сохраняем…' : `Сохранить заказ ${options.data.number}`} disabled={action.pending} onPress={save} />
  </>}>
    <Section title="Клиент">
      <View accessibilityRole="radiogroup">
        {clients.map((company) => <Choice key={company.id} label={company.name} selected={clientId === company.id} onPress={() => setClient(company.id)} />)}
      </View>
    </Section>
    <Section title="Груз">
      {field('cargo', 'Груз', { placeholder: 'Например, керамическая плитка' })}
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>{field('weight', 'Вес, кг', { keyboardType: 'number-pad', placeholder: '8500' })}</View>
        <View style={{ flex: 1 }}>{field('places', 'Паллет', { keyboardType: 'number-pad', placeholder: '12' })}</View>
      </View>
    </Section>
    <Section title="Загрузка">
      {field('pickupCity', 'Город', { placeholder: 'Павлодар', autoCapitalize: 'words' })}
      {field('pickupAddress', 'Адрес', { placeholder: 'ул. Промышленная, 18' })}
      {field('pickupName', 'Контакт', { placeholder: 'Имя', autoComplete: 'name', autoCapitalize: 'words' })}
      {field('pickupPhone', 'Телефон контакта', { keyboardType: 'phone-pad', autoComplete: 'tel' })}
      {field('loadDay', 'Дата загрузки', { placeholder: '21.10.2026', keyboardType: 'numbers-and-punctuation' })}
    </Section>
    <Section title="Доставка">
      {field('deliveryCity', 'Город', { placeholder: 'Астана', autoCapitalize: 'words' })}
      {field('deliveryAddress', 'Адрес', { placeholder: 'ул. Индустриальная, 42' })}
      {field('deliveryName', 'Контакт', { placeholder: 'Имя', autoComplete: 'name', autoCapitalize: 'words' })}
      {field('deliveryPhone', 'Телефон контакта', { keyboardType: 'phone-pad', autoComplete: 'tel' })}
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 3 }}>{field('deliveryDay', 'Доставить до, дата', { placeholder: '22.10.2026', keyboardType: 'numbers-and-punctuation' })}</View>
        <View style={{ flex: 2 }}>{field('deliveryTime', 'Время', { placeholder: '15:00', keyboardType: 'numbers-and-punctuation' })}</View>
      </View>
    </Section>
  </FormScreen>;
}
