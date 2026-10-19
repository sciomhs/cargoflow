import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { test } from 'node:test';

import { homeRoutes, tripDestination } from '../src/navigation/routes.ts';

test('ссылка на рейс сохраняет идентификатор до входа', () => {
  assert.deepEqual(tripDestination(null, 'R-642'), {
    pathname: '/(auth)/login', params: { trip: 'R-642' },
  });
});

for (const [role, pathname] of [
  ['dispatcher', '/(dispatcher)/trips/[id]'],
  ['driver', '/(driver)/trips/[id]'],
  ['client', '/(client)/deliveries/[id]'],
]) {
  test(`ссылка открывает рейс внутри своей роли: ${role}`, () => {
    assert.deepEqual(tripDestination(role, 'R-642?other=role'), {
      pathname, params: { id: 'R-642?other=role' },
    });
  });
}

test('руководитель не попадает в экран чужой роли', () => {
  assert.equal(tripDestination('manager', 'R-642'), homeRoutes.manager);
});

test('детали и модалки не становятся лишними вкладками', () => {
  for (const [role, expected] of [
    ['dispatcher', ['attention.tsx', 'orders.tsx', 'trips.tsx']],
    ['driver', ['history.tsx', 'today.tsx']],
    ['client', ['deliveries.tsx', 'notifications.tsx']],
  ]) {
    const folder = new URL(`../app/(${role})/(tabs)/`, import.meta.url);
    assert.deepEqual(readdirSync(folder).filter((name) => name !== '_layout.tsx').sort(), expected);
  }
});

test('существуют ровно 22 экрана ТЗ без служебных redirect-маршрутов', () => {
  const files = readdirSync(new URL('../app/', import.meta.url), { recursive: true });
  const screens = files.filter((name) => name.endsWith('.tsx') && !name.endsWith('_layout.tsx')
    && name !== 'index.tsx' && name !== 'trip/[id].tsx');
  assert.equal(screens.length, 22);
});
