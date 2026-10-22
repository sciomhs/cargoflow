// Local test accounts created by supabase/seed.sql. Shown on the login screen only for a local server.
export const TEST_PASSWORD = 'cargoflow2026';
export const testAccounts = [
  { email: 'dispatcher@cargoflow.test', title: 'Диспетчер', name: 'Айгерим Нурланова' },
  { email: 'driver@cargoflow.test', title: 'Водитель', name: 'Руслан Касымов' },
  { email: 'askhat@cargoflow.test', title: 'Водитель', name: 'Асхат Нуртаев' },
  { email: 'client@cargoflow.test', title: 'Клиент', name: 'ТОО «СтройКомплект»' },
  { email: 'manager@cargoflow.test', title: 'Руководитель', name: 'Даурен Ахметов' },
] as const;

export function isLocalServer(url = process.env.EXPO_PUBLIC_SUPABASE_URL) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return ['127.0.0.1', 'localhost', '10.0.2.2'].includes(host) || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(host);
  } catch {
    return false;
  }
}
