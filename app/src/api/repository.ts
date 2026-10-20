import { createClient } from '@supabase/supabase-js';
import type { Database } from '../domain/types';
import { DemoTripRepository } from '../demo/DemoTripRepository';
import { demoUser, type Role } from '../demo/data';
import { SupabaseTripRepository } from './SupabaseTripRepository';
import { previewRepository, type DemoPreview } from '../demo/previewRepository';
import { readMedia } from './media';

const signedIn = new Map<Role, Promise<SupabaseTripRepository>>();

export async function tripRepository(demoMode: boolean, role: Role, preview: DemoPreview = 'normal') {
  if (demoMode) return previewRepository(new DemoTripRepository(demoUser(role)), __DEV__ ? preview : 'normal');
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const password = process.env.EXPO_PUBLIC_LOCAL_DEMO_PASSWORD;
  // Local fixture impersonation is never enabled in a release or against a cloud project.
  if (!__DEV__ || !url || !key || !password || !['127.0.0.1', 'localhost', '10.0.2.2'].includes(new URL(url).hostname)) {
    throw new Error('Серверный режим недоступен. Включите демо-режим в настройках.');
  }
  if (!signedIn.has(role)) {
    signedIn.set(role, (async () => {
      const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false } });
      const { error } = await client.auth.signInWithPassword({ email: `${role}@cargoflow.test`, password });
      if (error) throw new Error('Не удалось войти в локальный Supabase');
      return new SupabaseTripRepository(client, readMedia);
    })());
    signedIn.get(role)!.catch(() => signedIn.delete(role));
  }
  return signedIn.get(role)!;
}
