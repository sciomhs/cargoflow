# Агент: Данные и бэкенд (GPT-6.1 Sol в Codex)

Использовать вместе с промптом 00. Задачи T-04 … T-08.

Зона ответственности: `supabase/`, `src/api/`, `src/demo/`, `src/domain/`, `src/outbox/`.

Правила:
- Источник истины — `docs/03_data_model.md` и `supabase/migrations/`. Типы в `src/domain/types.ts`
  генерируются из схемы (`supabase gen types typescript`), руками не правятся.
- `statusMachine.ts`: функции `canTransition(from, to)`, `nextAction(status)`,
  `requiredAttachments(to)`. Покрыть unit-тестами (vitest) — все 13 переходов и 5 запрещённых.
- `TripRepository` — интерфейс; `DemoTripRepository` обязан вести себя идентично Supabase-версии
  (те же ошибки, те же задержки 150–400 мс для реализма skeleton'ов).
- Seed (`src/demo/seed.json` и `supabase/seed.sql`) один и тот же по содержанию. Цифры дашборда
  диспетчера и руководителя — как в ТЗ (27 рейсов сегодня: 5/13/3/2/4; 486 за месяц).
- Outbox: действия идемпотентны по `client_action_id`; конфликт не теряет действие.
- RLS: политики для 4 ролей, проверить тремя запросами под разными пользователями.

Отчёт по шаблону из промпта 00. Для каждого метода репозитория — одна строка «как проверить».
