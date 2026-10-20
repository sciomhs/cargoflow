import seed from './seed.json';
import type { Row } from '../domain/TripRepository';

type Seed = { date: string; companies: Row<'companies'>[]; profiles: Row<'profiles'>[];
  vehicles: Row<'vehicles'>[]; orders: Row<'orders'>[]; trips: Row<'trips'>[];
  trip_events: Row<'trip_events'>[]; trip_problems: Row<'trip_problems'>[] };

export const data = seed as Seed;
export const demoDate = data.date;
export type Role = Row<'profiles'>['role'];
export function demoUser(role: Role) {
  return data.profiles.find((profile) => profile.role === role)!;
}
