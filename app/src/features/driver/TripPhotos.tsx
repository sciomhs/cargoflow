import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useAction, useLoad } from '@/api/useRepo';
import { Choice, FormError, FormScreen, Section } from '@/components/form';
import { dateTime } from '@/domain/format';
import { Button, EmptyState, Skeleton } from '@/ui';
import { PhotoPicker, Thumbnails } from '../media/PhotoPicker';
import { mediaUri, type Picked } from '../media/photos';

export const stageLabels = { before_load: 'Перед загрузкой', after_load: 'После загрузки', at_delivery: 'При выдаче', problem: 'Проблема' } as const;
type Stage = 'before_load' | 'after_load' | 'at_delivery';

export default function TripPhotos() {
  const params = useLocalSearchParams<{ id?: string; stage?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const asked = params.stage === 'after_load' || params.stage === 'before_load' ? params.stage : undefined;
  const { data: trip, error } = useLoad((repo) => repo.get(id), `photos:${id}`);
  const [stage, setStage] = useState<Stage | undefined>(asked);
  const [photo, setPhoto] = useState<Picked | null>(null);
  const action = useAction();
  if (error) return <View className="flex-1 bg-background px-4"><EmptyState label={error} /></View>;
  if (!trip) return <View className="flex-1 bg-background px-4"><Skeleton /></View>;
  const fallback: Stage = ['assigned', 'accepted', 'to_pickup', 'at_pickup'].includes(trip.status) ? 'before_load'
    : ['loading', 'loaded', 'in_transit'].includes(trip.status) ? 'after_load' : 'at_delivery';
  const chosen = stage ?? fallback;
  const save = async () => {
    if (!photo) return;
    const ok = await action.run({ kind: 'add_photo', trip_id: id, photo: { id: photo.id, stage: chosen, storage_path: photo.storage_path, taken_at: photo.taken_at } }, photo.id);
    if (ok) {
      setPhoto(null);
      if (asked) router.back();
    }
  };
  const canAdd = !['completed', 'cancelled', 'awaiting_confirmation', 'handed_over', 'delivered'].includes(trip.status);
  return <FormScreen footer={canAdd ? <>
    <FormError message={action.error} />
    <Button variant="driver-xl" label={action.pending ? 'Сохраняем…' : 'Прикрепить фото'} disabled={!photo || action.pending} onPress={save} />
  </> : null}>
    {canAdd && <Section title="Этап">
      <View accessibilityRole="radiogroup">
        {(['before_load', 'after_load', 'at_delivery'] as const).map((key) => <Choice key={key} label={stageLabels[key]} selected={chosen === key} onPress={() => { setStage(key); setPhoto(null); }} />)}
      </View>
      <PhotoPicker tripId={id} folder={chosen} value={photo} onChange={setPhoto} />
    </Section>}
    <Section title={`Фото рейса: ${trip.photos.length}`}>
      {trip.photos.length ? <Thumbnails uris={trip.photos.map((item) => ({ id: item.id, uri: mediaUri(item.storage_path),
        label: `${stageLabels[item.stage]}, ${dateTime(item.taken_at)}` }))} /> : <EmptyState label="Фотографий пока нет" />}
    </Section>
  </FormScreen>;
}
