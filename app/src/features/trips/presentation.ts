import type { Trip, TripDetail } from '../../domain/TripRepository';
import type { TripStatus } from '../../domain/statusMachine';
import { dateTime } from '../../domain/format';

export type Segment = 'all' | 'waiting' | 'transit' | 'unloading' | 'delayed' | 'completed';
export const segments: { key: Segment; label: string; title: string }[] = [
  { key: 'all', label: 'Все', title: 'Всего' },
  { key: 'waiting', label: 'Ожидают', title: 'Ожидают загрузки' },
  { key: 'transit', label: 'В пути', title: 'В пути' },
  { key: 'unloading', label: 'Выгрузка', title: 'На выгрузке' },
  { key: 'delayed', label: 'Задержка', title: 'Задерживаются' },
  { key: 'completed', label: 'Завершены', title: 'Завершены' },
];
export const statusLabels: Record<TripStatus, string> = {
  assigned: 'Назначен', accepted: 'Принят', to_pickup: 'Едет на загрузку', at_pickup: 'На загрузке',
  loading: 'Загрузка', loaded: 'Груз загружен', in_transit: 'В пути', at_delivery: 'На выгрузке',
  unloading: 'Разгрузка', handed_over: 'Груз передан', awaiting_confirmation: 'Ожидает подтверждения',
  delivered: 'Доставка подтверждена', completed: 'Завершён', cancelled: 'Отменён',
};
function group(trip: Trip): Exclude<Segment, 'all'> | null {
  if (trip.status === 'completed') return 'completed';
  if (trip.status === 'cancelled') return null;
  if (trip.delayed) return 'delayed';
  if (['assigned', 'accepted', 'to_pickup', 'at_pickup', 'loading'].includes(trip.status)) return 'waiting';
  if (['loaded', 'in_transit'].includes(trip.status)) return 'transit';
  return 'unloading';
}
export function counts(trips: Trip[]): Record<Segment, number> {
  const result = { all: trips.length, waiting: 0, transit: 0, unloading: 0, delayed: 0, completed: 0 };
  for (const trip of trips) {
    const key = group(trip);
    if (key) result[key]++;
  }
  return result;
}
export function filterTrips(trips: Trip[], segment: Segment): Trip[] {
  return segment === 'all' ? trips : trips.filter((trip) => group(trip) === segment);
}
export function statusPresentation(trip: Trip): { label: string; tone: 'accentText' | 'delay' | 'waiting' | 'completed' } {
  const key = group(trip);
  if (key === 'delayed') return { label: 'Задерживается', tone: 'delay' };
  if (key !== 'completed' && trip.status !== 'cancelled' && trip.has_problem) return { label: 'Проблема', tone: 'delay' };
  return { label: statusLabels[trip.status], tone: key === 'completed' ? 'completed'
    : trip.status === 'cancelled' ? 'delay' : key === 'waiting' ? 'waiting' : 'accentText' };
}
export { dateTime } from '../../domain/format';
export function timelineSteps(trip: TripDetail): { id: string; label: string; time: string; state: 'done' | 'current' }[] {
  const matching = trip.events.filter((event) => event.type === 'status' && event.to_status === trip.status);
  const currentId = ['completed', 'cancelled'].includes(trip.status) ? null : matching[matching.length - 1]?.id;
  const eventLabels = { photo: 'Фотография загружена', document: 'Документ добавлен', problem: 'Сообщение о проблеме',
    problem_ack: 'Проблема принята', note: 'Комментарий', eta_changed: 'Плановая доставка изменена',
    handover: 'Груз передан', confirmation: 'Получение подтверждено' };
  return trip.events.map((event) => ({ id: event.id,
    label: event.type === 'status' ? (event.to_status ? statusLabels[event.to_status] : 'Изменение статуса') : eventLabels[event.type],
    time: dateTime(event.created_at), state: event.id === currentId ? 'current' : 'done' }));
}
