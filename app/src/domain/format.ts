const timeZone = 'Asia/Almaty';
const withTime = new Intl.DateTimeFormat('ru-RU', { timeZone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const dateOnly = new Intl.DateTimeFormat('ru-RU', { timeZone, day: 'numeric', month: 'short' });
const timeOnly = new Intl.DateTimeFormat('ru-RU', { timeZone, hour: '2-digit', minute: '2-digit' });

export function dateTime(value: string, mode: 'full' | 'date' | 'time' = 'full'): string {
  // A bare YYYY-MM-DD is a calendar day in Almaty, not midnight UTC.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+05:00` : value);
  if (Number.isNaN(date.getTime())) return 'Время не указано';
  const formatter = mode === 'date' ? dateOnly : mode === 'time' ? timeOnly : withTime;
  return formatter.format(date).replace(/\./g, '');
}

export function kilograms(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(value)} кг`;
}

export function hours(value: number): string {
  return `${value.toFixed(1).replace('.', ',')} ч`;
}

// Form input: "21.10.2026" or "21.10" (year taken from the demo day) → "2026-10-21".
export function parseDay(text: string, year: number): string | null {
  const match = text.trim().match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/);
  if (!match) return null;
  const [day, month, full] = [Number(match[1]), Number(match[2]), match[3] ? Number(match[3]) : year];
  const iso = `${full}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return date.getUTCMonth() + 1 === month && date.getUTCDate() === day ? iso : null;
}

export function parseTime(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export function almatyMoment(day: string, time: string): string {
  return `${day}T${time}:00+05:00`;
}

export function dayInput(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}.${month}.${year}`;
}
