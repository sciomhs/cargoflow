import { useEffect, useSyncExternalStore } from 'react';
import { AppState, View } from 'react-native';
import { CloudOff } from 'lucide-react-native';

import { useRepository, useUser } from '@/api/useRepo';
import { applyCommand, type Lookup } from '@/domain/commands';
import type { TripDetail } from '@/domain/TripRepository';
import { useSettings } from '@/store/settings';
import { Button, Card, Text } from '@/ui';
import { useTheme } from '@/ui/theme';
import { icon, spacing } from '@/ui/tokens';
import { outbox, type QueuedAction } from './queue';

export function useOutboxItems() {
  return useSyncExternalStore((listener) => outbox().subscribe(listener), () => JSON.stringify(outbox().items()));
}

function parse(snapshot: string): QueuedAction[] {
  return JSON.parse(snapshot) as QueuedAction[];
}

// Tries to send queued driver actions every 15 s and whenever the app comes back to the foreground.
export function useOutboxSync() {
  const demoMode = useSettings((state) => state.demoMode);
  const getRepo = useRepository();
  useEffect(() => {
    if (demoMode) return;
    const flush = () => { if (outbox().items().length) void getRepo().then((repo) => outbox().flush((command) => repo.apply(command))).catch(() => {}); };
    flush();
    const timer = setInterval(flush, 15000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') flush(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [demoMode, getRepo]);
}

// The driver sees queued actions applied on top of the last server state, using the same rules.
export function useOptimisticTrip(trip: TripDetail | undefined) {
  const items = parse(useOutboxItems());
  const user = useUser();
  if (!trip || !user) return trip;
  let view = trip;
  for (const item of items) {
    if (!('trip_id' in item.command) || item.command.trip_id !== trip.id || item.status === 'failed') continue;
    const current = view;
    const lookup: Lookup = { order: () => current.order, vehicle: () => current.vehicle ?? undefined, profile: () => undefined,
      company: () => undefined, numberTaken: () => false, detail: () => current, usersOf: () => [] };
    try { view = applyCommand(lookup, item.command, user).trip ?? view; } catch { /* the server will decide */ }
  }
  return view;
}

export function OutboxBanner({ tripId }: { tripId?: string }) {
  const items = parse(useOutboxItems()).filter((item) => !tripId || ('trip_id' in item.command && item.command.trip_id === tripId));
  const { colors } = useTheme();
  const getRepo = useRepository();
  if (!items.length) return null;
  const waiting = items.filter((item) => item.status === 'pending').length;
  const failed = items.filter((item) => item.status === 'failed');
  return <Card>
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
      <CloudOff size={icon.size} strokeWidth={icon.strokeWidth} color={colors.waiting} />
      <Text style={{ flex: 1 }} accessibilityLiveRegion="polite">
        {waiting ? `${waiting} ${waiting === 1 ? 'действие ожидает' : 'действия ожидают'} отправки` : 'Отправка остановлена'}
      </Text>
    </View>
    {failed.map((item) => <View key={item.command.action_id} style={{ gap: spacing.sm }}>
      <Text size="small" tone="delay">Не удалось: {item.error}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}><Button variant="secondary" label="Повторить" onPress={() => {
          outbox().retry(item.command.action_id);
          void getRepo().then((repo) => outbox().flush((command) => repo.apply(command)));
        }} /></View>
        <View style={{ flex: 1 }}><Button variant="secondary" label="Удалить" onPress={() => outbox().discard(item.command.action_id)} /></View>
      </View>
    </View>)}
    {waiting > 0 && <Button variant="secondary" label="Отправить сейчас"
      onPress={() => void getRepo().then((repo) => outbox().flush((command) => repo.apply(command)))} />}
  </Card>;
}
