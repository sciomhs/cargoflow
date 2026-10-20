import { expect, test } from 'vitest';

import { canTransition, nextAction, requiredAttachments, type TripStatus } from '../src/domain/statusMachine';

const flow: TripStatus[] = [
  'assigned', 'accepted', 'to_pickup', 'at_pickup', 'loading', 'loaded', 'in_transit',
  'at_delivery', 'unloading', 'handed_over', 'awaiting_confirmation', 'delivered', 'completed',
];

test.each(flow.slice(0, -1).map((from, index) => [from, flow[index + 1]]))(
  'разрешён следующий этап: %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  },
);

test('отмена разрешена на каждом этапе до loaded', () => {
  for (const status of ['assigned', 'accepted', 'to_pickup', 'at_pickup', 'loading'] as const) {
    expect(canTransition(status, 'cancelled')).toBe(true);
  }
});

test('запрещён пропуск этапов', () => {
  expect(canTransition('assigned', 'loaded')).toBe(false);
  expect(canTransition('unloading', 'awaiting_confirmation')).toBe(false);
});
test('запрещён возврат назад', () => {
  expect(canTransition('in_transit', 'loaded')).toBe(false);
});
test('запрещён повтор того же статуса', () => {
  for (const status of [...flow, 'cancelled'] as const) expect(canTransition(status, status)).toBe(false);
});
test('завершённый и отменённый рейсы терминальные', () => {
  for (const from of ['completed', 'cancelled'] as const) {
    for (const to of [...flow, 'cancelled'] as const) expect(canTransition(from, to)).toBe(false);
  }
});
test('прямая отмена начиная с loaded запрещена', () => {
  for (const status of flow.slice(5)) expect(canTransition(status, 'cancelled')).toBe(false);
});

test('девять действий водителя совпадают с ТЗ и ведут к следующему этапу', () => {
  const labels = ['Принять рейс', 'Выехал на загрузку', 'Прибыл на загрузку', 'Начать загрузку',
    'Груз загружен', 'В пути', 'Прибыл на выгрузку', 'Начать разгрузку', 'Груз передан'];
  labels.forEach((label, index) => {
    expect(nextAction(flow[index])).toEqual({
      to: flow[index + 1], label, requiredAttachments: requiredAttachments(flow[index + 1]),
    });
  });
});
test('после передачи груза у водителя нет следующей кнопки', () => {
  for (const status of [...flow.slice(9), 'cancelled'] as const) expect(nextAction(status)).toBeNull();
});
test('обязательны after_load для loaded и handover с at_delivery для handed_over', () => {
  expect(requiredAttachments('loaded')).toEqual(['after_load']);
  expect(requiredAttachments('handed_over')).toEqual(['handover', 'at_delivery']);
  for (const status of flow.filter((status) => status !== 'loaded' && status !== 'handed_over')) {
    expect(requiredAttachments(status)).toEqual([]);
  }
  expect(requiredAttachments('cancelled')).toEqual([]);
});
