import type { TripStatus } from '../../domain/statusMachine';
import type { Trip, TripDetail } from '../../domain/TripRepository';

// What the client is told comes next, in plain words.
const nextStage: Partial<Record<TripStatus, string>> = {
  assigned: 'Водитель примет рейс', accepted: 'Выезд на загрузку', to_pickup: 'Прибытие на загрузку',
  at_pickup: 'Загрузка', loading: 'Груз загружен', loaded: 'Начало перевозки', in_transit: 'Прибытие на выгрузку',
  at_delivery: 'Разгрузка', unloading: 'Передача груза', handed_over: 'Подтверждение получения',
  awaiting_confirmation: 'Подтвердите получение',
};

export function clientNextStage(trip: Trip) {
  return nextStage[trip.status] ?? null;
}

export function isActiveDelivery(trip: Trip) {
  return trip.status !== 'completed' && trip.status !== 'cancelled';
}

export function loadedAt(trip: TripDetail) {
  return trip.events.find((event) => event.type === 'status' && event.to_status === 'loaded')?.created_at ?? null;
}
