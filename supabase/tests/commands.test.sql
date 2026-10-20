begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(34);

-- Fixtures mirror the demo scenario: one carrier, one client, free driver and vehicle.
insert into public.companies(id,name,type) values (md5('carrier')::uuid,'Перевозчик','carrier'),(md5('client')::uuid,'Клиент','client');
insert into auth.users(id) select md5(name)::uuid from unnest(array['dispatcher','driver','driver2','client','manager']) name;
insert into public.profiles(id,full_name,phone,role,company_id)
select md5(name)::uuid, name, null, role::public.user_role, md5(company)::uuid
from (values ('dispatcher','dispatcher','carrier'),('driver','driver','carrier'),('driver2','driver','carrier'),
  ('client','client','client'),('manager','manager','carrier')) p(name,role,company);
insert into public.vehicles(id,company_id,make_model,plate,status) values
  (md5('volvo')::uuid,md5('carrier')::uuid,'Volvo FH','777 ABC 14','free'),(md5('man')::uuid,md5('carrier')::uuid,'MAN TGX','123 KZ 14','on_trip');
insert into storage.objects(bucket_id,name) values
  ('trip-media',md5('trip')::uuid||'/after_load/a.jpg'),('trip-media',md5('trip')::uuid||'/at_delivery/b.jpg'),
  ('trip-media',md5('trip')::uuid||'/documents/w.jpg'),('trip-media',md5('trip')::uuid||'/problem/p.jpg');

create function pg_temp.cmd(kind text, body jsonb, action uuid default gen_random_uuid()) returns jsonb language sql as $$
  select public.apply_command(jsonb_build_object('kind',kind,'action_id',action,'at',now()) || body) $$;
create function pg_temp.move(status text, action uuid default gen_random_uuid()) returns jsonb language sql as $$
  select pg_temp.cmd('transition', jsonb_build_object('trip_id',md5('trip')::uuid,'to',status), action) $$;
create function pg_temp.order_body(weight int, oid uuid) returns jsonb language sql as $$
  select jsonb_build_object('order', jsonb_build_object('id',oid,'number','CF-1845',
  'client_company_id',md5('client')::uuid,'cargo_name','Керамическая плитка','weight_kg',weight,'places',12,'places_unit','паллет',
  'pickup_city','Павлодар','pickup_address','ул. Промышленная, 18','pickup_contact_name','Серик','pickup_contact_phone','+7 777 123 45 67',
  'delivery_city','Астана','delivery_address','ул. Индустриальная, 42','delivery_contact_name','Алексей','delivery_contact_phone','+7 701 456 78 90',
  'load_date','2026-10-21','desired_delivery_at','2026-10-22T15:00:00+05:00')) $$;
create function pg_temp.trip_body(vehicle text) returns jsonb language sql as $$
  select jsonb_build_object('trip', jsonb_build_object('id',md5('trip')::uuid,'number','R-642',
  'order_id',md5('order')::uuid,'driver_id',md5('driver')::uuid,'vehicle_id',md5(vehicle)::uuid,'depart_date','2026-10-21',
  'planned_delivery_at','2026-10-22T13:00:00+05:00')) $$;
create function pg_temp.handover_body(receiver text, doc jsonb) returns jsonb language sql as $$
  select jsonb_build_object('trip_id',md5('trip')::uuid,'handover',jsonb_build_object('id',md5('handover')::uuid,
  'receiver_name',receiver,'comment','Повреждений не выявлено','photo',jsonb_build_object('id',md5('photo2')::uuid,
  'storage_path',md5('trip')::uuid||'/at_delivery/b.jpg','taken_at',now()),'document',doc)) $$;

set local role authenticated;
select set_config('request.jwt.claim.sub',md5('dispatcher')::uuid::text,true);
select throws_ok($$insert into public.orders(number,carrier_company_id,client_company_id,cargo_name,weight_kg,pickup_city,pickup_address,
  delivery_city,delivery_address,load_date,desired_delivery_at,created_by) values ('CF-1',md5('carrier')::uuid,md5('client')::uuid,
  'x',1,'a','b','c','d',current_date,now(),auth.uid())$$,'42501',null,'direct order insert is closed');
select throws_ok($$select pg_temp.cmd('create_order', pg_temp.order_body(0, md5('order')::uuid))$$,'CF400',null,'invalid weight rejected');
select lives_ok($$select pg_temp.cmd('create_order', pg_temp.order_body(8500, md5('order')::uuid))$$,'dispatcher creates CF-1845');
select throws_ok($$select pg_temp.cmd('create_order', pg_temp.order_body(1, gen_random_uuid()))$$,'CF409',null,'duplicate order number rejected');
select throws_ok($$select pg_temp.cmd('create_trip', pg_temp.trip_body('man'))$$,'CF409',null,'busy vehicle rejected');
select lives_ok($$select pg_temp.cmd('create_trip', pg_temp.trip_body('volvo'), md5('action-create')::uuid)$$,'dispatcher creates R-642');
select is((select pg_temp.cmd('create_trip', pg_temp.trip_body('volvo'), md5('action-create')::uuid)->>'status'),'duplicate','same action id is a no-op');
select is((select count(*) from public.trips where order_id=md5('order')::uuid),1::bigint,'one trip after retry');
select is((select (status,delayed) from public.trips where id=md5('trip')::uuid),('assigned'::public.trip_status,false),'trip assigned');
select is((select (o.status,v.status) from public.orders o, public.vehicles v where o.id=md5('order')::uuid and v.id=md5('volvo')::uuid),
  ('in_trip'::public.order_status,'on_trip'::public.vehicle_status),'order in trip, vehicle busy');
select throws_ok($$select pg_temp.move('accepted')$$,'CF403',null,'dispatcher cannot move driver statuses');

select set_config('request.jwt.claim.sub',md5('driver')::uuid::text,true);
select is((select count(*) from public.notifications where user_id=auth.uid() and title='Новый рейс'),1::bigint,'driver notified once');
select throws_ok($$select pg_temp.move('to_pickup')$$,'CF409',null,'skipping a step is rejected');
select lives_ok($$select pg_temp.move('accepted'); select pg_temp.move('to_pickup'); select pg_temp.move('at_pickup'); select pg_temp.move('loading');$$,'driver reaches loading');
select throws_ok($$select pg_temp.move('loaded')$$,'CF400',null,'loaded needs an after_load photo');
select throws_ok($$select pg_temp.cmd('add_photo', jsonb_build_object('trip_id',md5('trip')::uuid,'photo',jsonb_build_object('id',gen_random_uuid(),
  'stage','after_load','storage_path',md5('trip')::uuid||'/after_load/missing.jpg','taken_at',now())))$$,'CF400',null,'photo must exist in storage');
select lives_ok($$select pg_temp.cmd('add_photo', jsonb_build_object('trip_id',md5('trip')::uuid,'photo',jsonb_build_object('id',md5('photo1')::uuid,
  'stage','after_load','storage_path',md5('trip')::uuid||'/after_load/a.jpg','taken_at',now())))$$,'after_load photo added');
select lives_ok($$select pg_temp.move('loaded'); select pg_temp.move('in_transit');$$,'loaded and in transit');
select throws_ok($$select pg_temp.cmd('hand_over', pg_temp.handover_body('Алексей Смирнов', 'null'::jsonb))$$,'CF409',null,'handover before unloading is rejected');
select lives_ok($$select pg_temp.move('at_delivery'); select pg_temp.move('unloading');$$,'at delivery and unloading');
select throws_ok($$select pg_temp.cmd('hand_over', pg_temp.handover_body('', 'null'::jsonb))$$,'CF400',null,'receiver name is required');
select lives_ok($$select pg_temp.cmd('hand_over', pg_temp.handover_body('Алексей Смирнов', jsonb_build_object('id',md5('doc')::uuid,'type','waybill',
  'title','Накладная','number','457','storage_path',md5('trip')::uuid||'/documents/w.jpg')))$$,'handover with photo and waybill');
select is((select status from public.trips where id=md5('trip')::uuid),'awaiting_confirmation','awaiting confirmation');
select is((select array_agg(from_status||'→'||to_status order by created_at) from public.trip_events where trip_id=md5('trip')::uuid and type='status' and to_status in ('handed_over','awaiting_confirmation')),
  array['unloading→handed_over','handed_over→awaiting_confirmation'],'two separate events for handover and awaiting');
select throws_ok($$select pg_temp.cmd('confirm_delivery', jsonb_build_object('trip_id',md5('trip')::uuid))$$,'CF403',null,'driver cannot confirm');

select set_config('request.jwt.claim.sub',md5('client')::uuid::text,true);
select is((select count(*) from public.trip_events where trip_id=md5('trip')::uuid and (payload ? 'internal' or type in ('note','problem','problem_ack'))),0::bigint,'client sees no internal events');
select is((select count(*) from public.notifications where user_id=auth.uid()),2::bigint,'client got loaded + delivered notifications');
select lives_ok($$select pg_temp.cmd('confirm_delivery', jsonb_build_object('trip_id',md5('trip')::uuid), md5('action-confirm')::uuid)$$,'client confirms');
select is((select pg_temp.cmd('confirm_delivery', jsonb_build_object('trip_id',md5('trip')::uuid), md5('action-confirm')::uuid)->>'status'),'duplicate','repeated confirm is a no-op');
select throws_ok($$select pg_temp.cmd('confirm_delivery', jsonb_build_object('trip_id',md5('trip')::uuid))$$,'CF409',null,'second confirmation conflicts');
select is((select count(*) from public.trip_events where trip_id=md5('trip')::uuid and type='status'),13::bigint,'thirteen status events in the log');

select set_config('request.jwt.claim.sub',md5('dispatcher')::uuid::text,true);
select is((select (t.status, o.status, v.status, h.confirmed_by) from public.trips t join public.orders o on o.id=t.order_id
  join public.vehicles v on v.id=t.vehicle_id join public.handovers h on h.trip_id=t.id where t.id=md5('trip')::uuid),
  ('completed'::public.trip_status,'done'::public.order_status,'free'::public.vehicle_status,md5('client')::uuid),'completed, order done, vehicle free');
select throws_ok($$select pg_temp.cmd('cancel_trip', jsonb_build_object('trip_id',md5('trip')::uuid,'reason','Поздно'))$$,'CF409',null,'completed trip cannot be cancelled');
select throws_ok($$update public.trip_events set payload='{}'$$,'42501',null,'log is immutable for dispatcher');
reset role;
select * from finish();
rollback;
