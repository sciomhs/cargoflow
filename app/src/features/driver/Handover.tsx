import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useAction, useActionId, useLoad } from '@/api/useRepo';
import { FormError, FormScreen, Section, useDiscardGuard } from '@/components/form';
import { Button, EmptyState, Field, Skeleton } from '@/ui';
import { PhotoPicker } from '../media/PhotoPicker';
import type { Picked } from '../media/photos';

export default function Handover() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data: trip, error } = useLoad((repo) => repo.get(id), `handover:${id}`);
  const [receiver, setReceiver] = useState('');
  const [comment, setComment] = useState('');
  const [waybill, setWaybill] = useState('');
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [document, setDocument] = useState<Picked | null>(null);
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);
  const actionId = useActionId();
  const action = useAction();
  useDiscardGuard(!saved && (!!receiver.trim() || !!comment.trim() || !!photo || !!document || !!waybill.trim()));
  if (error) return <View className="flex-1 bg-background px-4"><EmptyState label={error} /></View>;
  if (!trip) return <View className="flex-1 bg-background px-4"><Skeleton /></View>;
  if (trip.status !== 'unloading') return <View className="flex-1 bg-background px-4">
    <EmptyState label={trip.handover ? 'Груз уже передан' : 'Передача доступна после начала разгрузки'} action={{ label: 'Назад', onPress: () => router.back() }} />
  </View>;
  const errors = {
    receiver: receiver.trim() ? undefined : 'Укажите получателя',
    photo: photo ? undefined : 'Сфотографируйте груз при выдаче',
    document: waybill.trim() && !document ? 'Сфотографируйте накладную' : document && !waybill.trim() ? 'Укажите номер накладной' : undefined,
  };
  const invalid = Object.values(errors).some(Boolean);
  const save = async () => {
    setTouched(true);
    if (invalid || !photo) return;
    const ok = await action.run({ kind: 'hand_over', trip_id: id, handover: { id: randomUUID(), receiver_name: receiver, comment: comment.trim() || null,
      photo: { id: photo.id, storage_path: photo.storage_path, taken_at: photo.taken_at },
      document: document ? { id: document.id, type: 'waybill', title: 'Накладная', number: waybill.trim(), storage_path: document.storage_path } : null } }, actionId);
    if (ok) { setSaved(true); router.back(); }
  };
  return <FormScreen footer={<>
    <FormError message={action.error ?? (touched && invalid ? 'Проверьте отмеченные поля' : undefined)} />
    <Button variant="driver-xl" label={action.pending ? 'Сохраняем…' : 'Груз передан'} hint="после этого клиент подтвердит получение" disabled={action.pending} onPress={save} />
  </>}>
    <Section title="Получатель">
      <Field testID="handover-receiver" label="Имя получателя" value={receiver} onChangeText={setReceiver} placeholder="Фамилия и имя"
        autoCapitalize="words" autoComplete="name" error={touched ? errors.receiver : undefined} />
      <Field testID="handover-comment" label="Комментарий" value={comment} onChangeText={setComment} placeholder="Например, повреждений не выявлено" multiline />
    </Section>
    <Section title="Фото груза при выдаче">
      <PhotoPicker tripId={id} folder="at_delivery" value={photo} onChange={setPhoto} />
      <FormError message={touched ? errors.photo : undefined} />
    </Section>
    <Section title="Накладная">
      <Field testID="handover-waybill" label="Номер накладной" value={waybill} onChangeText={setWaybill} placeholder="457" keyboardType="numbers-and-punctuation" />
      <PhotoPicker tripId={id} folder="documents" value={document} onChange={setDocument} label="Фото накладной" />
      <FormError message={touched ? errors.document : undefined} />
    </Section>
  </FormScreen>;
}
