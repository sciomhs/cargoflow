import { expect, test } from 'vitest';
import { data, demoDate, demoUser } from '../src/demo/data';
import { DemoTripRepository } from '../src/demo/DemoTripRepository';

test('27 рейсов демо-дня: 5/13/3/2/4', async () => {
  const trips = await new DemoTripRepository(demoUser('dispatcher')).listForDispatcher({ date: demoDate });
  expect(trips).toHaveLength(27);
  expect(trips.filter((t) => t.status === 'assigned')).toHaveLength(5);
  expect(trips.filter((t) => t.status === 'in_transit' && !t.delayed)).toHaveLength(13);
  expect(trips.filter((t) => t.status === 'at_delivery')).toHaveLength(3);
  expect(trips.filter((t) => t.delayed)).toHaveLength(2);
  expect(trips.filter((t) => t.status === 'completed')).toHaveLength(4);
});
test('месяц: 486, завершено 421, в пути 37, задержка 12, отменено 4; среднее 14,5 ч', () => {
  expect(data.trips).toHaveLength(486);
  const completed = data.trips.filter((trip) => trip.status === 'completed');
  expect(completed).toHaveLength(421);
  expect(data.trips.filter((t) => t.status === 'in_transit')).toHaveLength(37);
  expect(data.trips.filter((t) => t.delayed)).toHaveLength(12);
  expect(data.trips.filter((t) => t.status === 'cancelled')).toHaveLength(4);
  const average = completed.reduce((sum, t) => sum + (Date.parse(t.completed_at!) - Date.parse(t.accepted_at!)), 0) / completed.length / 3600000;
  expect(average).toBe(14.5);
  for (const trip of completed) {
    const events = data.trip_events.filter((event) => event.trip_id === trip.id);
    expect(Date.parse(events.find((event) => event.to_status === 'accepted')!.created_at)).toBe(Date.parse(trip.accepted_at!));
    expect(Date.parse(events.find((event) => event.to_status === 'completed')!.created_at)).toBe(Date.parse(trip.completed_at!));
  }
});
test('главный сценарий не создан заранее, Руслан и Volvo свободны', async () => {
  expect(data.trips.some((trip) => trip.number === 'R-642')).toBe(false);
  expect(data.orders.some((order) => order.number === 'CF-1845')).toBe(false);
  expect(await new DemoTripRepository(demoUser('driver')).listForDriver(demoUser('driver').id)).toEqual([]);
  expect(data.vehicles.find((vehicle) => vehicle.plate === '777 ABC 14')?.status).toBe('free');
  expect(data.orders.find((order) => order.number === 'CF-1789')?.status).toBe('done');
});
test('результат не меняет seed; отсутствующий и чужой рейс не раскрываются', async () => {
  const repo = new DemoTripRepository(demoUser('dispatcher'));
  const trips = await repo.listForDispatcher({ date: demoDate });
  trips[0].order.cargo_name = 'Изменено';
  expect((await repo.get(trips[0].id)).order.cargo_name).toBe('Строительные материалы');
  await expect(new DemoTripRepository(demoUser('driver')).get(trips[0].id)).rejects.toMatchObject({ code: 'not_found' });
});
test('клиент не получает служебные причины проблемы', async () => {
  const trip = data.trips.find((trip) => trip.number === 'R-648')!;
  const detail = await new DemoTripRepository(demoUser('client')).get(trip.id);
  expect(detail.events.every((event) => event.type !== 'problem')).toBe(true);
});
test('некорректные UUID и даты отклоняются на границе', async () => {
  const repo = new DemoTripRepository(demoUser('dispatcher'));
  await expect(repo.get('preview')).rejects.toMatchObject({ code: 'not_found' });
  await expect(repo.listForDriver('not-a-user')).rejects.toMatchObject({ code: 'not_found' });
  await expect(repo.listForDispatcher({ date: '2026-02-30' })).rejects.toThrow('Некорректная дата');
});
