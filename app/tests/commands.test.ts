import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import { CommandError, type Command } from '../src/domain/commands';
import type { TripStatus } from '../src/domain/statusMachine';
import { DemoStore, JOURNAL_KEY } from '../src/demo/store';
import { memoryStorage } from '../src/demo/persist';
import { data, demoUser } from '../src/demo/data';

const dispatcher = demoUser('dispatcher');
const driver = demoUser('driver');
const client = demoUser('client');
const manager = demoUser('manager');
const askhat = data.profiles.find((profile) => profile.full_name === 'Асхат Нуртаев')!;
const volvo = data.vehicles.find((vehicle) => vehicle.plate === '777 ABC 14')!;
const clientCompany = data.companies.find((company) => company.type === 'client')!;

let clock = Date.parse('2026-10-21T04:00:00+05:00');
const at = () => new Date((clock += 5 * 60000)).toISOString();
const cmd = <K extends Command['kind']>(kind: K, body: Omit<Extract<Command, { kind: K }>, 'kind' | 'action_id' | 'at'>) =>
  ({ kind, action_id: randomUUID(), at: at(), ...body }) as Extract<Command, { kind: K }>;

const orderId = randomUUID();
const tripId = randomUUID();
const order = () => cmd('create_order', { order: { id: orderId, number: 'CF-1845', client_company_id: clientCompany.id,
  cargo_name: 'Керамическая плитка', weight_kg: 8500, places: 12, places_unit: 'паллет',
  pickup_city: 'Павлодар', pickup_address: 'ул. Промышленная, 18', pickup_contact_name: 'Серик', pickup_contact_phone: '+7 777 123 45 67',
  delivery_city: 'Астана', delivery_address: 'ул. Индустриальная, 42', delivery_contact_name: 'Алексей', delivery_contact_phone: '+7 701 456 78 90',
  load_date: '2026-10-21', desired_delivery_at: '2026-10-22T15:00:00+05:00' } });
const trip = (number = 'R-642', vehicle_id = volvo.id) => cmd('create_trip', { trip: { id: tripId, number, order_id: orderId,
  driver_id: driver.id, vehicle_id, depart_date: '2026-10-21', planned_delivery_at: '2026-10-22T13:00:00+05:00' } });
const photo = (stage: 'before_load' | 'after_load' | 'problem', id = randomUUID()) =>
  ({ id, stage, storage_path: `${tripId}/${stage}/${id}.jpg`, taken_at: at() });
const go = (to: TripStatus) => cmd('transition', { trip_id: tripId, to });
const handover = () => cmd('hand_over', { trip_id: tripId, handover: { id: randomUUID(), receiver_name: 'Алексей Смирнов',
  comment: 'Груз передан полностью. Повреждений не выявлено', photo: { id: randomUUID(), storage_path: `${tripId}/at_delivery/x.jpg`, taken_at: at() },
  document: { id: randomUUID(), type: 'waybill', title: 'Накладная', number: '457', storage_path: `${tripId}/documents/w.jpg` } } });

function fail(store: DemoStore, command: Command, actor = driver) {
  try { store.apply(command, actor); } catch (error) { return (error as CommandError).code + ': ' + (error as Error).message; }
  return 'applied';
}

test('полный цикл CF-1845 → R-642 с фото, накладной, получателем и подтверждением', () => {
  const storage = memoryStorage();
  const store = new DemoStore(storage);
  store.apply(order(), dispatcher);
  expect(store.tables.orders.get(orderId)?.status).toBe('new');
  store.apply(trip(), dispatcher);
  const created = store.detail(tripId)!;
  expect([created.status, created.order.status, created.vehicle?.status]).toEqual(['assigned', 'in_trip', 'on_trip']);
  expect(store.tables.notifications.filter((n) => n.user_id === driver.id).map((n) => n.title)).toEqual(['Новый рейс']);
  for (const to of ['accepted', 'to_pickup', 'at_pickup', 'loading'] as const) store.apply(go(to), driver);
  expect(fail(store, go('loaded'))).toBe('invalid: Добавьте фото груза после загрузки');
  store.apply(cmd('add_photo', { trip_id: tripId, photo: photo('after_load') }), driver);
  store.apply(go('loaded'), driver);
  expect(store.tables.notifications.filter((n) => n.user_id === client.id).map((n) => n.title)).toEqual(['Груз загружен']);
  for (const to of ['in_transit', 'at_delivery', 'unloading'] as const) store.apply(go(to), driver);
  expect(fail(store, cmd('confirm_delivery', { trip_id: tripId }), client)).toBe('conflict: Рейс не ожидает подтверждения');
  store.apply(handover(), driver);
  const waiting = store.detail(tripId)!;
  expect(waiting.status).toBe('awaiting_confirmation');
  expect(waiting.handover?.receiver_name).toBe('Алексей Смирнов');
  expect(waiting.documents.map((d) => [d.title, d.number])).toEqual([['Накладная', '457']]);
  expect(waiting.photos.map((p) => p.stage)).toEqual(['after_load', 'at_delivery']);
  store.apply(cmd('confirm_delivery', { trip_id: tripId }), client);
  const done = store.detail(tripId)!;
  expect([done.status, done.order.status, done.vehicle?.status, done.handover?.confirmed_by]).toEqual(['completed', 'done', 'free', client.id]);
  expect(done.events.filter((e) => e.type === 'status').map((e) => `${e.from_status ?? '∅'}→${e.to_status}`)).toEqual([
    '∅→assigned', 'assigned→accepted', 'accepted→to_pickup', 'to_pickup→at_pickup', 'at_pickup→loading', 'loading→loaded',
    'loaded→in_transit', 'in_transit→at_delivery', 'at_delivery→unloading', 'unloading→handed_over',
    'handed_over→awaiting_confirmation', 'awaiting_confirmation→delivered', 'delivered→completed']);
  expect(done.events.every((e) => e.created_at && e.actor_id)).toBe(true);
  // Restart: a new store over the same storage replays the journal to the same state.
  const restarted = new DemoStore(storage);
  expect(restarted.detail(tripId)).toEqual(done);
  expect(restarted.tables.notifications).toEqual(store.tables.notifications);
  expect(JSON.parse(storage.get(JOURNAL_KEY)!)).toHaveLength(store.journal.length);
});

test('повтор того же действия и конкурентное подтверждение не создают дубли', () => {
  const store = new DemoStore(memoryStorage());
  store.apply(order(), dispatcher);
  const create = trip();
  store.apply(create, dispatcher);
  store.apply(create, dispatcher);
  expect([...store.tables.trips.values()].filter((t) => t.order_id === orderId)).toHaveLength(1);
  expect(store.tables.notifications.filter((n) => n.user_id === driver.id)).toHaveLength(1);
  const accept = go('accepted');
  store.apply(accept, driver);
  store.apply(accept, driver);
  expect(store.detail(tripId)!.events.filter((e) => e.to_status === 'accepted')).toHaveLength(1);
  expect(fail(store, trip('R-700'), dispatcher)).toBe('conflict: По заказу уже есть рейс');
  for (const to of ['to_pickup', 'at_pickup', 'loading'] as const) store.apply(go(to), driver);
  store.apply(cmd('add_photo', { trip_id: tripId, photo: photo('after_load') }), driver);
  for (const to of ['loaded', 'in_transit', 'at_delivery', 'unloading'] as const) store.apply(go(to), driver);
  store.apply(handover(), driver);
  store.apply(cmd('confirm_delivery', { trip_id: tripId }), client);
  expect(fail(store, cmd('confirm_delivery', { trip_id: tripId }), dispatcher)).toBe('conflict: Рейс не ожидает подтверждения');
  expect(store.detail(tripId)!.events.filter((e) => e.to_status === 'completed')).toHaveLength(1);
});

test('пропуск этапов, чужой доступ и неверные роли отклоняются', () => {
  const store = new DemoStore(memoryStorage());
  store.apply(order(), dispatcher);
  store.apply(trip(), dispatcher);
  expect(fail(store, go('loaded'))).toBe('conflict: Переход assigned → loaded невозможен');
  expect(fail(store, go('accepted'), askhat)).toBe('not_found: Рейс не найден');
  expect(fail(store, go('accepted'), dispatcher)).toBe('forbidden: Статус меняет водитель рейса');
  expect(fail(store, go('accepted'), client)).toBe('forbidden: Статус меняет водитель рейса');
  expect(fail(store, go('accepted'), manager)).toBe('forbidden: Статус меняет водитель рейса');
  expect(fail(store, order(), driver)).toBe('forbidden: Заказ создаёт диспетчер');
  expect(fail(store, cmd('add_photo', { trip_id: tripId, photo: { ...photo('after_load'), storage_path: 'other/after_load/x.jpg' } }))).toBe('invalid: Некорректный путь файла');
  expect(fail(store, cmd('hand_over', { ...handover() }))).toBe('conflict: Передача возможна после начала разгрузки');
  expect(fail(store, cmd('transition', { trip_id: tripId, to: 'handed_over' }))).toBe('conflict: Переход assigned → handed_over невозможен');
  const r648 = data.trips.find((t) => t.number === 'R-648')!;
  expect(fail(store, cmd('transition', { trip_id: r648.id, to: 'at_delivery' }))).toBe('not_found: Рейс не найден');
  expect(fail(store, cmd('transition', { trip_id: r648.id, to: 'at_delivery' }), askhat)).toBe('applied');
});

test('занятая машина, дубль номера и невалидная форма', () => {
  const store = new DemoStore(memoryStorage());
  expect(fail(store, { ...order(), order: { ...order().order, weight_kg: 0 } }, dispatcher)).toBe('invalid: Вес: целое число от 1 до 100 000 кг');
  expect(fail(store, { ...order(), order: { ...order().order, number: 'ЗАКАЗ' } }, dispatcher)).toBe('invalid: Номер заказа в формате CF-1845');
  expect(fail(store, { ...order(), order: { ...order().order, pickup_address: '' } }, dispatcher)).toBe('invalid: Заполните поле «Адрес загрузки»');
  expect(fail(store, { ...order(), order: { ...order().order, number: 'CF-1789' } }, dispatcher)).toBe('conflict: Заказ CF-1789 уже существует');
  store.apply(order(), dispatcher);
  const busy = data.vehicles.find((vehicle) => vehicle.status === 'on_trip')!;
  expect(fail(store, trip('R-642', busy.id), dispatcher)).toBe('conflict: Машина уже занята');
  expect(fail(store, trip('R-648'), dispatcher)).toBe('conflict: Рейс R-648 уже существует');
  expect(store.journal).toHaveLength(1);
});

test('отмена до загрузки освобождает машину и заказ; после загрузки запрещена', () => {
  const store = new DemoStore(memoryStorage());
  store.apply(order(), dispatcher);
  store.apply(trip(), dispatcher);
  expect(fail(store, cmd('cancel_trip', { trip_id: tripId, reason: '' }), dispatcher)).toBe('invalid: Заполните поле «Причина отмены»');
  expect(fail(store, cmd('cancel_trip', { trip_id: tripId, reason: 'Водитель заболел' }), driver)).toBe('forbidden: Рейс отменяет диспетчер');
  store.apply(cmd('cancel_trip', { trip_id: tripId, reason: 'Водитель заболел' }), dispatcher);
  const cancelled = store.detail(tripId)!;
  expect([cancelled.status, cancelled.order.status, cancelled.vehicle?.status]).toEqual(['cancelled', 'new', 'free']);
  expect(cancelled.events.at(-1)?.payload).toEqual({ internal: true, reason: 'Водитель заболел' });
  const second = new DemoStore(memoryStorage());
  second.apply(order(), dispatcher);
  second.apply(trip(), dispatcher);
  for (const to of ['accepted', 'to_pickup', 'at_pickup', 'loading'] as const) second.apply(go(to), driver);
  second.apply(cmd('add_photo', { trip_id: tripId, photo: photo('after_load') }), driver);
  second.apply(go('loaded'), driver);
  expect(fail(second, cmd('cancel_trip', { trip_id: tripId, reason: 'Передумали' }), dispatcher)).toBe('conflict: После загрузки рейс не отменяется');
});

test('задержка: проблема → принятие → новое ETA один раз, клиент без служебных данных', () => {
  const store = new DemoStore(memoryStorage());
  store.apply(order(), dispatcher);
  store.apply(trip(), dispatcher);
  for (const to of ['accepted', 'to_pickup', 'at_pickup', 'loading'] as const) store.apply(go(to), driver);
  store.apply(cmd('add_photo', { trip_id: tripId, photo: photo('after_load') }), driver);
  for (const to of ['loaded', 'in_transit'] as const) store.apply(go(to), driver);
  const problemId = randomUUID();
  const report = () => cmd('report_problem', { trip_id: tripId, problem: { id: problemId, category: 'delay', reason: 'Закрытие дороги',
    comment: 'Движение ограничено, задержка около 90 минут', estimated_delay_min: 90, photo_path: null } });
  expect(fail(store, { ...report(), problem: { ...report().problem, estimated_delay_min: null } })).toBe('invalid: Укажите ожидаемую задержку');
  const sent = report();
  store.apply(sent, driver);
  store.apply(sent, driver);
  expect(store.detail(tripId)!.problems).toHaveLength(1);
  expect(store.detail(tripId)!.delayed).toBe(true);
  expect(store.tables.notifications.filter((n) => n.user_id === dispatcher.id).map((n) => n.title)).toEqual(['Проблема в рейсе R-642']);
  const ack = cmd('acknowledge_problem', { trip_id: tripId, problem_id: problemId, planned_delivery_at: '2026-10-22T14:30:00+05:00' });
  store.apply(ack, dispatcher);
  store.apply(ack, dispatcher);
  expect(fail(store, cmd('acknowledge_problem', { trip_id: tripId, problem_id: problemId, planned_delivery_at: '2026-10-22T16:00:00+05:00' }), dispatcher)).toBe('conflict: Проблема уже принята');
  const delayed = store.detail(tripId)!;
  expect(delayed.current_planned_delivery_at).toBe('2026-10-22T14:30:00+05:00');
  expect(delayed.planned_delivery_at).toBe('2026-10-22T13:00:00+05:00');
  expect(delayed.events.filter((e) => e.type === 'eta_changed')).toHaveLength(1);
  const clientNotes = store.tables.notifications.filter((n) => n.user_id === client.id);
  expect(clientNotes.map((n) => n.title)).toEqual(['Груз загружен', 'Расчётное время доставки изменено']);
  expect(clientNotes[1].body).toBe('Заказ CF-1845: 22 окт, 14:30. Причина: задержка на маршруте');
  expect(clientNotes.some((n) => /дорог/i.test(n.body ?? ''))).toBe(false);
});

test('сдвиг ETA: 13:00 + 90 мин = 14:30, клиентская карточка без служебных событий', async () => {
  const { shiftedEta } = await import('../src/features/attention/eta');
  expect(new Date(shiftedEta('2026-10-22T13:00:00+05:00', 90)).toISOString()).toBe(new Date('2026-10-22T14:30:00+05:00').toISOString());
});
