import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useAction, useLoad } from '@/api/useRepo';
import { Choice, FormError, FormScreen, Section, useDiscardGuard } from '@/components/form';
import { dateTime } from '@/domain/format';
import type { Row as TableRow } from '@/domain/TripRepository';
import { Button, EmptyState, Field, Row, Skeleton } from '@/ui';
import { PhotoPicker, Thumbnails } from '../media/PhotoPicker';
import { mediaUri, type Picked } from '../media/photos';

type DocumentType = TableRow<'trip_documents'>['type'];
export const documentTypes: { key: DocumentType; title: string }[] = [
  { key: 'waybill', title: 'Накладная' }, { key: 'act', title: 'Акт приёма-передачи' },
  { key: 'power_of_attorney', title: 'Доверенность' }, { key: 'signed_receipt', title: 'Документ с подписью получателя' }, { key: 'other', title: 'Другой документ' },
];

export default function TripDocuments() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data: trip, error } = useLoad((repo) => repo.get(id), `docs:${id}`);
  const [type, setType] = useState<DocumentType>('waybill');
  const [number, setNumber] = useState('');
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [touched, setTouched] = useState(false);
  const action = useAction();
  useDiscardGuard(!!photo || !!number.trim());
  if (error) return <View className="flex-1 bg-background px-4"><EmptyState label={error} /></View>;
  if (!trip) return <View className="flex-1 bg-background px-4"><Skeleton /></View>;
  const canAdd = trip.status !== 'cancelled';
  const save = async () => {
    setTouched(true);
    if (!photo) return;
    const title = documentTypes.find((item) => item.key === type)!.title;
    const ok = await action.run({ kind: 'add_document', trip_id: id, document: { id: photo.id, type, title, number: number.trim() || null, storage_path: photo.storage_path } }, photo.id);
    if (ok) { setPhoto(null); setNumber(''); setTouched(false); }
  };
  return <FormScreen footer={canAdd ? <>
    <FormError message={action.error ?? (touched && !photo ? 'Сфотографируйте документ' : undefined)} />
    <Button variant="driver-xl" label={action.pending ? 'Сохраняем…' : 'Добавить документ'} disabled={action.pending} onPress={save} />
  </> : null}>
    <Section title={`Документы рейса: ${trip.documents.length}`}>
      {trip.documents.length ? trip.documents.map((doc) => <Row key={doc.id} label={`${doc.title}${doc.number ? ` №${doc.number}` : ''}`}
        detail={`${dateTime(doc.created_at)} · Загружена`} />) : <EmptyState label="Документов пока нет" />}
      {trip.documents.length > 0 && <Thumbnails uris={trip.documents.map((doc) => ({ id: doc.id, uri: mediaUri(doc.storage_path), label: doc.title }))} />}
    </Section>
    {canAdd && <Section title="Новый документ">
      <View accessibilityRole="radiogroup">
        {documentTypes.map((item) => <Choice key={item.key} label={item.title} selected={type === item.key} onPress={() => setType(item.key)} />)}
      </View>
      <Field testID="doc-number" label="Номер документа" value={number} onChangeText={setNumber} placeholder="457" keyboardType="numbers-and-punctuation" />
      <PhotoPicker tripId={id} folder="documents" value={photo} onChange={setPhoto} label="Фото документа" />
    </Section>}
  </FormScreen>;
}
