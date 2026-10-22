import type { TripStatus } from '../../domain/statusMachine';

// City centres for the route sketch. Not GPS: the truck mark follows the trip stage.
export const cities: Record<string, { latitude: number; longitude: number }> = {
  'Павлодар': { latitude: 52.2873, longitude: 76.9674 },
  'Астана': { latitude: 51.1694, longitude: 71.4491 },
  'Караганда': { latitude: 49.8060, longitude: 73.0850 },
  'Экибастуз': { latitude: 51.7298, longitude: 75.3266 },
  'Алматы': { latitude: 43.2389, longitude: 76.8897 },
  'Шымкент': { latitude: 42.3417, longitude: 69.5901 },
  'Актобе': { latitude: 50.2839, longitude: 57.1660 },
  'Костанай': { latitude: 53.2198, longitude: 63.6354 },
  'Усть-Каменогорск': { latitude: 49.9483, longitude: 82.6276 },
  'Атырау': { latitude: 47.0945, longitude: 51.9238 },
};

export function cityPoint(name: string) {
  return cities[name.trim()] ?? null;
}

const progress: Partial<Record<TripStatus, number>> = {
  loaded: 0.05, in_transit: 0.55, at_delivery: 1, unloading: 1, handed_over: 1, awaiting_confirmation: 1, delivered: 1, completed: 1,
};

export function stageProgress(status: TripStatus) {
  return progress[status] ?? 0;
}

export function between(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }, t: number) {
  return { latitude: a.latitude + (b.latitude - a.latitude) * t, longitude: a.longitude + (b.longitude - a.longitude) * t };
}
