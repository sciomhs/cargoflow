import { expect, test } from 'vitest';
import { previewRepository } from '../src/demo/previewRepository';
import { DemoTripRepository } from '../src/demo/DemoTripRepository';
import { demoUser } from '../src/demo/data';

const repo = new DemoTripRepository(demoUser('dispatcher'));
test('обычные данные используют исходный репозиторий', () => {
  expect(previewRepository(repo, 'normal')).toBe(repo);
});
test('пустое состояние и отсутствующая карточка', async () => {
  const empty = previewRepository(repo, 'empty');
  expect(await empty.listForDispatcher()).toEqual([]);
  await expect(empty.get('id')).rejects.toMatchObject({ code: 'not_found' });
});
test('ошибка воспроизводится без сети', async () => {
  await expect(previewRepository(repo, 'error').listForDispatcher()).rejects.toMatchObject({ code: 'unavailable' });
});
test('состояние загрузки остаётся ожидающим', async () => {
  const result = await Promise.race([previewRepository(repo, 'loading').listForDispatcher(),
    new Promise((resolve) => setTimeout(() => resolve('pending'), 20))]);
  expect(result).toBe('pending');
});
