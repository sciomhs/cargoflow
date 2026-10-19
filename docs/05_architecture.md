# 05 — Архитектура

## 1. Стек
| Слой | Выбор | Почему |
|---|---|---|
| Приложение | Expo (последний стабильный SDK на момент `expo init`; записать в `versions.md`) + TypeScript | Expo Go для демо на телефоне, EAS для APK |
| Навигация | Expo Router (file-based, группы по ролям) | Совпадает с `mobile-taste-skill`; Nav Read = дерево папок |
| Стили | NativeWind + токены из `MOBILE-DESIGN.md` | Быстро, но под контролем токенов |
| Анимация | Reanimated 3 (минимально) | Таймлайн, смена статуса |
| Состояние | Zustand (сессия, роль, demo-mode, outbox) + TanStack Query (серверные данные) | Понятное разделение |
| Бэкенд | Supabase: Auth, Postgres, Storage (фото/документы), Realtime | Нет своего сервера, RLS даёт роли |
| Локально | expo-sqlite или MMKV для outbox и кэша demo-данных | Работа без сети |
| i18n | i18n-js + expo-localization, RU по умолчанию, KZ заготовка | Доп. фича |
| PDF | expo-print (HTML → PDF) + expo-sharing | Экспорт истории рейса |
| Иконки | lucide-react-native | Единый набор |
| Шрифты | expo-font: IBM Plex Sans, IBM Plex Mono | См. дизайн-бриф |

## 2. Структура `app/`
```
app/
  app/                      Expo Router
    (auth)/login.tsx
    (dispatcher)/_layout.tsx  трипс/заказы/внимание
    (driver)/_layout.tsx
    (client)/_layout.tsx
    (manager)/_layout.tsx
    _layout.tsx             провайдеры: Query, Session, Theme, Fonts
  src/
    api/                    supabase client, queries, mutations (один файл на сущность)
    demo/                   seed.json + DemoRepository (та же сигнатура, что и api/)
    domain/                 statusMachine.ts, nextAction.ts, types.ts (генерируются из схемы)
    outbox/                 queue.ts, sync.ts, useOutbox.ts
    store/                  session.ts, settings.ts
    ui/                     токены, примитивы: Text, Button, Row, StatusChip, Timeline, EmptyState, Skeleton
    features/
      trips/  orders/  problems/  photos/  documents/  handover/  notifications/  dashboard/
    i18n/
  MOBILE-DESIGN.md
  versions.md
```

Правило: экраны в `app/` тонкие — композиция из `features/*`. Логика статусов — только в `domain/statusMachine.ts`, UI её импортирует.

## 3. Repository-интерфейс (ключ к demo-mode)
```ts
interface TripRepository {
  listForDispatcher(filter): Promise<Trip[]>
  listForDriver(driverId): Promise<Trip[]>
  get(id): Promise<TripDetail>
  create(input): Promise<Trip>
  transition(id, to: TripStatus, attachments?): Promise<TripEvent>
  reportProblem(id, problem): Promise<Problem>
  ...
}
```
Две реализации: `SupabaseTripRepository` и `DemoTripRepository` (in-memory + SQLite persist).
Выбор — в `store/settings.demoMode`. Экраны не знают, какая реализация под ними.
**На защите включён demo-mode**; Supabase показывается отдельно как «настоящий бэкенд».

## 4. Outbox (работа водителя без сети)
1. Действие водителя (статус, фото, проблема) → сразу применяется локально (optimistic) и пишется в `outbox`.
2. `sync.ts` слушает NetInfo; при сети — отправляет по порядку, с `client_action_id` (идемпотентность), 3 попытки, экспоненциальная пауза.
3. Конфликт (сервер уже в другом статусе) → действие помечается `failed`, показывается водителю строкой «Не удалось: …, нажмите, чтобы повторить».
4. Индикатор в шапке экрана рейса: «2 действия ожидают сети».
Демонстрация: включить авиарежим, нажать 2 статуса, выключить — уходят.

## 5. Realtime и уведомления
- Диспетчер и клиент подписаны на `trip_events` своих рейсов через Supabase Realtime; fallback — refetch каждые 5 с при активном экране.
- Уведомления: запись в `notifications` триггером БД на событиях (`assigned`, `loaded`, `delayed`, `handed_over`, `delivered`) + локальное уведомление на устройстве (`expo-notifications`, local). Настоящие push — «дальнейшее развитие».

## 6. Фото и документы
- `expo-image-picker` → сжатие до 1600px → Supabase Storage bucket `trip-media/{tripId}/{stage}/{uuid}.jpg`.
- В demo-mode — сохраняем в файловую систему приложения, путь в seed.
- Документы — то же, тип и номер вводятся формой.

## 7. Сборка и демо
- Разработка: `npx expo start`, телефон с Expo Go в той же сети.
- Для ролика: эмулятор Android (Pixel 8 API 35) в светлой теме + запись экрана, либо реальный телефон через scrcpy.
- APK: `eas build -p android --profile preview` — на случай показа на устройстве.

## 8. Журнал решений
| # | Решение | Альтернатива | Почему |
|---|---|---|---|
| D1 | Expo, не Flutter | Flutter + Firebase | taste-skill для RN; Codex сильнее в TS |
| D2 | Supabase, не свой API | Node/Nest + Postgres | 1 месяц, студент должен объяснить |
| D3 | Статусы как события (event log) | Поле status + updated_at | История рейса — требование ТЗ §14 |
| D4 | Demo-mode через Repository | Mock Supabase | Стабильность демо (критерий 9) |
| D5 | Одно приложение, 4 роли | 3 отдельных приложения | Проще показать в одном ролике, меньше кода |
| D6 | Без карт | Google Maps SDK | ТЗ §24 исключает, ключи и время |
