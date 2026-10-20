import { checkFilter, checkId, RepositoryError, type TripRepository, type TripFilter, type Trip, type TripDetail, type Row } from '../domain/TripRepository';
import { data } from './data';

export class DemoTripRepository implements TripRepository {
  constructor(private user: Row<'profiles'>) {}

  private async visible(): Promise<Trip[]> {
    await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 250));
    const trips = data.trips.flatMap((trip) => {
      const order = data.orders.find((order) => order.id === trip.order_id)!;
      const visible = this.user.role === 'client' ? order.client_company_id === this.user.company_id
        : this.user.role === 'driver' ? trip.driver_id === this.user.id : order.carrier_company_id === this.user.company_id;
      return visible ? [{ ...trip, order }] : [];
    });
    return JSON.parse(JSON.stringify(trips.sort((a, b) => a.number.localeCompare(b.number)))) as Trip[];
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
    const trip = (await this.visible()).find((trip) => trip.id === id);
    if (!trip) throw new RepositoryError('not_found');
    const events = data.trip_events.filter((event) => event.trip_id === id &&
      (this.user.role !== 'client' || (!Object.hasOwn(event.payload as object, 'internal') &&
        !['note', 'problem', 'problem_ack'].includes(event.type))));
    const profile = data.profiles.find((profile) => profile.id === trip.driver_id);
    return JSON.parse(JSON.stringify({ ...trip,
      events: events.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)),
      driver: this.user.role === 'client' || !profile ? null : { full_name: profile.full_name, phone: profile.phone },
      vehicle: this.user.role === 'client' ? null : data.vehicles.find((vehicle) => vehicle.id === trip.vehicle_id) ?? null,
      problems: this.user.role === 'client' ? [] : data.trip_problems.filter((problem) => problem.trip_id === id),
      photos: [], documents: [], handover: null,
    })) as TripDetail;
  }
}
