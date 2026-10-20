begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(30);

-- Disposable fixtures: two carriers, two clients, three trips; rolled back below.
insert into public.companies(id,name,type) values
  (md5('carrier-a')::uuid,'Тестовый перевозчик А','carrier'),
  (md5('carrier-b')::uuid,'Тестовый перевозчик Б','carrier'),
  (md5('client-a')::uuid,'Тестовый клиент А','client'),
  (md5('client-b')::uuid,'Тестовый клиент Б','client');
insert into auth.users(id) select md5(name)::uuid from unnest(array[
  'dispatcher-a','driver-a','driver-b','client-a','client-b','manager-a','dispatcher-b','driver-c']) name;
insert into public.profiles(id,full_name,phone,role,company_id)
select md5(name)::uuid, name, 'private-phone', role::public.user_role, md5(company)::uuid
from (values ('dispatcher-a','dispatcher','carrier-a'),('driver-a','driver','carrier-a'),
  ('driver-b','driver','carrier-a'),('client-a','client','client-a'),('client-b','client','client-b'),
  ('manager-a','manager','carrier-a'),('dispatcher-b','dispatcher','carrier-b'),('driver-c','driver','carrier-b')) p(name,role,company);
insert into public.vehicles(id,company_id,make_model,plate)
select md5('vehicle-'||n)::uuid, md5(case when n=3 then 'carrier-b' else 'carrier-a' end)::uuid,
  'Тестовый автомобиль', 'TEST-'||n from generate_series(1,3) n;
insert into public.orders(id,number,carrier_company_id,client_company_id,cargo_name,weight_kg,
  pickup_city,pickup_address,delivery_city,delivery_address,load_date,desired_delivery_at)
select md5('order-'||n)::uuid, 'TEST-'||n, md5(case when n=3 then 'carrier-b' else 'carrier-a' end)::uuid,
  md5(case when n=1 then 'client-a' else 'client-b' end)::uuid,
  'Тестовый груз', 100, 'Павлодар', 'Загрузка', 'Астана', 'Выгрузка', current_date, now()
from generate_series(1,3) n;
insert into public.trips(id,number,order_id,driver_id,vehicle_id,depart_date,planned_delivery_at,current_planned_delivery_at)
select md5('trip-'||n)::uuid,'TEST-'||n,md5('order-'||n)::uuid,
  md5(case n when 1 then 'driver-a' when 2 then 'driver-a' else 'driver-c' end)::uuid,
  md5('vehicle-'||n)::uuid,current_date,now(),now() from generate_series(1,3) n;
insert into public.trip_events(trip_id,type,payload) values
  (md5('trip-1')::uuid,'note','{"internal":true,"comment":"служебное"}'),
  (md5('trip-1')::uuid,'photo','{}');
insert into public.handovers(trip_id,receiver_name) values (md5('trip-1')::uuid,'Тестовый получатель');
update public.trips set status='awaiting_confirmation' where id=md5('trip-1')::uuid;
insert into storage.objects(bucket_id,name) values
  ('trip-media',md5('trip-1')::uuid||'/after_load/test.jpg'),
  ('trip-media',md5('trip-3')::uuid||'/after_load/test.jpg');

set local role authenticated;
select set_config('request.jwt.claim.sub',md5('dispatcher-a')::uuid::text,true);
select is((select count(*) from public.trips),2::bigint,'dispatcher: only carrier A trips');
select is((select count(*) from public.orders),2::bigint,'dispatcher: only carrier A orders');
select is((select count(*) from storage.objects where bucket_id='trip-media'),1::bigint,'dispatcher: own carrier media');
select throws_ok($$insert into public.trips(number,order_id,driver_id,vehicle_id,depart_date,
  planned_delivery_at,current_planned_delivery_at,created_by) values ('FORBIDDEN',md5('order-1')::uuid,
  md5('driver-c')::uuid,md5('vehicle-1')::uuid,current_date,now(),now(),auth.uid())$$,
  '42501',null,'dispatcher cannot insert trips directly');
select throws_ok($$select public.apply_command(jsonb_build_object('kind','create_trip','action_id',gen_random_uuid(),'at',now(),
  'trip',jsonb_build_object('id',gen_random_uuid(),'number','R-900','order_id',md5('order-1')::uuid,'driver_id',md5('driver-c')::uuid,
  'vehicle_id',md5('vehicle-1')::uuid,'depart_date',current_date,'planned_delivery_at',now())))$$,
  'CF400',null,'dispatcher cannot assign foreign driver');

select set_config('request.jwt.claim.sub',md5('driver-a')::uuid::text,true);
select is((select count(*) from public.trips),2::bigint,'driver: exactly own trips');
select is((select count(*) from public.orders),2::bigint,'driver: exactly own orders');
select throws_ok($$insert into public.trip_events(trip_id,type,actor_id)
  values(md5('trip-3')::uuid,'photo',auth.uid())$$,'42501',null,'driver cannot append foreign event');
select throws_ok($$select public.apply_command(jsonb_build_object('kind','transition','action_id',gen_random_uuid(),'at',now(),
  'trip_id',md5('trip-3')::uuid,'to','accepted'))$$,'CF404',null,'driver cannot move a foreign trip');
select throws_ok($$insert into public.trip_events(trip_id,type,actor_id)
  values(md5('trip-1')::uuid,'photo',md5('driver-b')::uuid)$$,'42501',null,'driver cannot forge actor');
select throws_ok($$update public.trips set status='accepted',accepted_at=now() where id=md5('trip-2')::uuid$$,
  '42501',null,'driver cannot update trips directly');
select lives_ok($$select public.apply_command(jsonb_build_object('kind','transition','action_id',gen_random_uuid(),'at',now(),
  'trip_id',md5('trip-2')::uuid,'to','accepted'))$$,'driver can move own trip through apply_command');
select is((select count(*) from public.trip_events where trip_id=md5('trip-2')::uuid and to_status='accepted'),
  1::bigint,'status change writes one event');
select throws_ok($$update public.trips set order_id=md5('order-2')::uuid where id=md5('trip-1')::uuid$$,
  '42501',null,'driver cannot change assignment');
select lives_ok($$select public.apply_command(jsonb_build_object('kind','report_problem','action_id',gen_random_uuid(),'at',now(),
  'trip_id',md5('trip-2')::uuid,'problem',jsonb_build_object('id',gen_random_uuid(),'category','delay','reason','Тестовая задержка',
  'comment',null,'estimated_delay_min',90,'photo_path',null)))$$,'driver can report own problem');
select throws_ok($$insert into storage.objects(bucket_id,name)
  values('trip-media',md5('trip-3')::uuid||'/after_load/forbidden.jpg')$$,'42501',null,'driver cannot upload to foreign trip');
select throws_ok($$insert into storage.objects(bucket_id,name)
  values('trip-media','invalid/after_load/forbidden.jpg')$$,'42501',null,'malformed media path denied');
select throws_ok($$update public.trip_events set payload='{}'$$,'42501',null,'events are immutable');

select set_config('request.jwt.claim.sub',md5('client-a')::uuid::text,true);
select is((select count(*) from public.trips),1::bigint,'client: own company trip');
select is((select count(*) from public.orders),1::bigint,'client: own company order');
select is((select count(*) from public.profiles where role='driver'),0::bigint,'client cannot read driver phones');
select is((select count(*) from public.trip_events where payload ? 'internal' or type='note'),0::bigint,'client cannot read internal events');
select is((select count(*) from public.trip_problems),0::bigint,'client cannot read operational comments');
select throws_ok($$update public.handovers set receiver_name='Подмена'$$,'42501',null,'client cannot rewrite handover');
select lives_ok($$select public.apply_command(jsonb_build_object('kind','confirm_delivery','action_id',gen_random_uuid(),'at',now(),
  'trip_id',md5('trip-1')::uuid))$$,'client can confirm own delivery');
select is((select status from public.trips where id=md5('trip-1')::uuid),'completed','confirmation completes the trip');

select set_config('request.jwt.claim.sub',md5('manager-a')::uuid::text,true);
select is((select count(*) from public.trips),2::bigint,'manager: own carrier trips');
select throws_ok($$update public.trips set status='completed'$$,'42501',null,'manager cannot write trips');
select set_config('request.jwt.claim.sub',md5('dispatcher-b')::uuid::text,true);
select is((select count(*) from public.notifications where trip_id=md5('trip-2')::uuid),
  0::bigint,'problem notification does not reach another carrier');
set local role anon;
select throws_ok('select * from public.trips','42501',null,'anonymous cannot read trips');
reset role;
select * from finish();
rollback;
