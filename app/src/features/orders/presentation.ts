import type { OrderWithTrip } from '../../domain/TripRepository';

export type OrderSegment = 'new' | 'in_trip' | 'done';
export const orderSegments: { key: OrderSegment; label: string }[] = [
  { key: 'new', label: 'Новые' }, { key: 'in_trip', label: 'В рейсе' }, { key: 'done', label: 'Завершены' },
];
export const orderStatusLabels = { new: 'Новый', in_trip: 'В рейсе', done: 'Выполнен', cancelled: 'Отменён' } as const;

export function orderGroup(order: OrderWithTrip): OrderSegment | null {
  return order.status === 'cancelled' ? null : order.status;
}

export function orderTone(order: OrderWithTrip) {
  return order.status === 'new' ? 'waiting' as const : order.status === 'done' ? 'completed' as const : 'accentText' as const;
}
