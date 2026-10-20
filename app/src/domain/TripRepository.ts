import type { Database } from './types';

export type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Trip = Row<'trips'> & { order: Row<'orders'> };
export type TripDetail = Trip & {
  events: Row<'trip_events'>[];
  driver: Pick<Row<'profiles'>, 'full_name' | 'phone'> | null;
  vehicle: Row<'vehicles'> | null;
  photos: Row<'trip_photos'>[];
  documents: Row<'trip_documents'>[];
  problems: Row<'trip_problems'>[];
  handover: Row<'handovers'> | null;
};
export type TripFilter = { date?: string };

export interface TripRepository {
  listForDispatcher(filter?: TripFilter): Promise<Trip[]>;
  listForDriver(driverId: string): Promise<Trip[]>;
  get(id: string): Promise<TripDetail>;
}

export class RepositoryError extends Error {
  constructor(public code: 'not_found' | 'unavailable') {
    super(code === 'not_found' ? 'Рейс не найден' : 'Не удалось загрузить данные. Проверьте соединение.');
  }
}

export function checkFilter(filter?: TripFilter) {
  if (!filter?.date) return;
  const time = Date.parse(filter.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(filter.date) || !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== filter.date) throw new Error('Некорректная дата');
}

export function checkId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new RepositoryError('not_found');
  }
}
