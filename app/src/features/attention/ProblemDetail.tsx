import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAction, useActionId, useLoad } from '@/api/useRepo';
import { FormError, Section } from '@/components/form';
import { dateTime } from '@/domain/format';
import { Button, EmptyState, Row, Skeleton, StatusChip, Text } from '@/ui';
import { spacing } from '@/ui/tokens';
import { Thumbnails } from '../media/PhotoPicker';
import { mediaUri } from '../media/photos';
import { problemCategories } from '../driver/ProblemForm';
import { shiftedEta } from './eta';

export default function ProblemDetail() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data, error, retry } = useLoad(async (repo) => (await repo.listProblems()).find((problem) => problem.id === id) ?? null, `problem-detail:${id}`);
  const actionId = useActionId();
  const action = useAction();
  const insets = useSafeAreaInsets();
  if (error) return <View className="flex-1 bg-background px-4"><EmptyState label={error} action={{ label: 'Повторить', onPress: retry }} /></View>;
  if (data === undefined) return <View className="flex-1 bg-background px-4"><Skeleton /></View>;
  if (data === null) return <View className="flex-1 bg-background px-4"><EmptyState label="Проблема не найдена" action={{ label: 'Назад', onPress: () => router.back() }} /></View>;
  const problem = data;
  const eta = problem.estimated_delay_min ? shiftedEta(problem.trip.current_planned_delivery_at, problem.estimated_delay_min) : null;
  const acknowledge = (planned: string | null) => void action.run({ kind: 'acknowledge_problem', trip_id: problem.trip_id, problem_id: problem.id, planned_delivery_at: planned }, actionId);
  return <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: spacing.lg, gap: spacing.xxl, paddingBottom: insets.bottom + spacing.xl }}>
    <View style={{ gap: spacing.md }}>
      <Text size="title">{problemCategories.find((item) => item.key === problem.category)?.title}: {problem.reason}</Text>
      <StatusChip label={problem.status === 'open' ? 'Открыта' : 'Принята'} tone={problem.status === 'open' ? 'delay' : 'completed'} />
    </View>
    <Section title="Подробности">
      <Row label={`Рейс ${problem.trip.number}`} detail={`${problem.trip.order.pickup_city} → ${problem.trip.order.delivery_city}`}
        onPress={() => router.push({ pathname: '/(dispatcher)/trips/[id]', params: { id: problem.trip_id } })} />
      <Row label="Сообщено" detail={dateTime(problem.created_at)} detailMono />
      {problem.estimated_delay_min !== null && <Row label="Ожидаемая задержка" detail={`${problem.estimated_delay_min} мин`} detailMono />}
      {problem.comment && <Row label="Комментарий водителя" detail={problem.comment} />}
      <Row label="Плановая доставка" detail={dateTime(problem.trip.current_planned_delivery_at)} detailMono />
      {problem.photo_path && <Thumbnails uris={[{ id: problem.id, uri: mediaUri(problem.photo_path), label: 'Фото проблемы' }]} />}
    </Section>
    {problem.status === 'open' && <View style={{ gap: spacing.md }}>
      <FormError message={action.error} />
      {eta && <Button label={`Принять и сдвинуть доставку на ${dateTime(eta)}`} disabled={action.pending} onPress={() => acknowledge(eta)} />}
      <Button variant="secondary" label="Принять без изменения срока" disabled={action.pending} onPress={() => acknowledge(null)} />
      <Text size="small" tone="muted">Клиент получит новое время с причиной «задержка на маршруте», без подробностей.</Text>
    </View>}
  </ScrollView>;
}
