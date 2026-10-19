# 03 — Модель данных и машина статусов

## 1. Сущности

| Таблица | Ключевые поля | Назначение |
|---|---|---|
| `profiles` | id (= auth.users.id), full_name, phone, role (`dispatcher`/`driver`/`client`/`manager`), company_id | Пользователь и роль |
| `companies` | id, name, type (`carrier`/`client`) | CargoFlow и компании-клиенты |
| `vehicles` | id, make_model, plate, capacity_kg, status (`free`/`on_trip`/`service`) | Volvo FH 777 ABC 14 |
| `orders` | id, number (`CF-1845`), client_company_id, cargo_name, weight_kg, places, pickup_address, pickup_city, pickup_contact_name, pickup_contact_phone, delivery_address, delivery_city, delivery_contact_name, delivery_contact_phone, load_date, desired_delivery_at, status (`new`/`in_trip`/`done`/`cancelled`), created_by | Заказ клиента |
| `trips` | id, number (`R-642`), order_id, driver_id, vehicle_id, depart_date, planned_delivery_at, current_planned_delivery_at, status (см. машину), accepted_at, completed_at | Рейс |
| `trip_events` | id, trip_id, type (= статус или `photo`/`document`/`problem`/`note`/`eta_changed`), from_status, to_status, actor_id, payload jsonb, created_at | Неизменяемый лог. Источник истины для таймлайна |
| `trip_photos` | id, trip_id, stage (`before_load`/`after_load`/`at_delivery`/`problem`), storage_path, taken_at, uploaded_by | Фотофиксация |
| `trip_documents` | id, trip_id, type (`waybill`/`act`/`power_of_attorney`/`signed_receipt`/`other`), title, number, storage_path, status (`uploaded`/`verified`), uploaded_by | Документы |
| `trip_problems` | id, trip_id, category (`delay`/`breakdown`/`cargo`/`road`/`other`), reason, comment, estimated_delay_min, photo_path, status (`open`/`acknowledged`/`resolved`), reported_by, acknowledged_by | Проблемы |
| `handovers` | id, trip_id, receiver_name, comment, photo_path, signature_path, handed_at, confirmed_by, confirmed_at | Передача груза |
| `notifications` | id, user_id, title, body, trip_id, read_at, created_at | In-app центр уведомлений |
| `outbox` (локально, не в Supabase) | id, action, payload, created_at, attempts, status | Очередь водителя без сети |

## 2. Машина статусов рейса (`trips.status`)

Последовательность (из ТЗ §7). Переход вперёд делает водитель, кроме отмеченных.

```
assigned            рейс назначен               (диспетчер создал)
  → accepted        водитель принял рейс
  → to_pickup       едет на загрузку
  → at_pickup       прибыл на загрузку
  → loading         загрузка началась
  → loaded          груз загружен                (требует ≥1 фото after_load)
  → in_transit      в пути
  → at_delivery     прибыл на выгрузку
  → unloading       разгрузка
  → handed_over     груз передан                 (требует handover + фото at_delivery)
  → awaiting_confirmation  ожидает подтверждения (автоматически после handed_over)
  → delivered       доставка подтверждена        (клиент или диспетчер)
  → completed       рейс завершён                (автоматически, либо диспетчер)
```

Боковые состояния (флаги поверх основной последовательности, хранятся в `trips.flags` и
`trip_problems`):
- `delayed` — есть открытая проблема категории `delay`; `current_planned_delivery_at` сдвинут.
- `problem` — есть открытая проблема любой другой категории.
- `cancelled` — терминальное, только диспетчер, с причиной.

Правила:
1. Переходы только на следующий шаг. Пропуск шагов запрещён (для демо можно быстро нажимать).
2. `loaded` блокируется без фото `after_load`; `handed_over` — без `handovers` записи.
3. Каждый переход = строка в `trip_events` (`from_status`, `to_status`, `actor_id`, `created_at`).
4. `delivered` переводит `orders.status` в `done`, `vehicles.status` в `free`.
5. Отмена возможна до `loaded`; после — только через проблему и диспетчера.

Для UI водителя: `NEXT_ACTION[status]` — подпись кнопки и обязательное вложение:
| status | кнопка | требует |
|---|---|---|
| assigned | Принять рейс | — |
| accepted | Выехал на загрузку | — |
| to_pickup | Прибыл на загрузку | — |
| at_pickup | Начать загрузку | фото before_load (опц.) |
| loading | Груз загружен | фото after_load |
| loaded | В пути | — |
| in_transit | Прибыл на выгрузку | — |
| at_delivery | Начать разгрузку | — |
| unloading | Груз передан | handover + фото at_delivery |
| handed_over / awaiting_confirmation | — (ждём клиента) | — |

## 3. Права (RLS, упрощённо)
- `dispatcher`, `manager`: читают всё своей компании-перевозчика; диспетчер пишет orders/trips/problems.
- `driver`: читает только `trips` где `driver_id = auth.uid()` и связанные orders/photos/docs; пишет events/photos/docs/problems/handovers по своим рейсам.
- `client`: читает `orders` где `client_company_id = свой company_id`, связанные `trips` (без `driver.phone`, без `trip_events.payload.internal`), `trip_photos`, `trip_documents`; пишет только подтверждение (`handovers.confirmed_*`).
- Для demo-mode RLS не нужен — данные локальные.

## 4. Demo seed (должен совпадать с ролик-сценарием)
Пользователи: диспетчер Айгерим Нурланова; водители Руслан Касымов (свободен), Асхат Нуртаев
(в рейсе R-648 Экибастуз → Караганда, задержка), Ермек Садыков (в рейсе); клиент ТОО
«СтройКомплект» (контакт Серик, Алексей); руководитель Даурен Ахметов.
Машины: Volvo FH 777 ABC 14 (свободна), MAN TGX 123 KZ 14, KAMAZ 5490 456 ABC 05.
Рейсы фоном: 27 за сегодня в разных статусах (5 ожидают, 13 в пути, 3 выгрузка, 2 задержка,
4 завершены) — чтобы дашборд диспетчера выглядел как в ТЗ. За месяц: 486 рейсов, 421
завершено, среднее 14,5 ч (для руководителя).
Заказ `CF-1845` и рейс `R-642` в seed **отсутствуют** — их создают вживую в ролике (критерий 5).
Заказ `CF-1789` Караганда → Павлодар, доставлен 15 октября — в завершённых у клиента.

SQL — `supabase/schema.sql`, `supabase/seed.sql`.
