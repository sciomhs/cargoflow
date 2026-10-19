-- CargoFlow — схема Supabase (Postgres). Применять: supabase db push / SQL editor.
-- Источник истины для src/domain/types.ts (supabase gen types typescript).

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type user_role as enum ('dispatcher','driver','client','manager');
create type company_type as enum ('carrier','client');
create type vehicle_status as enum ('free','on_trip','service');
create type order_status as enum ('new','in_trip','done','cancelled');
create type trip_status as enum (
  'assigned','accepted','to_pickup','at_pickup','loading','loaded','in_transit',
  'at_delivery','unloading','handed_over','awaiting_confirmation','delivered','completed','cancelled'
);
create type event_type as enum ('status','photo','document','problem','problem_ack','note','eta_changed','handover','confirmation');
create type photo_stage as enum ('before_load','after_load','at_delivery','problem');
create type document_type as enum ('waybill','act','power_of_attorney','signed_receipt','other');
create type problem_category as enum ('delay','breakdown','cargo','road','other');
create type problem_status as enum ('open','acknowledged','resolved');

-- ---------- core ----------
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type company_type not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role user_role not null,
  company_id uuid references companies(id),
  created_at timestamptz not null default now()
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  make_model text not null,          -- 'Volvo FH'
  plate text not null,               -- '777 ABC 14'
  capacity_kg integer,
  status vehicle_status not null default 'free'
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,       -- 'CF-1845'
  carrier_company_id uuid not null references companies(id),
  client_company_id uuid not null references companies(id),
  cargo_name text not null,
  weight_kg integer not null,
  places integer,                    -- 12 паллет
  places_unit text default 'паллет',
  pickup_city text not null,
  pickup_address text not null,
  pickup_contact_name text,
  pickup_contact_phone text,
  delivery_city text not null,
  delivery_address text not null,
  delivery_contact_name text,
  delivery_contact_phone text,
  load_date date not null,
  desired_delivery_at timestamptz not null,
  status order_status not null default 'new',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table trips (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,       -- 'R-642'
  order_id uuid not null references orders(id),
  driver_id uuid not null references profiles(id),
  vehicle_id uuid not null references vehicles(id),
  depart_date date not null,
  planned_delivery_at timestamptz not null,
  current_planned_delivery_at timestamptz not null,
  status trip_status not null default 'assigned',
  delayed boolean not null default false,
  has_problem boolean not null default false,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index trips_driver_idx on trips(driver_id, status);
create index trips_status_idx on trips(status);

-- Неизменяемый лог. Таймлайн, история рейса и уведомления строятся из него.
create table trip_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  type event_type not null,
  from_status trip_status,
  to_status trip_status,
  actor_id uuid references profiles(id),
  payload jsonb not null default '{}'::jsonb,   -- {"internal": true} скрывает от клиента
  client_action_id uuid unique,                  -- идемпотентность outbox
  created_at timestamptz not null default now()
);
create index trip_events_trip_idx on trip_events(trip_id, created_at);

create table trip_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  stage photo_stage not null,
  storage_path text not null,        -- trip-media/{trip}/{stage}/{uuid}.jpg
  taken_at timestamptz not null default now(),
  uploaded_by uuid references profiles(id)
);

create table trip_documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  type document_type not null,
  title text not null,               -- 'Накладная'
  number text,                       -- '457'
  storage_path text not null,
  status text not null default 'uploaded',
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table trip_problems (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  category problem_category not null,
  reason text not null,              -- 'Закрытие дороги'
  comment text,
  estimated_delay_min integer,
  photo_path text,
  status problem_status not null default 'open',
  reported_by uuid references profiles(id),
  acknowledged_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table handovers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references trips(id) on delete cascade,
  receiver_name text not null,
  comment text,
  photo_path text,
  signature_path text,
  handed_at timestamptz not null default now(),
  confirmed_by uuid references profiles(id),
  confirmed_at timestamptz
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  trip_id uuid references trips(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, read_at);

-- ---------- триггер: смена статуса пишет событие и уведомления ----------
create or replace function trips_status_changed() returns trigger language plpgsql as $$
declare
  client_user uuid;
  dispatcher_user uuid;
begin
  if new.status is distinct from old.status then
    insert into trip_events(trip_id, type, from_status, to_status, actor_id)
    values (new.id, 'status', old.status, new.status, auth.uid());

    if new.status = 'handed_over' then
      new.status := 'awaiting_confirmation';
    end if;
    if new.status = 'delivered' then
      update orders set status = 'done' where id = new.order_id;
      update vehicles set status = 'free' where id = new.vehicle_id;
      new.completed_at := now();
    end if;

    select p.id into client_user from profiles p
      join orders o on o.client_company_id = p.company_id
      where o.id = new.order_id and p.role = 'client' limit 1;

    if new.status = 'loaded' and client_user is not null then
      insert into notifications(user_id, title, body, trip_id)
      values (client_user, 'Груз загружен', 'Заказ отправлен', new.id);
    end if;
    if new.status = 'awaiting_confirmation' and client_user is not null then
      insert into notifications(user_id, title, body, trip_id)
      values (client_user, 'Груз доставлен', 'Пожалуйста, подтвердите получение', new.id);
    end if;
  end if;
  return new;
end $$;

create trigger trips_status_changed_trg
  before update on trips for each row execute function trips_status_changed();

create or replace function trips_assigned() returns trigger language plpgsql as $$
begin
  insert into trip_events(trip_id, type, to_status, actor_id)
  values (new.id, 'status', 'assigned', auth.uid());
  insert into notifications(user_id, title, body, trip_id)
  values (new.driver_id, 'Новый рейс', 'Вам назначен новый рейс ' || new.number, new.id);
  update vehicles set status = 'on_trip' where id = new.vehicle_id;
  update orders set status = 'in_trip' where id = new.order_id;
  return new;
end $$;
create trigger trips_assigned_trg after insert on trips for each row execute function trips_assigned();

create or replace function problem_reported() returns trigger language plpgsql as $$
declare d uuid;
begin
  update trips set has_problem = true, delayed = (new.category = 'delay') or delayed where id = new.trip_id;
  insert into trip_events(trip_id, type, actor_id, payload)
  values (new.trip_id, 'problem', new.reported_by, jsonb_build_object('category', new.category, 'reason', new.reason, 'delay', new.estimated_delay_min));
  for d in select id from profiles where role = 'dispatcher' loop
    insert into notifications(user_id, title, body, trip_id)
    values (d, 'Проблема в рейсе', new.reason, new.trip_id);
  end loop;
  return new;
end $$;
create trigger problem_reported_trg after insert on trip_problems for each row execute function problem_reported();

-- ---------- RLS (упрощённо; доработать в T-04) ----------
alter table profiles enable row level security;
alter table orders enable row level security;
alter table trips enable row level security;
alter table trip_events enable row level security;
alter table trip_photos enable row level security;
alter table trip_documents enable row level security;
alter table trip_problems enable row level security;
alter table handovers enable row level security;
alter table notifications enable row level security;

create or replace function my_role() returns user_role language sql stable as
  $$ select role from profiles where id = auth.uid() $$;
create or replace function my_company() returns uuid language sql stable as
  $$ select company_id from profiles where id = auth.uid() $$;

create policy "staff read trips" on trips for select using (my_role() in ('dispatcher','manager'));
create policy "driver own trips" on trips for select using (driver_id = auth.uid());
create policy "client own trips" on trips for select using (
  exists (select 1 from orders o where o.id = order_id and o.client_company_id = my_company()));
create policy "dispatcher writes trips" on trips for all using (my_role() = 'dispatcher');
create policy "driver updates own trip" on trips for update using (driver_id = auth.uid());

create policy "events visible with trip" on trip_events for select using (
  exists (select 1 from trips t where t.id = trip_id)  -- наследует видимость trips
  and (my_role() <> 'client' or coalesce((payload->>'internal')::boolean, false) = false));
create policy "events insert by driver/dispatcher" on trip_events for insert with check (my_role() in ('driver','dispatcher'));

create policy "notifications own" on notifications for all using (user_id = auth.uid());

-- Storage: bucket 'trip-media' (private), путь trip-media/{trip_id}/... ; политики — в T-04.
