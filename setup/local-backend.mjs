import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const root = new URL('../', import.meta.url);
const config = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','ignore'] }));
const url = 'http://127.0.0.1:55321';
if (config.API_URL !== url) throw new Error('Expected the isolated local CargoFlow stack');
const password = randomBytes(24).toString('base64url');
const seed = JSON.parse(readFileSync(new URL('../app/src/demo/seed.json', import.meta.url), 'utf8'));
for (const user of seed.profiles) {
  const response = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT', headers: { apikey: config.SERVICE_ROLE_KEY, Authorization: `Bearer ${config.SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, email_confirm: true }),
  });
  if (!response.ok) throw new Error(`Local Auth setup failed: ${response.status}`);
}
const envPath = new URL('../app/.env', import.meta.url);
const previous = existsSync(envPath) ? readFileSync(envPath, 'utf8').split('\n') : [];
const retained = previous.filter((line) => line.trim() && !/^EXPO_PUBLIC_(SUPABASE_URL|SUPABASE_ANON_KEY|LOCAL_DEMO_PASSWORD)=/.test(line));
writeFileSync(envPath, [...retained, `EXPO_PUBLIC_SUPABASE_URL=${url}`, `EXPO_PUBLIC_SUPABASE_ANON_KEY=${config.ANON_KEY}`,
  `EXPO_PUBLIC_LOCAL_DEMO_PASSWORD=${password}`, ''].join('\n'), { mode: 0o600 });
console.log('Local Auth configured; credentials saved to ignored app/.env. Restart Metro.');
