import assert from 'node:assert/strict';
import { test } from 'node:test';

import { demoUsers, useSession } from '../src/store/session.ts';
import { useSettings } from '../src/store/settings.ts';

test('сессия начинается без роли и имени', () => {
  assert.equal(useSession.getState().role, null);
  assert.equal(useSession.getState().userName, '');
});

for (const user of demoUsers) {
  test(`вход и выход: ${user.role}`, () => {
    useSession.getState().signIn(user.role);
    assert.equal(useSession.getState().role, user.role);
    assert.equal(useSession.getState().userName, user.userName);
    useSession.getState().signOut();
    assert.equal(useSession.getState().role, null);
    assert.equal(useSession.getState().userName, '');
  });
}

test('неизвестная роль не меняет сессию', () => {
  assert.throws(() => useSession.getState().signIn('admin'), /Неизвестная роль/);
  assert.equal(useSession.getState().role, null);
});

test('деморежим включён по умолчанию и переключается', () => {
  assert.equal(useSettings.getState().demoMode, true);
  useSettings.getState().setDemoMode(false);
  assert.equal(useSettings.getState().demoMode, false);
  useSettings.getState().setDemoMode(true);
});
