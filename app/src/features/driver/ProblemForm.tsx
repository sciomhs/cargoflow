import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useAction, useActionId, useLoad } from '@/api/useRepo';
import { Choice, FormError, FormScreen, Section, useDiscardGuard } from '@/components/form';
import type { Row as TableRow } from '@/domain/TripRepository';
import { Button, EmptyState, Field, Skeleton } from '@/ui';
import { PhotoPicker } from '../media/PhotoPicker';
import type { Picked } from '../media/photos';

type Category = TableRow<'trip_problems'>['category'];
export const problemCategories: { key: Category; title: string }[] = [
  { key: 'delay', title: 'Задержка' }, { key: 'breakdown', title: 'Поломка' }, { key: 'cargo', title: 'Груз' },
  { key: 'road', title: 'Дорога' }, { key: 'other', title: 'Другое' },
];

export default function ProblemForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data: trip, error } = useLoad((repo) => repo.get(id), `problem:${id}`);
  const [category, setCategory] = useState<Category>('delay');
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [delay, setDelay] = useState('');
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);
  const actionId = useActionId();
  const action = useAction();
  useDiscardGuard(!saved && (!!reason.trim() || !!comment.trim() || !!delay.trim() || !!photo));
  if (error) return <View className="flex-1 bg-background px-4"><EmptyState label={error} /></View>;
  if (!trip) return <View className="flex-1 bg-background px-4"><Skeleton /></View>;
  if (['completed', 'cancelled', 'awaiting_confirmation', 'delivered', 'handed_over'].includes(trip.status)) {
    return <View className="flex-1 bg-background px-4"><EmptyState label="Рейс уже закрыт" action={{ label: 'Назад', onPress: () => router.back() }} /></View>;
  }
  const minutes = delay.trim() ? Number(delay.trim()) : null;
  const errors = {
    reason: reason.trim() ? undefined : 'Укажите причину',
    delay: category === 'delay' && minutes === null ? 'Укажите задержку в минутах'
      : minutes !== null && (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) ? 'Целое число минут до 1440' : undefined,
  };
  const invalid = Object.values(errors).some(Boolean);
  const save = async () => {
    setTouched(true);
    if (invalid) return;
    const ok = await action.run({ kind: 'report_problem', trip_id: id, problem: { id: randomUUID(), category, reason, comment: comment.trim() || null,
      estimated_delay_min: minutes, photo_path: photo?.storage_path ?? null } }, actionId);
    if (ok) { setSaved(true); router.back(); }
  };
  return <FormScreen footer={<>
    <FormError message={action.error ?? (touched && invalid ? 'Проверьте отмеченные поля' : undefined)} />
    <Button variant="driver-xl" label={action.pending ? 'Отправляем…' : 'Отправить диспетчеру'} disabled={action.pending} onPress={save} />
  </>}>
    <Section title="Категория">
      <View accessibilityRole="radiogroup">
        {problemCategories.map((item) => <Choice key={item.key} label={item.title} selected={category === item.key} onPress={() => setCategory(item.key)} />)}
      </View>
    </Section>
    <Section title="Что случилось">
      <Field testID="problem-reason" label="Причина" value={reason} onChangeText={setReason} placeholder="Например, закрытие дороги" error={touched ? errors.reason : undefined} />
      <Field testID="problem-delay" label="Ожидаемая задержка, мин" value={delay} onChangeText={setDelay} placeholder="90" keyboardType="number-pad"
        error={touched ? errors.delay : undefined} />
      <Field testID="problem-comment" label="Комментарий" value={comment} onChangeText={setComment} placeholder="Подробности для диспетчера" multiline />
    </Section>
    <Section title="Фото">
      <PhotoPicker tripId={id} folder="problem" value={photo} onChange={setPhoto} label="Фото (необязательно)" />
    </Section>
  </FormScreen>;
}
