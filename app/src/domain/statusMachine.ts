import type { Database } from './types';

export type TripStatus = Database['public']['Enums']['trip_status'];
export type Attachment = 'after_load' | 'at_delivery' | 'handover';

const NEXT_STATUS: Record<TripStatus, TripStatus | null> = {
  assigned: 'accepted', accepted: 'to_pickup', to_pickup: 'at_pickup',
  at_pickup: 'loading', loading: 'loaded', loaded: 'in_transit',
  in_transit: 'at_delivery', at_delivery: 'unloading', unloading: 'handed_over',
  handed_over: 'awaiting_confirmation', awaiting_confirmation: 'delivered',
  delivered: 'completed', completed: null, cancelled: null,
};

const DRIVER_ACTION: Partial<Record<TripStatus, string>> = {
  assigned: 'Принять рейс', accepted: 'Выехал на загрузку',
  to_pickup: 'Прибыл на загрузку', at_pickup: 'Начать загрузку',
  loading: 'Груз загружен', loaded: 'В пути', in_transit: 'Прибыл на выгрузку',
  at_delivery: 'Начать разгрузку', unloading: 'Груз передан',
};

const CANCELLABLE: readonly TripStatus[] = ['assigned', 'accepted', 'to_pickup', 'at_pickup', 'loading'];

// Checks the status graph; the repository checks the actor, reason and actual attachments.
export function canTransition(from: TripStatus, to: TripStatus) {
  const next = NEXT_STATUS[from];
  return (typeof next === 'string' && next === to) || (to === 'cancelled' && CANCELLABLE.includes(from));
}

export function requiredAttachments(to: TripStatus): readonly Attachment[] {
  if (to === 'loaded') return ['after_load'];
  if (to === 'handed_over') return ['handover', 'at_delivery'];
  return [];
}

export function nextAction(status: TripStatus): {
  to: TripStatus; label: string; requiredAttachments: readonly Attachment[];
} | null {
  const to = NEXT_STATUS[status];
  const label = DRIVER_ACTION[status];
  return to && label ? { to, label, requiredAttachments: requiredAttachments(to) } : null;
}
