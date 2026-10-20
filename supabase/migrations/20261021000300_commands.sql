-- Every business change goes through apply_command(): one transaction, actor from Auth,
-- status graph, mandatory attachments, idempotency by action id, derived rows and notifications.
-- Mirrors app/src/domain/commands.ts. Direct table writes are closed below.

create table public.command_log (
  action_id uuid primary key,
  actor_id uuid not null references public.profiles(id),
  kind text not null,
  trip_id uuid,
  created_at timestamptz not null default now()
);
alter table public.command_log enable row level security;
revoke all on public.command_log from anon, authenticated;

-- Derived writes used to come from triggers; the RPC writes them explicitly.
drop trigger if exists trips_status_changed_trg on public.trips;
drop trigger if exists trips_assigned_trg on public.trips;
drop trigger if exists problem_reported_trg on public.trip_problems;
drop function if exists public.trips_status_changed();
drop function if exists public.trips_assigned();
drop function if exists public.problem_reported();

drop policy if exists orders_insert on public.orders;
drop policy if exists orders_update on public.orders;
drop policy if exists trips_insert on public.trips;
drop policy if exists trips_update on public.trips;
drop policy if exists events_insert on public.trip_events;
drop policy if exists photos_insert on public.trip_photos;
drop policy if exists documents_insert on public.trip_documents;
drop policy if exists problems_insert on public.trip_problems;
drop policy if exists problems_update on public.trip_problems;
drop policy if exists handovers_insert on public.handovers;
drop policy if exists handovers_confirm on public.handovers;
revoke insert, update on public.orders, public.trips, public.trip_events, public.trip_photos,
  public.trip_documents, public.trip_problems, public.handovers from authenticated;

-- ---------- helpers ----------
create function private.cmd_text(value jsonb, field text, max int, required boolean default true) returns text
language plpgsql immutable as $$
declare s text;
begin
  if value is null or jsonb_typeof(value) = 'null' or value = '""'::jsonb then
    if required then raise exception 'Заполните поле «%»', field using errcode = 'CF400'; end if;
    return null;
  end if;
  if jsonb_typeof(value) <> 'string' then raise exception 'Заполните поле «%»', field using errcode = 'CF400'; end if;
  s := value #>> '{}';
  if length(btrim(s)) = 0 then raise exception 'Заполните поле «%»', field using errcode = 'CF400'; end if;
  if length(s) > max then raise exception '«%»: не больше % символов', field, max using errcode = 'CF400'; end if;
  return btrim(s);
end $$;

create function private.cmd_uuid(value jsonb, message text) returns uuid
language plpgsql immutable as $$
begin
  return (value #>> '{}')::uuid;
exception when others then raise exception '%', message using errcode = 'CF400';
end $$;

create function private.cmd_time(value jsonb, message text) returns timestamptz
language plpgsql immutable as $$
begin
  if value is null or jsonb_typeof(value) <> 'string' then raise exception '%', message using errcode = 'CF400'; end if;
  return (value #>> '{}')::timestamptz;
exception when others then raise exception '%', message using errcode = 'CF400';
end $$;

create function private.cmd_date(value jsonb, message text) returns date
language plpgsql immutable as $$
begin
  if value is null or jsonb_typeof(value) <> 'string' or (value #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception '%', message using errcode = 'CF400';
  end if;
  return (value #>> '{}')::date;
exception when others then raise exception '%', message using errcode = 'CF400';
end $$;

create function private.cmd_int(value jsonb, field text, lo int, hi int, required boolean) returns int
language plpgsql immutable as $$
declare n numeric;
begin
  if value is null or jsonb_typeof(value) = 'null' then
    if required then raise exception '%', field using errcode = 'CF400'; end if;
    return null;
  end if;
  if jsonb_typeof(value) <> 'number' then raise exception '%', field using errcode = 'CF400'; end if;
  n := (value #>> '{}')::numeric;
  if n <> trunc(n) or n < lo or n > hi then raise exception '%', field using errcode = 'CF400'; end if;
  return n::int;
end $$;

-- Media must already be in the private bucket under the trip's own folder.
create function private.cmd_media(trip uuid, value jsonb, stage text) returns text
language plpgsql set search_path = '' as $$
declare path text := value #>> '{}';
begin
  if path is null or length(path) > 200 or position(trip::text || '/' || stage || '/' in path) <> 1 then
    raise exception 'Некорректный путь файла' using errcode = 'CF400';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'trip-media' and name = path) then
    raise exception 'Файл не загружен' using errcode = 'CF400';
  end if;
  return path;
end $$;

create function private.cmd_event(trip uuid, kind public.event_type, from_s public.trip_status, to_s public.trip_status,
  actor uuid, payload jsonb, action uuid) returns void
language sql set search_path = '' as $$
  insert into public.trip_events(trip_id, type, from_status, to_status, actor_id, payload, client_action_id, created_at)
  values (trip, kind, from_s, to_s, actor, coalesce(payload, '{}'::jsonb), action, clock_timestamp());
$$;

create function private.cmd_notify(company uuid, who public.user_role, title text, body text, trip uuid) returns void
language sql set search_path = '' as $$
  insert into public.notifications(user_id, title, body, trip_id)
  select id, title, body, trip from public.profiles where company_id = company and role = who;
$$;

create function private.cmd_next(status public.trip_status) returns public.trip_status
language sql immutable as $$
  select case status
    when 'assigned' then 'accepted' when 'accepted' then 'to_pickup' when 'to_pickup' then 'at_pickup'
    when 'at_pickup' then 'loading' when 'loading' then 'loaded' when 'loaded' then 'in_transit'
    when 'in_transit' then 'at_delivery' when 'at_delivery' then 'unloading' when 'unloading' then 'handed_over'
    when 'handed_over' then 'awaiting_confirmation' when 'awaiting_confirmation' then 'delivered'
    when 'delivered' then 'completed' else null end::public.trip_status;
$$;

create function private.cmd_fmt(value timestamptz) returns text
language sql immutable as $$
  select to_char(value at time zone 'Asia/Almaty', 'DD') || ' ' ||
    (array['янв','февр','мар','апр','мая','июн','июл','авг','сент','окт','нояб','дек'])[extract(month from value at time zone 'Asia/Almaty')::int]
    || ', ' || to_char(value at time zone 'Asia/Almaty', 'HH24:MI');
$$;

-- ---------- the command ----------
create function public.apply_command(command jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor public.profiles;
  kind text := command->>'kind';
  action uuid;
  x jsonb;
  t public.trips;
  o public.orders;
  v public.vehicles;
  d public.profiles;
  c public.companies;
  p public.trip_problems;
  h public.handovers;
  next_status public.trip_status;
  to_status public.trip_status;
  num text;
  photo_id uuid;
  doc_id uuid;
  path text;
  new_eta timestamptz;
  active constant public.trip_status[] := array['assigned','accepted','to_pickup','at_pickup','loading','loaded','in_transit','at_delivery','unloading']::public.trip_status[];
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null then raise exception 'Нет доступа' using errcode = 'CF403'; end if;
  action := private.cmd_uuid(command->'action_id', 'Некорректный идентификатор действия');
  insert into public.command_log(action_id, actor_id, kind) values (action, actor.id, kind) on conflict (action_id) do nothing;
  if not found then return jsonb_build_object('status', 'duplicate'); end if;

  if kind in ('transition','add_photo','add_document','hand_over','confirm_delivery','report_problem','acknowledge_problem','cancel_trip') then
    select * into t from public.trips where id = private.cmd_uuid(command->'trip_id', 'Рейс не найден') for update;
    if t.id is not null then select * into o from public.orders where id = t.order_id for update; end if;
    if t.id is null or not ((actor.role = 'dispatcher' and actor.company_id = o.carrier_company_id)
        or (actor.role = 'driver' and t.driver_id = actor.id)
        or (actor.role = 'client' and actor.company_id = o.client_company_id)
        or (actor.role = 'manager' and actor.company_id = o.carrier_company_id)) then
      raise exception 'Рейс не найден' using errcode = 'CF404';
    end if;
    update public.command_log set trip_id = t.id where action_id = action;
  end if;

  case kind
  when 'create_order' then
    x := command->'order';
    if actor.role <> 'dispatcher' or actor.company_id is null then raise exception 'Заказ создаёт диспетчер' using errcode = 'CF403'; end if;
    num := private.cmd_text(x->'number', 'Номер заказа', 12);
    if num !~ '^CF-\d{1,6}$' then raise exception 'Номер заказа в формате CF-1845' using errcode = 'CF400'; end if;
    if exists (select 1 from public.orders where number = num) then raise exception 'Заказ % уже существует', num using errcode = 'CF409'; end if;
    select * into c from public.companies where id = private.cmd_uuid(x->'client_company_id', 'Выберите клиента');
    if c.id is null or c.type <> 'client' then raise exception 'Выберите клиента' using errcode = 'CF400'; end if;
    insert into public.orders(id, number, carrier_company_id, client_company_id, cargo_name, weight_kg, places, places_unit,
      pickup_city, pickup_address, pickup_contact_name, pickup_contact_phone, delivery_city, delivery_address,
      delivery_contact_name, delivery_contact_phone, load_date, desired_delivery_at, status, created_by)
    values (private.cmd_uuid(x->'id', 'Некорректный идентификатор заказа'), num, actor.company_id, c.id,
      private.cmd_text(x->'cargo_name', 'Груз', 120),
      private.cmd_int(x->'weight_kg', 'Вес: целое число от 1 до 100 000 кг', 1, 100000, true),
      private.cmd_int(x->'places', 'Количество мест: целое число', 1, 10000, false),
      coalesce(private.cmd_text(x->'places_unit', 'Единица', 20, false), 'паллет'),
      private.cmd_text(x->'pickup_city', 'Город загрузки', 60), private.cmd_text(x->'pickup_address', 'Адрес загрузки', 200),
      private.cmd_text(x->'pickup_contact_name', 'Контакт на загрузке', 80, false), private.cmd_text(x->'pickup_contact_phone', 'Телефон на загрузке', 30, false),
      private.cmd_text(x->'delivery_city', 'Город доставки', 60), private.cmd_text(x->'delivery_address', 'Адрес доставки', 200),
      private.cmd_text(x->'delivery_contact_name', 'Контакт на доставке', 80, false), private.cmd_text(x->'delivery_contact_phone', 'Телефон на доставке', 30, false),
      private.cmd_date(x->'load_date', 'Укажите дату загрузки'), private.cmd_time(x->'desired_delivery_at', 'Укажите желаемую доставку'), 'new', actor.id)
    returning * into o;
    if o.desired_delivery_at < o.load_date::timestamptz then raise exception 'Доставка не может быть раньше загрузки' using errcode = 'CF400'; end if;
    return jsonb_build_object('status', 'ok', 'order_id', o.id);

  when 'create_trip' then
    x := command->'trip';
    select * into o from public.orders where id = private.cmd_uuid(x->'order_id', 'Заказ не найден') for update;
    if o.id is null or actor.role <> 'dispatcher' or actor.company_id <> o.carrier_company_id then raise exception 'Заказ не найден' using errcode = 'CF404'; end if;
    if o.status <> 'new' then raise exception 'По заказу уже есть рейс' using errcode = 'CF409'; end if;
    num := private.cmd_text(x->'number', 'Номер рейса', 12);
    if num !~ '^R-\d{1,6}$' then raise exception 'Номер рейса в формате R-642' using errcode = 'CF400'; end if;
    if exists (select 1 from public.trips where number = num) then raise exception 'Рейс % уже существует', num using errcode = 'CF409'; end if;
    select * into d from public.profiles where id = private.cmd_uuid(x->'driver_id', 'Выберите водителя');
    if d.id is null or d.role <> 'driver' or d.company_id <> o.carrier_company_id then raise exception 'Выберите водителя' using errcode = 'CF400'; end if;
    select * into v from public.vehicles where id = private.cmd_uuid(x->'vehicle_id', 'Выберите машину') for update;
    if v.id is null or v.company_id <> o.carrier_company_id then raise exception 'Выберите машину' using errcode = 'CF400'; end if;
    if v.status <> 'free' then raise exception 'Машина уже занята' using errcode = 'CF409'; end if;
    insert into public.trips(id, number, order_id, driver_id, vehicle_id, depart_date, planned_delivery_at, current_planned_delivery_at, status, created_by)
    values (private.cmd_uuid(x->'id', 'Некорректный идентификатор рейса'), num, o.id, d.id, v.id,
      private.cmd_date(x->'depart_date', 'Укажите дату выезда'), private.cmd_time(x->'planned_delivery_at', 'Укажите плановую доставку'),
      private.cmd_time(x->'planned_delivery_at', 'Укажите плановую доставку'), 'assigned', actor.id)
    returning * into t;
    if t.planned_delivery_at < t.depart_date::timestamptz then raise exception 'Доставка не может быть раньше выезда' using errcode = 'CF400'; end if;
    update public.command_log set trip_id = t.id where action_id = action;
    perform private.cmd_event(t.id, 'status', null, 'assigned', actor.id, '{}', action);
    update public.orders set status = 'in_trip' where id = o.id;
    update public.vehicles set status = 'on_trip' where id = v.id;
    insert into public.notifications(user_id, title, body, trip_id) values (d.id, 'Новый рейс',
      num || ' ' || o.pickup_city || ' → ' || o.delivery_city || '. Выезд: ' || split_part(private.cmd_fmt(t.depart_date::timestamptz), ',', 1), t.id);
    return jsonb_build_object('status', 'ok', 'trip_id', t.id);

  when 'transition' then
    if actor.role <> 'driver' or t.driver_id <> actor.id then raise exception 'Статус меняет водитель рейса' using errcode = 'CF403'; end if;
    begin to_status := (command->>'to')::public.trip_status; exception when others then raise exception 'Некорректный статус' using errcode = 'CF400'; end;
    if to_status in ('handed_over','awaiting_confirmation','delivered','completed','cancelled') or private.cmd_next(t.status) is distinct from to_status then
      raise exception 'Переход % → % невозможен', t.status, to_status using errcode = 'CF409';
    end if;
    if to_status = 'loaded' and not exists (select 1 from public.trip_photos where trip_id = t.id and stage = 'after_load') then
      raise exception 'Добавьте фото груза после загрузки' using errcode = 'CF400';
    end if;
    perform private.cmd_event(t.id, 'status', t.status, to_status, actor.id, '{}', action);
    update public.trips set status = to_status, accepted_at = case when to_status = 'accepted' then now() else accepted_at end where id = t.id;
    if to_status = 'loaded' then perform private.cmd_notify(o.client_company_id, 'client', 'Груз загружен', 'Заказ ' || o.number || ' отправлен', t.id); end if;
    return jsonb_build_object('status', 'ok', 'trip_id', t.id);

  when 'add_photo' then
    x := command->'photo';
    if actor.role <> 'driver' or t.driver_id <> actor.id then raise exception 'Фото добавляет водитель рейса' using errcode = 'CF403'; end if;
    if not (t.status = any(active)) then raise exception 'Рейс уже закрыт' using errcode = 'CF409'; end if;
    photo_id := private.cmd_uuid(x->'id', 'Некорректная фотография');
    if exists (select 1 from public.trip_photos where id = photo_id) then raise exception 'Фотография уже добавлена' using errcode = 'CF409'; end if;
    insert into public.trip_photos(id, trip_id, stage, storage_path, taken_at, uploaded_by)
    values (photo_id, t.id, (x->>'stage')::public.photo_stage, private.cmd_media(t.id, x->'storage_path', x->>'stage'),
      private.cmd_time(x->'taken_at', 'Некорректная фотография'), actor.id);
    perform private.cmd_event(t.id, 'photo', null, null, actor.id, jsonb_build_object('stage', x->>'stage', 'photo_id', photo_id), action);
    return jsonb_build_object('status', 'ok', 'trip_id', t.id);

  when 'add_document' then
    x := command->'document';
    if not ((actor.role = 'driver' and t.driver_id = actor.id) or (actor.role = 'dispatcher' and actor.company_id = o.carrier_company_id)) then
      raise exception 'Документ добавляет водитель или диспетчер' using errcode = 'CF403';
    end if;
    if t.status = 'cancelled' then raise exception 'Рейс отменён' using errcode = 'CF409'; end if;
    doc_id := private.cmd_uuid(x->'id', 'Некорректный документ');
    if exists (select 1 from public.trip_documents where id = doc_id) then raise exception 'Документ уже добавлен' using errcode = 'CF409'; end if;
    insert into public.trip_documents(id, trip_id, type, title, number, storage_path, uploaded_by)
    values (doc_id, t.id, (x->>'type')::public.document_type, private.cmd_text(x->'title', 'Название', 80),
      private.cmd_text(x->'number', 'Номер', 40, false), private.cmd_media(t.id, x->'storage_path', 'documents'), actor.id);
    perform private.cmd_event(t.id, 'document', null, null, actor.id,
      jsonb_build_object('type', x->>'type', 'title', btrim(x->>'title'), 'number', x->'number', 'document_id', doc_id), action);
    return jsonb_build_object('status', 'ok', 'trip_id', t.id);

  when 'hand_over' then
    x := command->'handover';
    if actor.role <> 'driver' or t.driver_id <> actor.id then raise exception 'Груз передаёт водитель рейса' using errcode = 'CF403'; end if;
    if t.status <> 'unloading' then raise exception 'Передача возможна после начала разгрузки' using errcode = 'CF409'; end if;
    photo_id := private.cmd_uuid(x->'photo'->'id', 'Некорректная фотография');
    if exists (select 1 from public.trip_photos where id = photo_id) then raise exception 'Фотография уже добавлена' using errcode = 'CF409'; end if;
    path := private.cmd_media(t.id, x->'photo'->'storage_path', 'at_delivery');
    insert into public.trip_photos(id, trip_id, stage, storage_path, taken_at, uploaded_by)
    values (photo_id, t.id, 'at_delivery', path, private.cmd_time(x->'photo'->'taken_at', 'Некорректная фотография'), actor.id);
    perform private.cmd_event(t.id, 'photo', null, null, actor.id, jsonb_build_object('stage', 'at_delivery', 'photo_id', photo_id), action);
    if x->'document' is not null and jsonb_typeof(x->'document') = 'object' then
      doc_id := private.cmd_uuid(x->'document'->'id', 'Некорректный документ');
      if exists (select 1 from public.trip_documents where id = doc_id) then raise exception 'Документ уже добавлен' using errcode = 'CF409'; end if;
      insert into public.trip_documents(id, trip_id, type, title, number, storage_path, uploaded_by)
      values (doc_id, t.id, (x->'document'->>'type')::public.document_type, private.cmd_text(x->'document'->'title', 'Название', 80),
        private.cmd_text(x->'document'->'number', 'Номер', 40, false), private.cmd_media(t.id, x->'document'->'storage_path', 'documents'), actor.id);
      perform private.cmd_event(t.id, 'document', null, null, actor.id,
        jsonb_build_object('type', x->'document'->>'type', 'title', btrim(x->'document'->>'title'), 'number', x->'document'->'number', 'document_id', doc_id), null);
    end if;
    insert into public.handovers(id, trip_id, receiver_name, comment, photo_path)
    values (private.cmd_uuid(x->'id', 'Некорректная передача'), t.id, private.cmd_text(x->'receiver_name', 'Получатель', 80),
      private.cmd_text(x->'comment', 'Комментарий', 500, false), path) returning * into h;
    perform private.cmd_event(t.id, 'handover', null, null, actor.id, jsonb_build_object('receiver_name', h.receiver_name, 'photo_id', photo_id), null);
    perform private.cmd_event(t.id, 'status', 'unloading', 'handed_over', actor.id, '{}', null);
    perform private.cmd_event(t.id, 'status', 'handed_over', 'awaiting_confirmation', actor.id, '{}', null);
    update public.trips set status = 'awaiting_confirmation' where id = t.id;
    perform private.cmd_notify(o.client_company_id, 'client', 'Груз доставлен', 'Заказ ' || o.number || ': подтвердите получение', t.id);
    return jsonb_build_object('status', 'ok', 'trip_id', t.id);

  when 'confirm_delivery' then
    if not ((actor.role = 'client' and actor.company_id = o.client_company_id) or (actor.role = 'dispatcher' and actor.company_id = o.carrier_company_id)) then
      raise exception 'Получение подтверждает клиент или диспетчер' using errcode = 'CF403';
    end if;
    select * into h from public.handovers where trip_id = t.id for update;
    if t.status <> 'awaiting_confirmation' or h.id is null then raise exception 'Рейс не ожидает подтверждения' using errcode = 'CF409'; end if;
    update public.handovers set confirmed_by = actor.id, confirmed_at = now() where id = h.id;
    perform private.cmd_event(t.id, 'confirmation', null, null, actor.id, jsonb_build_object('by', actor.role), action);
    perform private.cmd_event(t.id, 'status', 'awaiting_confirmation', 'delivered', actor.id, '{}', null);
    perform private.cmd_event(t.id, 'status', 'delivered', 'completed', actor.id, '{}', null);
    update public.trips set status = 'completed', completed_at = now() where id = t.id;
    update public.orders set status = 'done' where id = o.id;
    update public.vehicles set status = 'free' where id = t.vehicle_id;
    insert into public.notifications(user_id, title, body, trip_id) values (t.driver_id, 'Доставка подтверждена', 'Рейс ' || t.number || ' завершён', t.id);
    return jsonb_build_object('status', 'ok', 'trip_id', t.id);

  when 'report_problem' then
    x := command->'problem';
    if actor.role <> 'driver' or t.driver_id <> actor.id then raise exception 'О проблеме сообщает водитель рейса' using errcode = 'CF403'; end if;
    if not (t.status = any(active)) then raise exception 'Рейс уже закрыт' using errcode = 'CF409'; end if;
    if exists (select 1 from public.trip_problems where id = private.cmd_uuid(x->'id', 'Некорректная проблема')) then
      raise exception 'Проблема уже отправлена' using errcode = 'CF409';
    end if;
    if x->>'category' = 'delay' and (x->'estimated_delay_min' is null or jsonb_typeof(x->'estimated_delay_min') = 'null') then
      raise exception 'Укажите ожидаемую задержку' using errcode = 'CF400';
    end if;
    insert into public.trip_problems(id, trip_id, category, reason, comment, estimated_delay_min, photo_path, reported_by)
    values ((x->>'id')::uuid, t.id, (x->>'category')::public.problem_category, private.cmd_text(x->'reason', 'Причина', 120),
      private.cmd_text(x->'comment', 'Комментарий', 500, false), private.cmd_int(x->'estimated_delay_min', 'Задержка: целое число минут до суток', 1, 1440, false),
      case when x->'photo_path' is null or jsonb_typeof(x->'photo_path') = 'null' then null else private.cmd_media(t.id, x->'photo_path', 'problem') end, actor.id)
    returning * into p;
    update public.trips set has_problem = true, delayed = delayed or p.category = 'delay' where id = t.id;
    perform private.cmd_event(t.id, 'problem', null, null, actor.id, jsonb_build_object('internal', true, 'category', p.category,
      'reason', p.reason, 'delay', p.estimated_delay_min, 'problem_id', p.id), action);
    perform private.cmd_notify(o.carrier_company_id, 'dispatcher', 'Проблема в рейсе ' || t.number, 'Причина: ' || lower(p.reason), t.id);
    return jsonb_build_object('status', 'ok', 'trip_id', t.id);

  when 'acknowledge_problem' then
    if actor.role <> 'dispatcher' or actor.company_id <> o.carrier_company_id then raise exception 'Проблему принимает диспетчер' using errcode = 'CF403'; end if;
    select * into p from public.trip_problems where id = private.cmd_uuid(command->'problem_id', 'Проблема не найдена') and trip_id = t.id for update;
    if p.id is null then raise exception 'Проблема не найдена' using errcode = 'CF404'; end if;
    if p.status <> 'open' then raise exception 'Проблема уже принята' using errcode = 'CF409'; end if;
    update public.trip_problems set status = 'acknowledged', acknowledged_by = actor.id where id = p.id;
    perform private.cmd_event(t.id, 'problem_ack', null, null, actor.id, jsonb_build_object('internal', true, 'problem_id', p.id), action);
    if command->'planned_delivery_at' is not null and jsonb_typeof(command->'planned_delivery_at') <> 'null' then
      new_eta := private.cmd_time(command->'planned_delivery_at', 'Укажите новое время доставки');
      if new_eta < t.planned_delivery_at then raise exception 'Новое время не может быть раньше планового' using errcode = 'CF400'; end if;
      perform private.cmd_event(t.id, 'eta_changed', null, null, actor.id, jsonb_build_object('from', t.current_planned_delivery_at, 'to', new_eta), null);
      update public.trips set current_planned_delivery_at = new_eta, delayed = true where id = t.id;
      perform private.cmd_notify(o.client_company_id, 'client', 'Расчётное время доставки изменено',
        'Заказ ' || o.number || ': ' || private.cmd_fmt(new_eta) || '. Причина: задержка на маршруте', t.id);
    end if;
    return jsonb_build_object('status', 'ok', 'trip_id', t.id);

  when 'cancel_trip' then
    if actor.role <> 'dispatcher' or actor.company_id <> o.carrier_company_id then raise exception 'Рейс отменяет диспетчер' using errcode = 'CF403'; end if;
    if t.status not in ('assigned','accepted','to_pickup','at_pickup','loading') then raise exception 'После загрузки рейс не отменяется' using errcode = 'CF409'; end if;
    perform private.cmd_event(t.id, 'status', t.status, 'cancelled', actor.id,
      jsonb_build_object('internal', true, 'reason', private.cmd_text(command->'reason', 'Причина отмены', 200)), action);
    update public.trips set status = 'cancelled' where id = t.id;
    update public.orders set status = 'new' where id = o.id;
    update public.vehicles set status = 'free' where id = t.vehicle_id;
    insert into public.notifications(user_id, title, body, trip_id) values (t.driver_id, 'Рейс отменён', t.number || ' ' || o.pickup_city || ' → ' || o.delivery_city, t.id);
    return jsonb_build_object('status', 'ok', 'trip_id', t.id);

  else
    raise exception 'Неизвестная команда' using errcode = 'CF400';
  end case;
end $$;

-- Only the RLS helpers stay callable by users; cmd_* run inside the definer function.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.staff(uuid), private.dispatcher(uuid), private.read_order(uuid), private.read_trip(uuid),
  private.write_trip(uuid), private.dispatch_trip(uuid), private.media_trip(text), private.guard_trip_update() to authenticated;
revoke execute on function public.apply_command(jsonb) from public, anon;
grant execute on function public.apply_command(jsonb) to authenticated;
