-- Helpers live outside the Data API; identity comes from Auth, never user metadata.
create schema if not exists private;
revoke create on schema public from public, anon, authenticated;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function public.my_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;
create or replace function public.my_company() returns uuid
language sql stable security definer set search_path = '' as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create function private.staff(company uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.my_role() in ('dispatcher','manager') and public.my_company() = company
$$;
create function private.dispatcher(company uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.my_role() = 'dispatcher' and public.my_company() = company
$$;
create function private.read_order(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.orders o where o.id = target and (
    private.staff(o.carrier_company_id)
    or (public.my_role() = 'client' and o.client_company_id = public.my_company())
    or (public.my_role() = 'driver' and exists (
      select 1 from public.trips t where t.order_id = o.id and t.driver_id = auth.uid()))))
$$;
create function private.read_trip(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trips t join public.orders o on o.id = t.order_id
    where t.id = target and (private.staff(o.carrier_company_id)
      or (public.my_role() = 'driver' and t.driver_id = auth.uid())
      or (public.my_role() = 'client' and o.client_company_id = public.my_company())))
$$;
create function private.write_trip(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trips t join public.orders o on o.id = t.order_id
    where t.id = target and (private.dispatcher(o.carrier_company_id)
      or (public.my_role() = 'driver' and t.driver_id = auth.uid())))
$$;
create function private.dispatch_trip(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trips t join public.orders o on o.id = t.order_id
    where t.id = target and private.dispatcher(o.carrier_company_id))
$$;
create function private.media_trip(path text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return split_part(path, '/', 1)::uuid;
exception when invalid_text_representation then return null;
end $$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
revoke execute on function public.my_role(), public.my_company() from public, anon;
grant execute on function public.my_role(), public.my_company() to authenticated;

-- Replace the kit's broad policies, including tables that previously had no RLS.
do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
  for p in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', p.tablename);
  end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant insert, update on public.orders, public.trips to authenticated;
grant insert on public.trip_events, public.trip_photos, public.trip_documents,
  public.trip_problems, public.handovers to authenticated;
grant update(status, acknowledged_by, resolved_at) on public.trip_problems to authenticated;
grant update(confirmed_by, confirmed_at) on public.handovers to authenticated;
grant update(read_at) on public.notifications to authenticated;

create policy companies_read on public.companies for select to authenticated using (
  id = public.my_company() or exists (select 1 from public.orders o
    where o.client_company_id = companies.id and private.staff(o.carrier_company_id)));
create policy profiles_read on public.profiles for select to authenticated using (
  id = auth.uid() or (public.my_role() in ('dispatcher','manager')
    and company_id = public.my_company()));
create policy vehicles_read on public.vehicles for select to authenticated using (
  private.staff(company_id) or exists (select 1 from public.trips t
    where t.vehicle_id = vehicles.id and t.driver_id = auth.uid() and public.my_role() = 'driver'));

create policy orders_read on public.orders for select to authenticated using (private.read_order(id));
create policy orders_insert on public.orders for insert to authenticated with check (
  private.dispatcher(carrier_company_id) and created_by = auth.uid()
  and exists (select 1 from public.companies c where c.id = client_company_id and c.type = 'client'));
create policy orders_update on public.orders for update to authenticated
  using (private.dispatcher(carrier_company_id)) with check (private.dispatcher(carrier_company_id));

create policy trips_read on public.trips for select to authenticated using (private.read_trip(id));
create policy trips_insert on public.trips for insert to authenticated with check (
  created_by = auth.uid() and status = 'assigned' and exists (
    select 1 from public.orders o join public.profiles p on p.id = driver_id
      join public.vehicles v on v.id = vehicle_id where o.id = order_id
      and private.dispatcher(o.carrier_company_id) and p.role = 'driver'
      and p.company_id = o.carrier_company_id and v.company_id = o.carrier_company_id));
create policy trips_update on public.trips for update to authenticated
  using (private.write_trip(id)) with check (private.write_trip(id));

-- Assignment and ownership cannot be moved to another tenant by UPDATE.
create function private.guard_trip_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user <> 'authenticated' then return new; end if;
  if new.order_id <> old.order_id or new.driver_id <> old.driver_id
    or new.vehicle_id <> old.vehicle_id or new.id <> old.id or new.created_by is distinct from old.created_by then
    raise exception 'Назначение рейса неизменяемо' using errcode = '42501';
  end if;
  if public.my_role() = 'driver' and
    (to_jsonb(new) - array['status','accepted_at']) is distinct from
    (to_jsonb(old) - array['status','accepted_at']) then
    raise exception 'Водитель меняет только статус своего рейса' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger a_guard_trip_update before update on public.trips
  for each row execute function private.guard_trip_update();

create policy events_read on public.trip_events for select to authenticated using (
  private.read_trip(trip_id) and (public.my_role() <> 'client' or
    (not payload ? 'internal' and type not in ('note','problem','problem_ack'))));
create policy events_insert on public.trip_events for insert to authenticated with check (
  private.write_trip(trip_id) and actor_id = auth.uid() and type <> 'status');
create policy photos_read on public.trip_photos for select to authenticated using (private.read_trip(trip_id));
create policy photos_insert on public.trip_photos for insert to authenticated with check (
  private.write_trip(trip_id) and uploaded_by = auth.uid()
  and private.media_trip(storage_path) = trip_id);
create policy documents_read on public.trip_documents for select to authenticated using (private.read_trip(trip_id));
create policy documents_insert on public.trip_documents for insert to authenticated with check (
  private.write_trip(trip_id) and uploaded_by = auth.uid()
  and private.media_trip(storage_path) = trip_id);
create policy problems_read on public.trip_problems for select to authenticated using (
  public.my_role() <> 'client' and private.read_trip(trip_id));
create policy problems_insert on public.trip_problems for insert to authenticated with check (
  private.write_trip(trip_id) and reported_by = auth.uid());
create policy problems_update on public.trip_problems for update to authenticated
  using (private.dispatch_trip(trip_id)) with check (private.dispatch_trip(trip_id));
create policy handovers_read on public.handovers for select to authenticated using (private.read_trip(trip_id));
create policy handovers_insert on public.handovers for insert to authenticated with check (
  private.write_trip(trip_id) and confirmed_by is null and confirmed_at is null);
create policy handovers_confirm on public.handovers for update to authenticated
  using (private.read_trip(trip_id) and (public.my_role() = 'client' or private.dispatch_trip(trip_id)))
  with check (private.read_trip(trip_id) and confirmed_by = auth.uid() and confirmed_at is not null);
create policy notifications_read on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Only trusted triggers write derived events, notifications and fleet state.
alter function public.trips_assigned() security definer;
alter function public.trips_assigned() set search_path = public, pg_temp;
alter function public.trips_status_changed() security definer;
alter function public.trips_status_changed() set search_path = public, pg_temp;
create or replace function public.problem_reported() returns trigger
language plpgsql security definer set search_path = '' as $$
declare d uuid;
begin
  update public.trips set has_problem = true, delayed = (new.category = 'delay') or delayed where id = new.trip_id;
  insert into public.trip_events(trip_id, type, actor_id, payload)
  values (new.trip_id, 'problem', new.reported_by,
    jsonb_build_object('internal', true, 'category', new.category, 'reason', new.reason, 'delay', new.estimated_delay_min));
  for d in select p.id from public.profiles p join public.orders o on o.carrier_company_id = p.company_id
    join public.trips t on t.order_id = o.id where t.id = new.trip_id and p.role = 'dispatcher' loop
    insert into public.notifications(user_id, title, body, trip_id)
    values (d, 'Проблема в рейсе', new.reason, new.trip_id);
  end loop;
  return new;
end $$;
revoke execute on function public.trips_assigned(), public.trips_status_changed(), public.problem_reported()
  from public, anon, authenticated;

insert into storage.buckets (id, name, public) values ('trip-media','trip-media',false);
-- Object name is {trip_id}/{stage}/{file}; bucket is a separate API parameter.
create policy media_read on storage.objects for select to authenticated using (
  bucket_id = 'trip-media' and private.read_trip(private.media_trip(name)));
create policy media_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'trip-media' and private.write_trip(private.media_trip(name)));

create index orders_carrier_idx on public.orders(carrier_company_id);
create index orders_client_idx on public.orders(client_company_id);
create index trips_order_idx on public.trips(order_id);
create index profiles_company_idx on public.profiles(company_id);
