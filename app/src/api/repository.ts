import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../domain/types';
import { DemoTripRepository } from '../demo/DemoTripRepository';
import { demoUser, type Role } from '../demo/data';
import { SupabaseTripRepository } from './SupabaseTripRepository';
import { previewRepository, type DemoPreview } from '../demo/previewRepository';
import { readMedia } from './media';
import type { Account } from '../store/session';

// Only the public anon key is in the app; every request runs as the signed-in user under RLS.
let server: { client: SupabaseClient<Database>; repo: SupabaseTripRepository } | null = null;

// A dead mobile connection often accepts the socket and never answers; give up after 10 s so the outbox can take over.
export function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, ms = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  init.signal?.addEventListener('abort', () => controller.abort());
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export function serverConfigured() {
  return !!process.env.EXPO_PUBLIC_SUPABASE_URL && !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
}

export async function signInServer(email: string, password: string): Promise<Account> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Сервер не настроен: выполните node setup/local-backend.mjs и перезапустите приложение');
  const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetchWithTimeout(input, init) } });
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) {
    throw new Error(error.status === 400 ? 'Неверный email или пароль' : 'Сервер недоступен. Проверьте, что Supabase запущен и адрес в app/.env верный');
  }
  const { data: profile, error: profileError } = await client.from('profiles').select('id, role, full_name, company_id').eq('id', data.user.id).maybeSingle();
  if (profileError || !profile) {
    await client.auth.signOut();
    throw new Error('Для этой учётной записи нет профиля в базе');
  }
  server = { client, repo: new SupabaseTripRepository(client, readMedia) };
  return profile;
}

export async function signOutServer() {
  const current = server;
  server = null;
  await current?.client.auth.signOut();
}

export async function tripRepository(demoMode: boolean, role: Role, preview: DemoPreview = 'normal') {
  if (demoMode) return previewRepository(new DemoTripRepository(demoUser(role)), __DEV__ ? preview : 'normal');
  if (!server) throw new Error('Войдите по email и паролю, чтобы работать с сервером');
  return server.repo;
}
