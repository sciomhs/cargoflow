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
    const [events, driver, vehicle, photos, documents, problems, handover] = await Promise.all([
      this.client.from('trip_events').select('*').eq('trip_id', id).order('created_at').order('id'),
      this.client.from('profiles').select('full_name, phone').eq('id', trip.driver_id).maybeSingle(),
      this.client.from('vehicles').select('*').eq('id', trip.vehicle_id).maybeSingle(),
      this.client.from('trip_photos').select('*').eq('trip_id', id).order('taken_at'),
      this.client.from('trip_documents').select('*').eq('trip_id', id).order('created_at'),
      this.client.from('trip_problems').select('*').eq('trip_id', id).order('created_at'),
      this.client.from('handovers').select('*').eq('trip_id', id).maybeSingle(),
    ]);
    if ([events, driver, vehicle, photos, documents, problems, handover].some((result) => result.error)) {
      throw new RepositoryError('unavailable');
    }
    return { ...trip, events: events.data!, driver: driver.data, vehicle: vehicle.data,
      photos: photos.data!, documents: documents.data!, problems: problems.data!, handover: handover.data };
  }
}
