import { ACTIVE } from '../../domain/commands';
import { nextAction, type TripStatus } from '../../domain/statusMachine';
import type { Trip, TripDetail } from '../../domain/TripRepository';
import { statusLabels } from '../trips/presentation';

export function isOpen(trip: Trip) {
  return trip.status === 'assigned' || ACTIVE.includes(trip.status) || trip.status === 'handed_over' || trip.status === 'awaiting_confirmation';
}

// In-progress trips first, then assigned ones by departure.
export function driverQueue(trips: Trip[]) {
  return trips.filter(isOpen).sort((a, b) => Number(a.status === 'assigned') - Number(b.status === 'assigned')
    || a.depart_date.localeCompare(b.depart_date) || a.number.localeCompare(b.number, undefined, { numeric: true }));
}

export type DriverStep =
  | { kind: 'transition'; to: TripStatus; label: string; hint: string }
  | { kind: 'photo'; label: string; hint: string }
  | { kind: 'handover'; label: string; hint: string }
  | { kind: 'wait'; label: string };

export function driverStep(trip: TripDetail): DriverStep {
  const action = nextAction(trip.status);
  if (!action) {
    if (trip.status === 'awaiting_confirmation') return { kind: 'wait', label: 'Груз передан. Ждём подтверждения получения' };
    if (trip.status === 'completed') return { kind: 'wait', label: 'Рейс завершён' };
    if (trip.status === 'cancelled') return { kind: 'wait', label: 'Рейс отменён диспетчером' };
    return { kind: 'wait', label: statusLabels[trip.status] };
  }
  const after = nextAction(action.to);
  const hint = after ? `следующий: ${after.label.toLowerCase()}` : 'следующий: подтверждение получения';
  if (action.to === 'loaded' && !trip.photos.some((photo) => photo.stage === 'after_load')) {
    return { kind: 'photo', label: 'Сфотографировать груз', hint: 'Без фото после загрузки статус «Груз загружен» недоступен' };
  }
  if (action.to === 'handed_over') return { kind: 'handover', label: action.label, hint: 'Получатель, фото и накладная' };
  return { kind: 'transition', to: action.to, label: action.label, hint };
}
