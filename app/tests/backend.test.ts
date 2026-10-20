/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from 'vitest';
import type { Database } from '../src/domain/types';
import { SupabaseTripRepository } from '../src/api/SupabaseTripRepository';
import { DemoTripRepository } from '../src/demo/DemoTripRepository';
import { data, demoDate, demoUser } from '../src/demo/data';

for (const role of ['dispatcher','driver','client','manager'] as const) {
  test.skipIf(!process.env.RUN_BACKEND)(`Auth + RLS + parity: ${role}`, async () => {
    const env = Object.fromEntries(readFileSync('.env', 'utf8').trim().split('\n').map((line) => {
      const index = line.indexOf('='); return [line.slice(0,index),line.slice(index+1)];
    }));
    const client = createClient<Database>(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await client.auth.signInWithPassword({ email: `${role}@cargoflow.test`, password: env.EXPO_PUBLIC_LOCAL_DEMO_PASSWORD });
    expect(error).toBeNull();
    const remote = new SupabaseTripRepository(client);
    const local = new DemoTripRepository(demoUser(role));
    const actual = await remote.listForDispatcher({ date: demoDate });
    const expected = await local.listForDispatcher({ date: demoDate });
    expect((await remote.listForDispatcher()).map((trip) => trip.id))
      .toEqual((await local.listForDispatcher()).map((trip) => trip.id));
    expect(actual.map((t) => [t.id,t.number,t.status,t.delayed,t.order.number]))
      .toEqual(expected.map((t) => [t.id,t.number,t.status,t.delayed,t.order.number]));
    expect((await remote.listForDriver(demoUser('driver').id))).toEqual([]);
    const id = data.trips.find((t) => t.number === 'R-648')!.id;
    if (role === 'driver') {
      await expect(remote.get(id)).rejects.toMatchObject({ code: 'not_found' });
    } else {
      const detail = await remote.get(id);
      expect(detail.events.map((e) => [e.from_status,e.to_status,e.type]).sort())
        .toEqual((await local.get(id)).events.map((e) => [e.from_status,e.to_status,e.type]).sort());
    }
  });
}
