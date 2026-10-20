import { expect, test } from 'vitest';
import { DemoTripRepository } from '../src/demo/DemoTripRepository';
import { demoDate, demoUser } from '../src/demo/data';
import { counts, filterTrips, timelineSteps, dateTime, statusPresentation, type Segment } from '../src/features/trips/presentation';

test('цифры списка и сегменты согласованы: 27/5/13/3/2/4', async () => {
  const trips = await new DemoTripRepository(demoUser('dispatcher')).listForDispatcher({ date: demoDate });
  expect(counts(trips)).toEqual({ all: 27, waiting: 5, transit: 13, unloading: 3, delayed: 2, completed: 4 });
  for (const [segment, count] of Object.entries(counts(trips))) {
    expect(filterTrips(trips, segment as Segment)).toHaveLength(count);
  }
  expect(filterTrips(trips, 'transit').every((trip) => !trip.delayed)).toBe(true);
});
test('закрытый рейс не становится задержкой из-за оставшегося флага', async () => {
  const [trip] = await new DemoTripRepository(demoUser('dispatcher')).listForDispatcher({ date: demoDate });
  expect(statusPresentation({ ...trip, status: 'completed', delayed: true }).label).toBe('Завершён');
  expect(filterTrips([{ ...trip, status: 'cancelled', delayed: true }], 'delayed')).toEqual([]);
});
test('таймлайн строится из реальных событий, текущий этап отмечен один раз', async () => {
  const repo = new DemoTripRepository(demoUser('dispatcher'));
  const trips = await repo.listForDispatcher({ date: demoDate });
  const detail = await repo.get(trips.find((trip) => trip.number === 'R-648')!.id);
  const steps = timelineSteps(detail);
  expect(steps).toHaveLength(detail.events.length);
  expect(steps.filter((step) => step.state === 'current')).toHaveLength(1);
  expect(steps.find((step) => step.state === 'current')?.label).toBe('В пути');
  expect(steps.some((step) => step.label === 'Сообщение о проблеме')).toBe(true);
  const problem = detail.events.find((event) => event.type === 'problem')!;
  const inTransit = detail.events.find((event) => event.to_status === 'in_transit')!;
  expect(Date.parse(problem.created_at)).toBeGreaterThanOrEqual(Date.parse(inTransit.created_at));
  expect(timelineSteps({ ...detail, events: [] })).toEqual([]);
});
test('дата показывается по времени Алматы, некорректное время не роняет экран', () => {
  expect(dateTime('2026-10-21T09:30:00Z')).toBe('21 окт, 14:30');
  expect(dateTime('bad')).toBe('Время не указано');
});
