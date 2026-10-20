import { canTransition, type TripStatus } from './statusMachine';
import type { Row, TripDetail } from './TripRepository';
import { dateTime } from './format';

// One command = one atomic business action. The same rules run in demo mode (this file)
// and on the server (supabase/migrations/*_commands.sql). Keep both in step.

export type Actor = Pick<Row<'profiles'>, 'id' | 'role' | 'company_id'>;
export type OrderInput = Pick<Row<'orders'>, 'id' | 'number' | 'client_company_id' | 'cargo_name' | 'weight_kg'
  | 'places' | 'places_unit' | 'pickup_city' | 'pickup_address' | 'pickup_contact_name' | 'pickup_contact_phone'
  | 'delivery_city' | 'delivery_address' | 'delivery_contact_name' | 'delivery_contact_phone' | 'load_date' | 'desired_delivery_at'>;
export type TripInput = Pick<Row<'trips'>, 'id' | 'number' | 'order_id' | 'driver_id' | 'vehicle_id' | 'depart_date' | 'planned_delivery_at'>;
export type PhotoInput = Pick<Row<'trip_photos'>, 'id' | 'stage' | 'storage_path' | 'taken_at'>;
export type DocumentInput = Pick<Row<'trip_documents'>, 'id' | 'type' | 'title' | 'number' | 'storage_path'>;
export type ProblemInput = Pick<Row<'trip_problems'>, 'id' | 'category' | 'reason' | 'comment' | 'estimated_delay_min' | 'photo_path'>;
export type HandoverInput = { id: string; receiver_name: string; comment: string | null;
  photo: Omit<PhotoInput, 'stage'>; document: DocumentInput | null };

export type Command = { action_id: string; at: string } & (
  | { kind: 'create_order'; order: OrderInput }
  | { kind: 'create_trip'; trip: TripInput }
  | { kind: 'transition'; trip_id: string; to: TripStatus }
  | { kind: 'add_photo'; trip_id: string; photo: PhotoInput }
  | { kind: 'add_document'; trip_id: string; document: DocumentInput }
  | { kind: 'hand_over'; trip_id: string; handover: HandoverInput }
  | { kind: 'confirm_delivery'; trip_id: string }
  | { kind: 'report_problem'; trip_id: string; problem: ProblemInput }
  | { kind: 'acknowledge_problem'; trip_id: string; problem_id: string; planned_delivery_at: string | null }
  | { kind: 'cancel_trip'; trip_id: string; reason: string }
);
export type CommandKind = Command['kind'];
// Command body without envelope, kept per variant.
export type CommandBody = Command extends infer C ? C extends Command ? Omit<C, 'action_id' | 'at'> : never : never;

export class CommandError extends Error {
  constructor(public code: 'forbidden' | 'invalid' | 'conflict' | 'not_found', message: string) {
    super(message);
  }
}

export type Lookup = {
  order(id: string): Row<'orders'> | undefined;
  vehicle(id: string): Row<'vehicles'> | undefined;
  profile(id: string): Row<'profiles'> | undefined;
  company(id: string): Row<'companies'> | undefined;
  numberTaken(kind: 'order' | 'trip', number: string): boolean;
  detail(tripId: string): TripDetail | undefined;
  usersOf(companyId: string, role: Actor['role']): string[];
};

export type Outcome = {
  trip?: TripDetail;
  order?: Row<'orders'>;
  vehicle?: Row<'vehicles'>;
  notifications: Row<'notifications'>[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const ORDER_NUMBER = /^CF-\d{1,6}$/;
export const TRIP_NUMBER = /^R-\d{1,6}$/;
export const ACTIVE: readonly TripStatus[] = ['accepted', 'to_pickup', 'at_pickup', 'loading', 'loaded',
  'in_transit', 'at_delivery', 'unloading'];

export function isUuid(value: unknown): value is string { return typeof value === 'string' && UUID.test(value); }
export function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 10 && Number.isFinite(Date.parse(value));
}
export function isDate(value: unknown): value is string {
  return typeof value === 'string' && DATE.test(value) && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
}
function invalid(message: string): never { throw new CommandError('invalid', message); }
function text(value: unknown, field: string, max: number, required = true): string | null {
  if (value === null || value === undefined || value === '') {
    if (required) invalid(`Заполните поле «${field}»`);
    return null;
  }
  if (typeof value !== 'string' || value.trim().length === 0) invalid(`Заполните поле «${field}»`);
  if (value.length > max) invalid(`«${field}»: не больше ${max} символов`);
  return value.trim();
}
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
// Rows created by one command get ids derived from its action id, so a replay yields the same rows.
export function derivedId(actionId: string, n: number) {
  return actionId.slice(0, 24) + n.toString(16).padStart(12, '0');
}

export function applyCommand(lookup: Lookup, cmd: Command, actor: Actor): Outcome {
  if (!isUuid(cmd.action_id)) invalid('Некорректный идентификатор действия');
  if (!isTimestamp(cmd.at)) invalid('Некорректное время действия');
  let n = 0;
  const notifications: Row<'notifications'>[] = [];
  const notify = (userIds: string[], title: string, body: string, tripId: string) => {
    for (const user_id of userIds) notifications.push({ id: derivedId(cmd.action_id, ++n), user_id, title, body,
      trip_id: tripId, read_at: null, created_at: cmd.at });
  };
  const event = (trip: TripDetail, type: Row<'trip_events'>['type'], patch: Partial<Row<'trip_events'>> = {}) => {
    trip.events.push({ id: derivedId(cmd.action_id, ++n), trip_id: trip.id, type, from_status: null, to_status: null,
      actor_id: actor.id, payload: {}, client_action_id: n === 1 ? cmd.action_id : null, created_at: cmd.at, ...patch });
  };
  const setStatus = (trip: TripDetail, to: TripStatus, payload: Row<'trip_events'>['payload'] = {}) => {
    event(trip, 'status', { from_status: trip.status, to_status: to, payload });
    trip.status = to;
  };
  const clientsOf = (trip: TripDetail) => lookup.usersOf(trip.order.client_company_id, 'client');
  const dispatchersOf = (trip: TripDetail) => lookup.usersOf(trip.order.carrier_company_id, 'dispatcher');
  const isDispatcher = (order: Row<'orders'>) => actor.role === 'dispatcher' && actor.company_id === order.carrier_company_id;
  const isDriver = (trip: TripDetail) => actor.role === 'driver' && trip.driver_id === actor.id;
  const isClient = (order: Row<'orders'>) => actor.role === 'client' && actor.company_id === order.client_company_id;
  const loadTrip = (id: string) => {
    const found = isUuid(id) ? lookup.detail(id) : undefined;
    if (!found || !(isDispatcher(found.order) || isDriver(found) || isClient(found.order)
      || (actor.role === 'manager' && actor.company_id === found.order.carrier_company_id))) {
      throw new CommandError('not_found', 'Рейс не найден');
    }
    return clone(found);
  };
  const mediaPath = (trip: TripDetail, path: unknown, stage: string) => {
    if (typeof path !== 'string' || !path.startsWith(`${trip.id}/${stage}/`) || path.length > 200) invalid('Некорректный путь файла');
    return path;
  };
  const photoRow = (trip: TripDetail, photo: PhotoInput): Row<'trip_photos'> => {
    if (!isUuid(photo.id) || !isTimestamp(photo.taken_at)) invalid('Некорректная фотография');
    if (trip.photos.some((row) => row.id === photo.id)) throw new CommandError('conflict', 'Фотография уже добавлена');
    return { id: photo.id, trip_id: trip.id, stage: photo.stage, storage_path: mediaPath(trip, photo.storage_path, photo.stage),
      taken_at: photo.taken_at, uploaded_by: actor.id };
  };
  const documentRow = (trip: TripDetail, document: DocumentInput): Row<'trip_documents'> => {
    if (!isUuid(document.id)) invalid('Некорректный документ');
    if (trip.documents.some((row) => row.id === document.id)) throw new CommandError('conflict', 'Документ уже добавлен');
    return { id: document.id, trip_id: trip.id, type: document.type, title: text(document.title, 'Название', 80)!,
      number: text(document.number, 'Номер', 40, false), storage_path: mediaPath(trip, document.storage_path, 'documents'),
      status: 'uploaded', uploaded_by: actor.id, created_at: cmd.at };
  };
  const requireActive = (trip: TripDetail) => {
    if (!ACTIVE.includes(trip.status) && trip.status !== 'assigned') {
      throw new CommandError('conflict', 'Рейс уже закрыт');
    }
  };

  switch (cmd.kind) {
    case 'create_order': {
      const input = cmd.order;
      if (actor.role !== 'dispatcher' || !actor.company_id) throw new CommandError('forbidden', 'Заказ создаёт диспетчер');
      if (!isUuid(input.id)) invalid('Некорректный идентификатор заказа');
      const number = text(input.number, 'Номер заказа', 12)!;
      if (!ORDER_NUMBER.test(number)) invalid('Номер заказа в формате CF-1845');
      if (lookup.numberTaken('order', number)) throw new CommandError('conflict', `Заказ ${number} уже существует`);
      const client = isUuid(input.client_company_id) ? lookup.company(input.client_company_id) : undefined;
      if (!client || client.type !== 'client') invalid('Выберите клиента');
      if (!Number.isInteger(input.weight_kg) || input.weight_kg <= 0 || input.weight_kg > 100000) invalid('Вес: целое число от 1 до 100 000 кг');
      if (input.places !== null && (!Number.isInteger(input.places) || input.places <= 0 || input.places > 10000)) invalid('Количество мест: целое число');
      if (!isDate(input.load_date)) invalid('Укажите дату загрузки');
      if (!isTimestamp(input.desired_delivery_at)) invalid('Укажите желаемую доставку');
      if (Date.parse(input.desired_delivery_at) < Date.parse(input.load_date)) invalid('Доставка не может быть раньше загрузки');
      const order: Row<'orders'> = {
        id: input.id, number, carrier_company_id: actor.company_id, client_company_id: input.client_company_id,
        cargo_name: text(input.cargo_name, 'Груз', 120)!, weight_kg: input.weight_kg, places: input.places,
        places_unit: text(input.places_unit, 'Единица', 20, false) ?? 'паллет',
        pickup_city: text(input.pickup_city, 'Город загрузки', 60)!, pickup_address: text(input.pickup_address, 'Адрес загрузки', 200)!,
        pickup_contact_name: text(input.pickup_contact_name, 'Контакт на загрузке', 80, false),
        pickup_contact_phone: text(input.pickup_contact_phone, 'Телефон на загрузке', 30, false),
        delivery_city: text(input.delivery_city, 'Город доставки', 60)!, delivery_address: text(input.delivery_address, 'Адрес доставки', 200)!,
        delivery_contact_name: text(input.delivery_contact_name, 'Контакт на доставке', 80, false),
        delivery_contact_phone: text(input.delivery_contact_phone, 'Телефон на доставке', 30, false),
        load_date: input.load_date, desired_delivery_at: input.desired_delivery_at, status: 'new', created_by: actor.id, created_at: cmd.at,
      };
      return { order, notifications };
    }
    case 'create_trip': {
      const input = cmd.trip;
      const order = isUuid(input.order_id) ? lookup.order(input.order_id) : undefined;
      if (!order || !isDispatcher(order)) throw new CommandError('not_found', 'Заказ не найден');
      if (!isUuid(input.id)) invalid('Некорректный идентификатор рейса');
      if (order.status !== 'new') throw new CommandError('conflict', 'По заказу уже есть рейс');
      const number = text(input.number, 'Номер рейса', 12)!;
      if (!TRIP_NUMBER.test(number)) invalid('Номер рейса в формате R-642');
      if (lookup.numberTaken('trip', number)) throw new CommandError('conflict', `Рейс ${number} уже существует`);
      const driver = isUuid(input.driver_id) ? lookup.profile(input.driver_id) : undefined;
      if (!driver || driver.role !== 'driver' || driver.company_id !== order.carrier_company_id) invalid('Выберите водителя');
      const vehicle = isUuid(input.vehicle_id) ? lookup.vehicle(input.vehicle_id) : undefined;
      if (!vehicle || vehicle.company_id !== order.carrier_company_id) invalid('Выберите машину');
      if (vehicle.status !== 'free') throw new CommandError('conflict', 'Машина уже занята');
      if (!isDate(input.depart_date)) invalid('Укажите дату выезда');
      if (!isTimestamp(input.planned_delivery_at)) invalid('Укажите плановую доставку');
      if (Date.parse(input.planned_delivery_at) < Date.parse(input.depart_date)) invalid('Доставка не может быть раньше выезда');
      const trip: TripDetail = {
        id: input.id, number, order_id: order.id, driver_id: driver.id, vehicle_id: vehicle.id, depart_date: input.depart_date,
        planned_delivery_at: input.planned_delivery_at, current_planned_delivery_at: input.planned_delivery_at, status: 'assigned',
        delayed: false, has_problem: false, accepted_at: null, completed_at: null, created_by: actor.id, created_at: cmd.at,
        order: { ...order, status: 'in_trip' }, events: [], driver: { full_name: driver.full_name, phone: driver.phone },
        vehicle: { ...vehicle, status: 'on_trip' }, photos: [], documents: [], problems: [], handover: null,
      };
      event(trip, 'status', { to_status: 'assigned' });
      notify([driver.id], 'Новый рейс', `${number} ${order.pickup_city} → ${order.delivery_city}. Выезд: ${dateTime(trip.depart_date, 'date')}`, trip.id);
      return { trip, order: trip.order, vehicle: trip.vehicle!, notifications };
    }
    case 'transition': {
      const trip = loadTrip(cmd.trip_id);
      if (!isDriver(trip)) throw new CommandError('forbidden', 'Статус меняет водитель рейса');
      if (['handed_over', 'awaiting_confirmation', 'delivered', 'completed', 'cancelled'].includes(cmd.to) || !canTransition(trip.status, cmd.to)) {
        throw new CommandError('conflict', `Переход ${trip.status} → ${cmd.to} невозможен`);
      }
      if (cmd.to === 'loaded' && !trip.photos.some((photo) => photo.stage === 'after_load')) {
        throw new CommandError('invalid', 'Добавьте фото груза после загрузки');
      }
      setStatus(trip, cmd.to);
      if (cmd.to === 'accepted') trip.accepted_at = cmd.at;
      if (cmd.to === 'loaded') notify(clientsOf(trip), 'Груз загружен', `Заказ ${trip.order.number} отправлен`, trip.id);
      return { trip, notifications };
    }
    case 'add_photo': {
      const trip = loadTrip(cmd.trip_id);
      if (!isDriver(trip)) throw new CommandError('forbidden', 'Фото добавляет водитель рейса');
      requireActive(trip);
      const photo = photoRow(trip, cmd.photo);
      trip.photos.push(photo);
      event(trip, 'photo', { payload: { stage: photo.stage, photo_id: photo.id } });
      return { trip, notifications };
    }
    case 'add_document': {
      const trip = loadTrip(cmd.trip_id);
      if (!isDriver(trip) && !isDispatcher(trip.order)) throw new CommandError('forbidden', 'Документ добавляет водитель или диспетчер');
      if (trip.status === 'cancelled') throw new CommandError('conflict', 'Рейс отменён');
      const document = documentRow(trip, cmd.document);
      trip.documents.push(document);
      event(trip, 'document', { payload: { type: document.type, title: document.title, number: document.number, document_id: document.id } });
      return { trip, notifications };
    }
    case 'hand_over': {
      const trip = loadTrip(cmd.trip_id);
      if (!isDriver(trip)) throw new CommandError('forbidden', 'Груз передаёт водитель рейса');
      if (trip.status !== 'unloading') throw new CommandError('conflict', 'Передача возможна после начала разгрузки');
      const input = cmd.handover;
      if (!isUuid(input.id)) invalid('Некорректная передача');
      const photo = photoRow(trip, { ...input.photo, stage: 'at_delivery' });
      const receiver = text(input.receiver_name, 'Получатель', 80)!;
      const comment = text(input.comment, 'Комментарий', 500, false);
      trip.photos.push(photo);
      event(trip, 'photo', { payload: { stage: photo.stage, photo_id: photo.id } });
      if (input.document) {
        const document = documentRow(trip, input.document);
        trip.documents.push(document);
        event(trip, 'document', { payload: { type: document.type, title: document.title, number: document.number, document_id: document.id } });
      }
      trip.handover = { id: input.id, trip_id: trip.id, receiver_name: receiver, comment, photo_path: photo.storage_path,
        signature_path: null, handed_at: cmd.at, confirmed_by: null, confirmed_at: null };
      event(trip, 'handover', { payload: { receiver_name: receiver, photo_id: photo.id } });
      setStatus(trip, 'handed_over');
      setStatus(trip, 'awaiting_confirmation');
      notify(clientsOf(trip), 'Груз доставлен', `Заказ ${trip.order.number}: подтвердите получение`, trip.id);
      return { trip, notifications };
    }
    case 'confirm_delivery': {
      const trip = loadTrip(cmd.trip_id);
      if (!isClient(trip.order) && !isDispatcher(trip.order)) throw new CommandError('forbidden', 'Получение подтверждает клиент или диспетчер');
      if (trip.status !== 'awaiting_confirmation' || !trip.handover) throw new CommandError('conflict', 'Рейс не ожидает подтверждения');
      trip.handover.confirmed_by = actor.id;
      trip.handover.confirmed_at = cmd.at;
      event(trip, 'confirmation', { payload: { by: actor.role } });
      setStatus(trip, 'delivered');
      setStatus(trip, 'completed');
      trip.completed_at = cmd.at;
      trip.order.status = 'done';
      if (trip.vehicle) trip.vehicle.status = 'free';
      notify([trip.driver_id], 'Доставка подтверждена', `Рейс ${trip.number} завершён`, trip.id);
      return { trip, order: trip.order, vehicle: trip.vehicle ?? undefined, notifications };
    }
    case 'report_problem': {
      const trip = loadTrip(cmd.trip_id);
      if (!isDriver(trip)) throw new CommandError('forbidden', 'О проблеме сообщает водитель рейса');
      requireActive(trip);
      const input = cmd.problem;
      if (!isUuid(input.id)) invalid('Некорректная проблема');
      if (trip.problems.some((row) => row.id === input.id)) throw new CommandError('conflict', 'Проблема уже отправлена');
      const delay = input.estimated_delay_min;
      if (delay !== null && (!Number.isInteger(delay) || delay <= 0 || delay > 24 * 60)) invalid('Задержка: целое число минут до суток');
      if (input.category === 'delay' && delay === null) invalid('Укажите ожидаемую задержку');
      const problem: Row<'trip_problems'> = { id: input.id, trip_id: trip.id, category: input.category,
        reason: text(input.reason, 'Причина', 120)!, comment: text(input.comment, 'Комментарий', 500, false),
        estimated_delay_min: delay, photo_path: input.photo_path === null ? null : mediaPath(trip, input.photo_path, 'problem'),
        status: 'open', reported_by: actor.id, acknowledged_by: null, created_at: cmd.at, resolved_at: null };
      trip.problems.push(problem);
      trip.has_problem = true;
      if (problem.category === 'delay') trip.delayed = true;
      event(trip, 'problem', { payload: { internal: true, category: problem.category, reason: problem.reason, delay, problem_id: problem.id } });
      notify(dispatchersOf(trip), `Проблема в рейсе ${trip.number}`, `Причина: ${problem.reason.toLowerCase()}`, trip.id);
      return { trip, notifications };
    }
    case 'acknowledge_problem': {
      const trip = loadTrip(cmd.trip_id);
      if (!isDispatcher(trip.order)) throw new CommandError('forbidden', 'Проблему принимает диспетчер');
      const problem = trip.problems.find((row) => row.id === cmd.problem_id);
      if (!problem) throw new CommandError('not_found', 'Проблема не найдена');
      if (problem.status !== 'open') throw new CommandError('conflict', 'Проблема уже принята');
      problem.status = 'acknowledged';
      problem.acknowledged_by = actor.id;
      event(trip, 'problem_ack', { payload: { internal: true, problem_id: problem.id } });
      if (cmd.planned_delivery_at !== null) {
        if (!isTimestamp(cmd.planned_delivery_at)) invalid('Укажите новое время доставки');
        if (Date.parse(cmd.planned_delivery_at) < Date.parse(trip.planned_delivery_at)) invalid('Новое время не может быть раньше планового');
        const previous = trip.current_planned_delivery_at;
        trip.current_planned_delivery_at = cmd.planned_delivery_at;
        trip.delayed = true;
        event(trip, 'eta_changed', { payload: { from: previous, to: cmd.planned_delivery_at } });
        notify(clientsOf(trip), 'Расчётное время доставки изменено',
          `Заказ ${trip.order.number}: ${dateTime(cmd.planned_delivery_at)}. Причина: задержка на маршруте`, trip.id);
      }
      return { trip, notifications };
    }
    case 'cancel_trip': {
      const trip = loadTrip(cmd.trip_id);
      if (!isDispatcher(trip.order)) throw new CommandError('forbidden', 'Рейс отменяет диспетчер');
      if (!canTransition(trip.status, 'cancelled')) throw new CommandError('conflict', 'После загрузки рейс не отменяется');
      const reason = text(cmd.reason, 'Причина отмены', 200)!;
      setStatus(trip, 'cancelled', { internal: true, reason });
      trip.order.status = 'new';
      if (trip.vehicle) trip.vehicle.status = 'free';
      notify([trip.driver_id], 'Рейс отменён', `${trip.number} ${trip.order.pickup_city} → ${trip.order.delivery_city}`, trip.id);
      return { trip, order: trip.order, vehicle: trip.vehicle ?? undefined, notifications };
    }
  }
}
