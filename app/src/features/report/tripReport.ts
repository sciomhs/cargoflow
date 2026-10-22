import { dateTime, kilograms } from '../../domain/format';
import type { TripDetail } from '../../domain/TripRepository';
import { statusLabels, timelineSteps } from '../trips/presentation';

const stageLabels = { before_load: 'Перед загрузкой', after_load: 'После загрузки', at_delivery: 'При выдаче', problem: 'Проблема' } as const;

function escape(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

// HTML for the "Акт выполненного рейса". The trip is already filtered for the viewer's role,
// so a client report never contains the driver's phone or internal notes.
export function tripReportHtml(trip: TripDetail, photos: { stage: keyof typeof stageLabels; data: string }[] = []) {
  const rows = timelineSteps(trip).map((step) => `<tr><td>${escape(step.time)}</td><td>${escape(step.label)}</td></tr>`).join('');
  const documents = trip.documents.map((doc) => `<li>${escape(doc.title)}${doc.number ? ` №${escape(doc.number)}` : ''} — загружена ${escape(dateTime(doc.created_at))}</li>`).join('');
  const images = photos.map((photo) => `<figure><img src="data:image/jpeg;base64,${photo.data}"/><figcaption>${stageLabels[photo.stage]}</figcaption></figure>`).join('');
  const line = (label: string, value: string | null | undefined) => value ? `<tr><th>${label}</th><td>${escape(value)}</td></tr>` : '';
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/><style>
    body { font-family: -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; color: #1C1A29; margin: 32px; font-size: 12px; }
    h1 { font-size: 20px; margin: 0 0 4px; } h2 { font-size: 14px; margin: 24px 0 8px; color: #5B3FE0; }
    .muted { color: #5F5B72; } table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #E4E1EF; vertical-align: top; } th { width: 34%; color: #5F5B72; font-weight: normal; }
    figure { display: inline-block; margin: 0 8px 8px 0; } img { width: 160px; height: 120px; object-fit: cover; border-radius: 8px; }
    figcaption { font-size: 10px; color: #5F5B72; }
  </style></head><body>
    <h1>Акт выполненного рейса ${escape(trip.number)}</h1>
    <div class="muted">CargoFlow · заказ ${escape(trip.order.number)} · сформирован ${escape(dateTime(new Date().toISOString()))}</div>
    <h2>Рейс</h2><table>
      ${line('Маршрут', `${trip.order.pickup_city}, ${trip.order.pickup_address} → ${trip.order.delivery_city}, ${trip.order.delivery_address}`)}
      ${line('Груз', `${trip.order.cargo_name}, ${kilograms(trip.order.weight_kg)}${trip.order.places ? `, ${trip.order.places} ${trip.order.places_unit ?? 'мест'}` : ''}`)}
      ${line('Статус', statusLabels[trip.status])}
      ${line('Водитель', trip.driver?.full_name)}
      ${line('Автомобиль', trip.vehicle ? `${trip.vehicle.make_model}, ${trip.vehicle.plate}` : null)}
      ${line('Плановая доставка', dateTime(trip.planned_delivery_at))}
      ${trip.current_planned_delivery_at !== trip.planned_delivery_at ? line('Новое расчётное время', dateTime(trip.current_planned_delivery_at)) : ''}
      ${line('Получатель', trip.handover?.receiver_name)}
      ${line('Комментарий при передаче', trip.handover?.comment)}
      ${line('Получение подтверждено', trip.handover?.confirmed_at ? dateTime(trip.handover.confirmed_at) : null)}
    </table>
    <h2>История рейса</h2><table>${rows || '<tr><td>Событий нет</td></tr>'}</table>
    <h2>Документы</h2>${documents ? `<ul>${documents}</ul>` : '<div class="muted">Документов нет</div>'}
    ${images ? `<h2>Фото</h2>${images}` : ''}
  </body></html>`;
}
