import { ACTIVE, firstFree, type Command } from '../domain/commands';
import { checkFilter, checkId, RepositoryError, type TripRepository, type TripFilter, type Trip, type TripDetail, type Row, type OrderWithTrip } from '../domain/TripRepository';
import { demoStore, type DemoStore } from './store';

const CLIENT_HIDDEN_EVENTS = ['note', 'problem', 'problem_ack'];

export class DemoTripRepository implements TripRepository {
  constructor(private user: Row<'profiles'>, private store: DemoStore = demoStore()) {}

  private async pause() {
    await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 250));
  }

  private sees(order: Row<'orders'>, trip: Row<'trips'> | null) {
    if (this.user.role === 'client') return order.client_company_id === this.user.company_id;
    if (this.user.role === 'driver') return trip !== null && trip.driver_id === this.user.id;
    return order.carrier_company_id === this.user.company_id;
  }

  private clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

  private async visible(): Promise<Trip[]> {
    await this.pause();
    const trips = [...this.store.tables.trips.values()].flatMap((trip) => {
      const order = this.store.tables.orders.get(trip.order_id)!;
      return this.sees(order, trip) ? [{ ...trip, order }] : [];
    });
    return this.clone(trips.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })));
  }

  async listForDispatcher(filter?: TripFilter) {
    checkFilter(filter);
    return (await this.visible()).filter((trip) => !filter?.date || trip.depart_date === filter.date);
  }

  async listForDriver(driverId: string) {
    checkId(driverId);
    return (await this.visible()).filter((trip) => trip.driver_id === driverId);
  }

  async get(id: string) {
    checkId(id);
    const detail = this.store.detail(id);
    if (!detail || !this.sees(detail.order, detail)) throw new RepositoryError('not_found');
    await this.pause();
    if (this.user.role !== 'client') return this.clone(detail);
    return this.clone({ ...detail, driver: null, vehicle: null, problems: [],
      events: detail.events.filter((event) => !Object.hasOwn(event.payload as object, 'internal') && !CLIENT_HIDDEN_EVENTS.includes(event.type)) }) as TripDetail;
  }

  async listOrders() {
    await this.pause();
    const trips = [...this.store.tables.trips.values()];
    const rows = [...this.store.tables.orders.values()].flatMap((order): OrderWithTrip[] => {
      const own = trips.filter((trip) => trip.order_id === order.id);
      const trip = own.find((item) => item.status !== 'cancelled') ?? null;
      return this.sees(order, trip) ? [{ ...order, trip, client_name: this.store.tables.companies.get(order.client_company_id)?.name ?? '' }] : [];
    });
    return this.clone(rows.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.number.localeCompare(a.number)));
  }

  async listNotifications() {
    await this.pause();
    return this.clone(this.store.tables.notifications.filter((row) => row.user_id === this.user.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }

  async markRead(id: string) {
    this.store.readNotification(id, this.user.id);
  }

  async assignmentOptions() {
    await this.pause();
    if (this.user.role !== 'dispatcher') return { drivers: [], vehicles: [], clients: [] };
    const trips = [...this.store.tables.trips.values()];
    const drivers = [...this.store.tables.profiles.values()]
      .filter((profile) => profile.role === 'driver' && profile.company_id === this.user.company_id)
      .map(({ id, full_name }) => ({ id, full_name,
        active_trips: trips.filter((trip) => trip.driver_id === id && (trip.status === 'assigned' || ACTIVE.includes(trip.status))).length }))
      .sort((a, b) => a.active_trips - b.active_trips || a.full_name.localeCompare(b.full_name));
    const vehicles = [...this.store.tables.vehicles.values()].filter((vehicle) => vehicle.company_id === this.user.company_id);
    const clients = [...this.store.tables.companies.values()].filter((company) => company.type === 'client');
    return this.clone({ drivers, vehicles, clients });
  }

  async nextNumber(kind: 'order' | 'trip') {
    const rows = kind === 'order' ? this.store.tables.orders : this.store.tables.trips;
    return firstFree([...rows.values()].map((row) => row.number), kind === 'order' ? 'CF-' : 'R-');
  }

  async apply(command: Command) {
    this.store.apply(command, this.user);
  }
}
