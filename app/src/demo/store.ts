import { applyCommand, CommandError, type Actor, type Command, type Lookup, type Outcome } from '../domain/commands';
import type { Row, TripDetail } from '../domain/TripRepository';
import { data } from './data';
import { deviceStorage, type KeyValue } from './persist';

export type StoredCommand = Command & { actor_id: string };
export const JOURNAL_KEY = 'cargoflow.demo.journal.v1';

type Tables = {
  companies: Map<string, Row<'companies'>>; profiles: Map<string, Row<'profiles'>>; vehicles: Map<string, Row<'vehicles'>>;
  orders: Map<string, Row<'orders'>>; trips: Map<string, Row<'trips'>>;
  events: Row<'trip_events'>[]; photos: Row<'trip_photos'>[]; documents: Row<'trip_documents'>[];
  problems: Row<'trip_problems'>[]; handovers: Row<'handovers'>[]; notifications: Row<'notifications'>[];
};

function fresh(): Tables {
  const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map((row) => [row.id, JSON.parse(JSON.stringify(row)) as T]));
  return { companies: byId(data.companies), profiles: byId(data.profiles), vehicles: byId(data.vehicles),
    orders: byId(data.orders), trips: byId(data.trips), events: JSON.parse(JSON.stringify(data.trip_events)),
    photos: [], documents: [], problems: JSON.parse(JSON.stringify(data.trip_problems)), handovers: [], notifications: [] };
}

// Seed plus a replayable journal of commands. The journal is the only thing persisted.
export class DemoStore {
  tables = fresh();
  journal: StoredCommand[] = [];
  private listeners = new Set<() => void>();

  constructor(private storage: KeyValue = deviceStorage()) {
    const saved = storage.get(JOURNAL_KEY);
    if (saved) {
      try { this.replay(JSON.parse(saved) as StoredCommand[]); } catch { this.reset(); }
    }
    this.restoreReadMarks();
  }

  private replay(commands: StoredCommand[]) {
    for (const command of commands) {
      const actor = this.tables.profiles.get(command.actor_id);
      if (!actor) continue;
      try { this.commit(applyCommand(this.lookup(), command, actor), command); } catch (error) {
        if (!(error instanceof CommandError)) throw error;
      }
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private changed() {
    for (const listener of this.listeners) listener();
  }

  reset() {
    this.tables = fresh();
    this.journal = [];
    this.storage.remove(JOURNAL_KEY);
    this.changed();
  }

  detail(tripId: string): TripDetail | undefined {
    const trip = this.tables.trips.get(tripId);
    if (!trip) return undefined;
    const order = this.tables.orders.get(trip.order_id)!;
    const driver = this.tables.profiles.get(trip.driver_id);
    const sort = <T extends { created_at: string; id: string }>(rows: T[]) =>
      rows.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    return { ...trip, order, driver: driver ? { full_name: driver.full_name, phone: driver.phone } : null,
      vehicle: this.tables.vehicles.get(trip.vehicle_id) ?? null,
      events: sort(this.tables.events.filter((row) => row.trip_id === tripId)),
      photos: this.tables.photos.filter((row) => row.trip_id === tripId).sort((a, b) => a.taken_at.localeCompare(b.taken_at)),
      documents: sort(this.tables.documents.filter((row) => row.trip_id === tripId)),
      problems: sort(this.tables.problems.filter((row) => row.trip_id === tripId)),
      handover: this.tables.handovers.find((row) => row.trip_id === tripId) ?? null };
  }

  lookup(): Lookup {
    const tables = this.tables;
    return {
      order: (id) => tables.orders.get(id), vehicle: (id) => tables.vehicles.get(id),
      profile: (id) => tables.profiles.get(id), company: (id) => tables.companies.get(id),
      numberTaken: (kind, number) => [...(kind === 'order' ? tables.orders : tables.trips).values()].some((row) => row.number === number),
      detail: (id) => this.detail(id),
      usersOf: (companyId, role) => [...tables.profiles.values()].filter((p) => p.company_id === companyId && p.role === role).map((p) => p.id),
    };
  }

  apply(command: Command, actor: Actor): Outcome {
    if (this.journal.some((stored) => stored.action_id === command.action_id)) {
      // Same action again (double tap, retry): nothing changes, the first outcome stands.
      const tripId = 'trip_id' in command ? command.trip_id : command.kind === 'create_trip' ? command.trip.id : null;
      return { trip: tripId ? this.detail(tripId) : undefined, notifications: [] };
    }
    const outcome = applyCommand(this.lookup(), command, actor);
    this.commit(outcome, { ...command, actor_id: actor.id });
    this.storage.set(JOURNAL_KEY, JSON.stringify(this.journal));
    this.changed();
    return outcome;
  }

  private commit(outcome: Outcome, command: StoredCommand) {
    const t = this.tables;
    if (outcome.order) t.orders.set(outcome.order.id, outcome.order);
    if (outcome.vehicle) t.vehicles.set(outcome.vehicle.id, outcome.vehicle);
    if (outcome.trip) {
      const { order, driver: _driver, vehicle, events, photos, documents, problems, handover, ...trip } = outcome.trip;
      t.trips.set(trip.id, trip);
      t.orders.set(order.id, order);
      if (vehicle) t.vehicles.set(vehicle.id, vehicle);
      const replace = <T extends { trip_id: string }>(rows: T[], next: T[]) => [...rows.filter((row) => row.trip_id !== trip.id), ...next];
      t.events = replace(t.events, events);
      t.photos = replace(t.photos, photos);
      t.documents = replace(t.documents, documents);
      t.problems = replace(t.problems, problems);
      t.handovers = replace(t.handovers, handover ? [handover] : []);
    }
    t.notifications.push(...outcome.notifications);
    this.journal.push(command);
  }

  // Demo actions happen on the fixed demo day at the current Almaty time of day, always after the previous action.
  nextAt(now = new Date()): string {
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Almaty', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(now);
    let at = Date.parse(`${data.date}T${time}+05:00`);
    const last = this.journal.at(-1)?.at;
    if (last && at <= Date.parse(last)) at = Date.parse(last) + 60000;
    return new Date(at).toISOString();
  }

  readNotification(id: string, userId: string) {
    const row = this.tables.notifications.find((item) => item.id === id && item.user_id === userId);
    if (row && !row.read_at) {
      row.read_at = new Date().toISOString();
      this.storage.set(`${JOURNAL_KEY}.read.${id}`, row.read_at);
      this.changed();
    }
  }

  private restoreReadMarks() {
    for (const row of this.tables.notifications) {
      row.read_at = this.storage.get(`${JOURNAL_KEY}.read.${row.id}`) ?? row.read_at;
    }
  }
}

let shared: DemoStore | undefined;
export function demoStore() {
  if (!shared) shared = new DemoStore();
  return shared;
}
