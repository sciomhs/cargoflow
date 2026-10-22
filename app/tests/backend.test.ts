/// <reference types="node" />
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from 'vitest';
import type { Database } from '../src/domain/types';
import type { Command, CommandBody } from '../src/domain/commands';
import { SupabaseTripRepository } from '../src/api/SupabaseTripRepository';
import { DemoTripRepository } from '../src/demo/DemoTripRepository';
import { DemoStore } from '../src/demo/store';
import { memoryStorage } from '../src/demo/persist';
import { data, demoDate, demoUser } from '../src/demo/data';
import { TEST_PASSWORD } from '../src/api/accounts';

const backend = !!process.env.RUN_BACKEND;
const env = backend ? Object.fromEntries(readFileSync('.env', 'utf8').trim().split('\n').map((line) => {
  const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)];
})) : {};
// A 1×1 JPEG so storage uploads carry a real image body.
const jpeg = new Uint8Array(Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64'));

async function signIn(email: string) {
  const client = createClient<Database>(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  expect(error).toBeNull();
  return new SupabaseTripRepository(client, async () => jpeg);
}

test.skipIf(!backend)('все 7 тестовых учётных записей входят и получают свой профиль; неверный пароль отклоняется', async () => {
  for (const profile of data.profiles) {
    const key = profile.role === 'driver' && profile.full_name !== 'Руслан Касымов'
      ? { 'Асхат Нуртаев': 'askhat', 'Ермек Садыков': 'ermek', 'Бауыржан Омаров': 'bauyrzhan' }[profile.full_name] : profile.role;
    const client = createClient<Database>(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data: session, error } = await client.auth.signInWithPassword({ email: `${key}@cargoflow.test`, password: TEST_PASSWORD });
    expect(error, `${key}`).toBeNull();
    const { data: own } = await client.from('profiles').select('id, role').eq('id', session.user!.id).single();
    expect(own).toEqual({ id: profile.id, role: profile.role });
  }
  const client = createClient<Database>(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email: 'dispatcher@cargoflow.test', password: 'wrong-password' });
  expect(error?.status).toBe(400);
});

for (const role of ['dispatcher', 'driver', 'client', 'manager'] as const) {
  test.skipIf(!backend)(`Auth + RLS + parity: ${role}`, async () => {
    const remote = await signIn(`${role}@cargoflow.test`);
    const local = new DemoTripRepository(demoUser(role), new DemoStore(memoryStorage()));
    const actual = await remote.listForDispatcher({ date: demoDate });
    const expected = await local.listForDispatcher({ date: demoDate });
    expect(actual.map((t) => [t.id, t.number, t.status, t.delayed, t.order.number]))
      .toEqual(expected.map((t) => [t.id, t.number, t.status, t.delayed, t.order.number]));
    const id = data.trips.find((t) => t.number === 'R-648')!.id;
    if (role === 'driver') {
      await expect(remote.get(id)).rejects.toMatchObject({ code: 'not_found' });
    } else {
      const detail = await remote.get(id);
      const demoDetail = await local.get(id);
      expect(detail.driver).toEqual(demoDetail.driver);
      expect(detail.vehicle?.plate).toBe(demoDetail.vehicle?.plate);
      expect(detail.problems.map((problem) => problem.reason)).toEqual(demoDetail.problems.map((problem) => problem.reason));
      if (role === 'client') {
        expect(detail.driver).toBeNull();
        expect(detail.problems).toEqual([]);
      }
      expect(detail.events.map((e) => [e.from_status, e.to_status, e.type]).sort())
        .toEqual(demoDetail.events.map((e) => [e.from_status, e.to_status, e.type]).sort());
    }
  });
}

test.skipIf(!backend)('живой сценарий через RPC совпадает с demo-журналом', async () => {
  const dispatcher = await signIn('dispatcher@cargoflow.test');
  const driver = await signIn('driver@cargoflow.test');
  const client = await signIn('client@cargoflow.test');
  const store = new DemoStore(memoryStorage());
  const local = { dispatcher: new DemoTripRepository(demoUser('dispatcher'), store), driver: new DemoTripRepository(demoUser('driver'), store),
    client: new DemoTripRepository(demoUser('client'), store) };
  // Unique numbers and a past date keep repeated runs out of the demo-day lists.
  const run = String(900000 + Math.floor(Math.random() * 99999));
  const orderId = randomUUID();
  const tripId = randomUUID();
  const clientCompany = data.companies.find((company) => company.type === 'client')!;
  const volvo = data.vehicles.find((vehicle) => vehicle.plate === '777 ABC 14')!;
  const both = async (who: keyof typeof local, remote: SupabaseTripRepository, command: Command) => {
    await local[who].apply(command);
    await remote.apply(command);
  };
  const cmd = (body: CommandBody) => ({ action_id: randomUUID(), at: new Date().toISOString(), ...body }) as Command;
  await both('dispatcher', dispatcher, cmd({ kind: 'create_order', order: { id: orderId, number: `CF-${run}`, client_company_id: clientCompany.id,
    cargo_name: 'Керамическая плитка', weight_kg: 8500, places: 12, places_unit: 'паллет', pickup_city: 'Павлодар', pickup_address: 'ул. Промышленная, 18',
    pickup_contact_name: 'Серик', pickup_contact_phone: '+7 777 123 45 67', delivery_city: 'Астана', delivery_address: 'ул. Индустриальная, 42',
    delivery_contact_name: 'Алексей', delivery_contact_phone: '+7 701 456 78 90', load_date: '2026-01-05', desired_delivery_at: '2026-01-06T15:00:00+05:00' } }));
  const create = cmd({ kind: 'create_trip', trip: { id: tripId, number: `R-${run}`, order_id: orderId, driver_id: demoUser('driver').id,
    vehicle_id: volvo.id, depart_date: '2026-01-05', planned_delivery_at: '2026-01-06T13:00:00+05:00' } });
  await both('dispatcher', dispatcher, create);
  await dispatcher.apply(create);
  const assigned = await driver.get(tripId);
  expect(assigned.status).toBe('assigned');
  expect((await driver.listNotifications()).some((n) => n.trip_id === tripId && n.title === 'Новый рейс')).toBe(true);
  for (const to of ['accepted', 'to_pickup', 'at_pickup', 'loading'] as const) await both('driver', driver, cmd({ kind: 'transition', trip_id: tripId, to }));
  await expect(driver.apply(cmd({ kind: 'transition', trip_id: tripId, to: 'loaded' }))).rejects.toMatchObject({ code: 'invalid' });
  const photoId = randomUUID();
  await both('driver', driver, cmd({ kind: 'add_photo', trip_id: tripId, photo: { id: photoId, stage: 'after_load', storage_path: `${tripId}/after_load/${photoId}.jpg`, taken_at: new Date().toISOString() } }));
  for (const to of ['loaded', 'in_transit', 'at_delivery', 'unloading'] as const) await both('driver', driver, cmd({ kind: 'transition', trip_id: tripId, to }));
  const handoverPhoto = randomUUID();
  const doc = randomUUID();
  await both('driver', driver, cmd({ kind: 'hand_over', trip_id: tripId, handover: { id: randomUUID(), receiver_name: 'Алексей Смирнов', comment: 'Повреждений не выявлено',
    photo: { id: handoverPhoto, storage_path: `${tripId}/at_delivery/${handoverPhoto}.jpg`, taken_at: new Date().toISOString() },
    document: { id: doc, type: 'waybill', title: 'Накладная', number: '457', storage_path: `${tripId}/documents/${doc}.jpg` } } }));
  const clientView = await client.get(tripId);
  expect(clientView.status).toBe('awaiting_confirmation');
  expect(clientView.driver).toBeNull();
  expect(clientView.documents.map((d) => d.number)).toEqual(['457']);
  expect(clientView.events.every((e) => !('internal' in (e.payload as object)))).toBe(true);
  const confirm = cmd({ kind: 'confirm_delivery', trip_id: tripId });
  await both('client', client, confirm);
  await client.apply(confirm);
  await expect(dispatcher.apply(cmd({ kind: 'confirm_delivery', trip_id: tripId }))).rejects.toMatchObject({ code: 'conflict' });
  const remoteDone = await dispatcher.get(tripId);
  const localDone = await local.dispatcher.get(tripId);
  const shape = (detail: typeof remoteDone) => ({ status: detail.status, order: detail.order.status, vehicle: detail.vehicle?.status,
    receiver: detail.handover?.receiver_name, confirmed: !!detail.handover?.confirmed_at,
    events: detail.events.map((e) => [e.type, e.from_status, e.to_status]), photos: detail.photos.map((p) => p.stage), documents: detail.documents.map((d) => d.title) });
  expect(shape(remoteDone)).toEqual(shape(localDone));
  expect(remoteDone.events.filter((e) => e.type === 'status')).toHaveLength(13);
  expect((await client.listNotifications()).filter((n) => n.trip_id === tripId).map((n) => n.title).sort()).toEqual(['Груз доставлен', 'Груз загружен']);
});
