import type { Trip } from '../../domain/TripRepository';

export function monthStats(trips: Trip[]) {
  const completed = trips.filter((trip) => trip.status === 'completed');
  const hours = completed.filter((trip) => trip.accepted_at && trip.completed_at)
    .map((trip) => (Date.parse(trip.completed_at!) - Date.parse(trip.accepted_at!)) / 3600000);
  const open = trips.filter((trip) => trip.status !== 'completed' && trip.status !== 'cancelled');
  const byDriver = new Map<string, { trips: number; active: number }>();
  const byRoute = new Map<string, { trips: number; delayed: number }>();
  for (const trip of trips) {
    const driver = byDriver.get(trip.driver_id) ?? { trips: 0, active: 0 };
    driver.trips++;
    if (open.includes(trip)) driver.active++;
    byDriver.set(trip.driver_id, driver);
    const key = `${trip.order.pickup_city} → ${trip.order.delivery_city}`;
    const route = byRoute.get(key) ?? { trips: 0, delayed: 0 };
    route.trips++;
    if (trip.delayed) route.delayed++;
    byRoute.set(key, route);
  }
  return {
    total: trips.length,
    completed: completed.length,
    inTransit: trips.filter((trip) => trip.status === 'in_transit').length,
    delayed: open.filter((trip) => trip.delayed).length,
    cancelled: trips.filter((trip) => trip.status === 'cancelled').length,
    problems: open.filter((trip) => trip.has_problem).length,
    averageHours: hours.length ? hours.reduce((sum, value) => sum + value, 0) / hours.length : 0,
    onTimeShare: completed.length ? completed.filter((trip) => !trip.delayed).length / completed.length : 0,
    byDriver: [...byDriver].map(([id, value]) => ({ id, ...value })).sort((a, b) => b.active - a.active || b.trips - a.trips),
    byRoute: [...byRoute].map(([route, value]) => ({ route, ...value })).sort((a, b) => b.delayed - a.delayed || b.trips - a.trips),
  };
}
