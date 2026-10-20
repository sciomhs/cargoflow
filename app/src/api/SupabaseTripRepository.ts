import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { ACTIVE, CommandError, firstFree, type Command } from '../domain/commands';
import type { Database, Json } from '../domain/types';
import { checkFilter, checkId, RepositoryError, type TripRepository, type TripFilter } from '../domain/TripRepository';

export type ReadMedia = (storagePath: string) => Promise<Uint8Array | null>;

const codes: Record<string, CommandError['code']> = { CF400: 'invalid', CF403: 'forbidden', CF404: 'not_found', CF409: 'conflict', '23505': 'conflict' };

export class SupabaseTripRepository implements TripRepository {
  constructor(private client: SupabaseClient<Database>, private readMedia: ReadMedia = async () => null) {}

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

  async listOrders() {
    const { data, error } = await this.client.from('orders').select('*, trips(*), client:companies!orders_client_company_id_fkey(name)')
      .order('created_at', { ascending: false }).order('number', { ascending: false });
    if (error) throw new RepositoryError('unavailable');
    return data.map(({ trips, client, ...order }) => ({ ...order, client_name: client?.name ?? '',
      trip: trips.find((trip) => trip.status !== 'cancelled') ?? null }));
  }

  async listNotifications() {
    const { data, error } = await this.client.from('notifications').select('*').order('created_at', { ascending: false });
    if (error) throw new RepositoryError('unavailable');
    return data;
  }

  async markRead(id: string) {
    checkId(id);
    const { error } = await this.client.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).is('read_at', null);
    if (error) throw new RepositoryError('unavailable');
  }

  async assignmentOptions() {
    const [drivers, vehicles, clients, trips] = await Promise.all([
      this.client.from('profiles').select('id, full_name').eq('role', 'driver').order('full_name'),
      this.client.from('vehicles').select('*').order('make_model'),
      this.client.from('companies').select('*').eq('type', 'client').order('name'),
      this.client.from('trips').select('driver_id').in('status', ['assigned', ...ACTIVE]),
    ]);
    if ([drivers, vehicles, clients, trips].some((result) => result.error)) throw new RepositoryError('unavailable');
    return {
      drivers: drivers.data!.map((driver) => ({ ...driver, active_trips: trips.data!.filter((trip) => trip.driver_id === driver.id).length }))
        .sort((a, b) => a.active_trips - b.active_trips || a.full_name.localeCompare(b.full_name)),
      vehicles: vehicles.data!, clients: clients.data!,
    };
  }

  async listProblems() {
    const { data, error } = await this.client.from('trip_problems').select('*, trip:trips!inner(*, order:orders!inner(*))')
      .order('created_at', { ascending: false });
    if (error) throw new RepositoryError('unavailable');
    return data;
  }

  async nextNumber(kind: 'order' | 'trip') {
    const { data, error } = kind === 'order' ? await this.client.from('orders').select('number') : await this.client.from('trips').select('number');
    if (error) throw new RepositoryError('unavailable');
    return firstFree(data.map((row) => row.number), kind === 'order' ? 'CF-' : 'R-');
  }

  private async upload(storagePath: string) {
    const bytes = await this.readMedia(storagePath);
    if (!bytes) throw new CommandError('invalid', 'Файл не найден на устройстве');
    const { error } = await this.client.storage.from('trip-media').upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: true });
    if (error) throw new RepositoryError('unavailable');
  }

  async apply(command: Command) {
    // Files go to the private bucket first; the RPC then checks they exist under the trip's folder.
    if (command.kind === 'add_photo') await this.upload(command.photo.storage_path);
    if (command.kind === 'add_document') await this.upload(command.document.storage_path);
    if (command.kind === 'hand_over') {
      await this.upload(command.handover.photo.storage_path);
      if (command.handover.document) await this.upload(command.handover.document.storage_path);
    }
    if (command.kind === 'report_problem' && command.problem.photo_path) await this.upload(command.problem.photo_path);
    const { error } = await this.client.rpc('apply_command', { command: command as unknown as Json });
    if (error) throw toError(error);
  }
}

function toError(error: PostgrestError) {
  const code = codes[error.code];
  return code ? new CommandError(code, code === 'conflict' && error.code === '23505' ? 'Запись уже существует' : error.message)
    : new RepositoryError('unavailable');
}
