# Агент: Навигация и дизайн-система (Astra, один раз в начале)

Использовать вместе с промптом 00. Задачи T-02, T-03.

Ты отвечаешь за два артефакта, которые потом используют все остальные агенты:

1. **Nav Read** (skill `mobile-nav-plan`): полное дерево маршрутов Expo Router по
   `docs/02_product_spec.md` §2 для четырёх ролей. Для каждого экрана: контейнер (tab /
   stack / modal / sheet), откуда попадаем, куда ведёт «назад», deep link (`cargoflow://trip/R-642`).
   Отдельно: поведение Android back из модалок с незавершённым вводом.
   Результат — `app/NAV.md` + пустые файлы маршрутов с заголовками.

2. **Дизайн-система** (skill `mobile-design-system`): из `docs/04_design_brief.md` сделать
   `app/MOBILE-DESIGN.md` (SAFE/RISK-вариант, дилы 2/1/4-2-3), `tailwind.config.js` с токенами,
   `src/ui/tokens.ts`, подключение шрифтов IBM Plex, и 8 примитивов в `src/ui/`:
   `Text`, `Button` (primary / secondary / destructive / driver-xl), `Row`, `StatusChip`,
   `Timeline`, `Field`, `EmptyState`, `Skeleton`. Каждый — с одним примером в
   `app/(dev)/ui-gallery.tsx` (экран-галерея, скрыт в проде).

Критерий готовности: галерея открывается, grep-чеклист `tells.md` даёт 0 попаданий,
`MOBILE-DESIGN.md` объясняет каждый выбор в одну строку.
