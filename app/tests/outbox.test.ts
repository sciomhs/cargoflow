import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import { CommandError, type Command } from '../src/domain/commands';
import { memoryStorage } from '../src/demo/persist';
import { Outbox } from '../src/outbox/queue';
import { RepositoryError } from '../src/domain/TripRepository';

const tripId = randomUUID();
const move = (to: 'at_delivery' | 'unloading'): Command => ({ kind: 'transition', action_id: randomUUID(), at: new Date().toISOString(), trip_id: tripId, to });

test('без сети → два действия → перезапуск → сеть → каждое отправлено один раз и по порядку', async () => {
  const storage = memoryStorage();
  const first = new Outbox(storage);
  const a = move('at_delivery');
  const b = move('unloading');
  first.enqueue(a);
  first.enqueue(b);
  first.enqueue(a); // repeated tap or retry: same action id, no duplicate
  await first.flush(async () => { throw new RepositoryError('unavailable'); });
  expect(first.items().map((item) => [item.status, item.attempts])).toEqual([['pending', 1], ['pending', 0]]);
  const restarted = new Outbox(storage);
  expect(restarted.items().map((item) => item.command.action_id)).toEqual([a.action_id, b.action_id]);
  const sent: string[] = [];
  await restarted.flush(async (command) => { sent.push(command.action_id); });
  expect(sent).toEqual([a.action_id, b.action_id]);
  expect(restarted.items()).toEqual([]);
  await restarted.flush(async (command) => { sent.push(command.action_id); });
  expect(sent).toHaveLength(2);
});

test('отказ сервера помечает действие и останавливает очередь; повтор и удаление', async () => {
  const box = new Outbox(memoryStorage());
  const a = move('at_delivery');
  const b = move('unloading');
  box.enqueue(a);
  box.enqueue(b);
  await box.flush(async () => { throw new CommandError('conflict', 'Переход in_transit → unloading невозможен'); });
  expect(box.items().map((item) => [item.status, item.error ?? null])).toEqual([['failed', 'Переход in_transit → unloading невозможен'], ['pending', null]]);
  const sent: string[] = [];
  await box.flush(async (command) => { sent.push(command.action_id); });
  expect(sent).toEqual([]);
  box.retry(a.action_id);
  await box.flush(async (command) => { sent.push(command.action_id); });
  expect(sent).toEqual([a.action_id, b.action_id]);
  box.enqueue(move('at_delivery'));
  box.discard(box.items()[0].command.action_id);
  expect(box.items()).toEqual([]);
});

test('ограниченные повторы: после 5 сетевых ошибок нужен ручной повтор', async () => {
  const box = new Outbox(memoryStorage());
  box.enqueue(move('at_delivery'));
  for (let i = 0; i < 6; i++) await box.flush(async () => { throw new RepositoryError('unavailable'); });
  expect(box.items()[0]).toMatchObject({ status: 'failed', attempts: 5 });
});
