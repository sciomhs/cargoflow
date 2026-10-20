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
