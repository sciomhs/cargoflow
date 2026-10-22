// Writes app/.env for the local Supabase stack: API address and the public anon key.
// Test accounts and their password come from supabase/seed.sql (see README).
// Usage: node setup/local-backend.mjs [--lan]   (--lan: address reachable from a phone on the same Wi-Fi)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';

const root = new URL('../', import.meta.url);
let status;
try {
  status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
} catch {
  console.error('Локальный Supabase не запущен. Выполните: supabase start');
  process.exit(1);
}
if (!String(status.API_URL).endsWith(':55321')) throw new Error('Ожидался локальный стек CargoFlow на порту 55321');

const lan = Object.values(networkInterfaces()).flat().find((item) => item?.family === 'IPv4' && !item.internal)?.address;
const host = process.argv.includes('--lan') ? lan : '127.0.0.1';
if (!host) throw new Error('Не найден адрес в локальной сети');
const url = `http://${host}:55321`;

const envPath = new URL('../app/.env', import.meta.url);
const previous = existsSync(envPath) ? readFileSync(envPath, 'utf8').split('\n') : [];
const kept = previous.filter((line) => line.trim() && !/^EXPO_PUBLIC_(SUPABASE_URL|SUPABASE_ANON_KEY|LOCAL_DEMO_PASSWORD)=/.test(line));
writeFileSync(envPath, [...kept, `EXPO_PUBLIC_SUPABASE_URL=${url}`, `EXPO_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}`, ''].join('\n'), { mode: 0o600 });
console.log(`app/.env: ${url}. Перезапустите Metro. Вход: dispatcher@cargoflow.test / cargoflow2026`);
