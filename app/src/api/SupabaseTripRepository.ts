import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../domain/types';
import { checkFilter, checkId, RepositoryError, type TripRepository, type TripFilter } from '../domain/TripRepository';

export class SupabaseTripRepository implements TripRepository {
  constructor(private client: SupabaseClient<Database>) {}

  async listForDispatcher(filter?: TripFilter) {
    checkFilter(filter);
    let query = this.client.from('trips').select('*, order:orders!inner(*)').order('number');
    if (filter?.date) query = query.eq('depart_date', filter.date);
    const { data, error } = await query;
    if (error) throw new RepositoryError('unavailable');
    return data;
  }

  async listForDriver(driverId: string) {
    checkId(driverId);
    const { data, error } = await this.client.from('trips').select('*, order:orders!inner(*)')
      .eq('driver_id', driverId).order('number');
    if (error) throw new RepositoryError('unavailable');
    return data;
  }

  async get(id: string) {
    checkId(id);
    const { data: trip, error } = await this.client.from('trips').select('*, order:orders!inner(*)').eq('id', id).maybeSingle();
    if (error) throw new RepositoryError('unavailable');
    if (!trip) throw new RepositoryError('not_found');
    const { data: events, error: eventError } = await this.client.from('trip_events').select('*').eq('trip_id', id).order('created_at').order('id');
    if (eventError) throw new RepositoryError('unavailable');
    return { ...trip, events };
  }
}
