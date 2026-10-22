from pathlib import Path
from uuid import uuid5, NAMESPACE_URL
from datetime import datetime, timedelta
import json

root = Path(__file__).resolve().parents[1]
def uid(name): return str(uuid5(NAMESPACE_URL, 'cargoflow/' + name))
now = '2026-09-21T00:00:00+05:00'
carrier, client = uid('carrier'), uid('client')
people = [('dispatcher','Айгерим Нурланова'),('driver','Руслан Касымов'),
          ('client','Серик Ахметов'),('manager','Даурен Ахметов'),
          ('askhat','Асхат Нуртаев'),('ermek','Ермек Садыков'),('bauyrzhan','Бауыржан Омаров')]
profiles = [dict(id=uid(key), full_name=name, phone=None,
                 role=key if key in ['dispatcher','driver','client','manager'] else 'driver',
                 company_id=client if key=='client' else carrier, created_at=now) for key,name in people]
vehicles = [dict(id=uid('vehicle'+str(i)),company_id=carrier,make_model=model,plate=plate,
                 capacity_kg=20000,status='free' if i==0 else 'on_trip')
            for i,(model,plate) in enumerate([('Volvo FH','777 ABC 14'),('MAN TGX','123 KZ 14'),('KAMAZ 5490','456 ABC 05'),('Scania R450','789 BCA 02')])]
orders, trips, events, problems = [], [], [], []
routes = [('Павлодар','Астана'),('Астана','Караганда'),('Экибастуз','Караганда'),('Алматы','Шымкент'),('Караганда','Павлодар')]
today = ['assigned']*5 + ['in_transit']*13 + ['at_delivery']*3 + ['in_transit']*2 + ['completed']*4
history = ['completed']*417 + ['in_transit']*22 + ['cancelled']*4 + ['assigned']*7 + ['unloading']*9
for i,status in enumerate(today + history):
    day = '2026-10-21' if i<27 else (datetime(2026,10,20)-timedelta(days=(i-27)%29)).date().isoformat()
    if i==55: day='2026-10-15'
    depart = day+'T01:50:00+05:00'
    finish = day+'T16:20:00+05:00'
    delayed = i in [21,22] or 444<=i<454
    pickup,delivery = routes[i%len(routes)]
    if i==21: pickup,delivery='Экибастуз','Караганда'
    if i==55: pickup,delivery='Караганда','Павлодар'
    oid,tid = uid('order'+str(i)),uid('trip'+str(i))
    driver = uid('askhat' if i==21 else ['askhat','ermek','bauyrzhan'][i%3])
    orders.append(dict(id=oid,number='CF-'+str(1818+i if i<27 else 1817-(i-27)),
        carrier_company_id=carrier,client_company_id=client,cargo_name='Строительные материалы',
        weight_kg=8500,places=12,places_unit='паллет',pickup_city=pickup,pickup_address='ул. Промышленная, 18',
        pickup_contact_name='Серик',pickup_contact_phone=None,delivery_city=delivery,delivery_address='ул. Индустриальная, 42',
        delivery_contact_name='Алексей',delivery_contact_phone=None,load_date=day,desired_delivery_at=finish,
        status='done' if status=='completed' else 'cancelled' if status=='cancelled' else 'in_trip',created_by=uid('dispatcher'),created_at=(datetime.fromisoformat(depart)-timedelta(minutes=10)).isoformat()))
    trips.append(dict(id=tid,number='R-648' if i==21 else 'R-'+str(616+i if i<21 else 615+i if i<27 else 615-(i-27)),
        order_id=oid,driver_id=driver,vehicle_id=vehicles[1+i%3]['id'],depart_date=day,
        planned_delivery_at=finish,current_planned_delivery_at=day+'T17:50:00+05:00' if delayed else finish,
        status=status,delayed=delayed,has_problem=delayed,accepted_at=None if status=='assigned' else depart,
        completed_at=finish if status=='completed' else None,created_by=uid('dispatcher'),created_at=(datetime.fromisoformat(depart)-timedelta(minutes=5)).isoformat()))
    chain=['assigned','accepted','to_pickup','at_pickup','loading','loaded','in_transit','at_delivery','unloading','handed_over','awaiting_confirmation','delivered','completed']
    stages=['assigned','cancelled'] if status=='cancelled' else chain[:chain.index(status)+1]
    for j,stage in enumerate(stages):
        events.append(dict(id=uid(f'event{i}-{j}'),trip_id=tid,type='status',from_status=stages[j-1] if j else None,
            to_status=stage,actor_id=uid('dispatcher') if j==0 or stage in ['cancelled','delivered','completed'] else driver,
            payload={},client_action_id=None,created_at=(datetime.fromisoformat(depart)+(timedelta(minutes=-5) if j==0 else timedelta(hours=14.5*(j-1)/max(1,len(stages)-2)))).isoformat()))
    if delayed:
        problems.append(dict(id=uid('problem'+str(i)),trip_id=tid,category='delay',reason='Закрытие дороги',
            comment='Движение ограничено, задержка около 90 минут',estimated_delay_min=90,photo_path=None,
            status='open',reported_by=driver,acknowledged_by=None,created_at=day+'T16:30:00+05:00',resolved_at=None))
        events.append(dict(id=uid('problem-event'+str(i)),trip_id=tid,type='problem',from_status=None,to_status=None,
            actor_id=driver,payload={'internal':True,'reason':'Закрытие дороги'},client_action_id=None,created_at=day+'T16:30:00+05:00'))
data=dict(date='2026-10-21',companies=[dict(id=carrier,name='CargoFlow',type='carrier',created_at=now),
    dict(id=client,name='ТОО «СтройКомплект»',type='client',created_at=now)],profiles=profiles,vehicles=vehicles,
    orders=orders,trips=trips,trip_events=events,trip_problems=problems)
(root/'app/src/demo/seed.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
# Generated from the same records as the bundled JSON.
# Local test accounts only: one known password so anyone who clones the repo can sign in.
password = 'cargoflow2026'
lines=['-- Generated by setup/generate-seed.py; local demo fixtures only.', 'begin;']
lines+=['insert into auth.users (instance_id,id,email,aud,role,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change,email_change_token_new) values']
lines += ["('00000000-0000-0000-0000-000000000000','%s','%s@cargoflow.test','authenticated','authenticated',extensions.crypt('%s',extensions.gen_salt('bf')),now(),'{\"provider\":\"email\",\"providers\":[\"email\"]}','{}',now(),now(),'','','','')%s" % (uid(key),key,password,',' if n<len(people)-1 else " on conflict (id) do update set encrypted_password=excluded.encrypted_password, email_confirmed_at=excluded.email_confirmed_at, instance_id=excluded.instance_id, confirmation_token='', recovery_token='', email_change='', email_change_token_new='';") for n,(key,_) in enumerate(people)]
lines+=['insert into auth.identities (provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at) values']
lines += ["('%s','%s','{\"sub\":\"%s\",\"email\":\"%s@cargoflow.test\",\"email_verified\":true}','email',now(),now(),now())%s" % (uid(key),uid(key),uid(key),key,',' if n<len(people)-1 else " on conflict (provider_id, provider) do nothing;") for n,(key,_) in enumerate(people)]
# Bulk historical fixtures bypass derived triggers; the complete event log follows below.
lines+=['set local session_replication_role = replica;']
for table in ['companies','profiles','vehicles','orders','trips','trip_events','trip_problems']:
    payload=json.dumps(data[table],ensure_ascii=False,separators=(',',':'))
    updates=', '.join(f'{key}=excluded.{key}' for key in data[table][0] if key!='id')
    lines += [f"insert into public.{table} select * from jsonb_populate_recordset(null::public.{table}, $seed${payload}$seed$) on conflict (id) do update set {updates};"]
lines+=['set local session_replication_role = origin;','commit;']
(root/'supabase/seed.sql').write_text('\n'.join(lines)+'\n')
print('Generated 486 trips and shared SQL/JSON fixtures')
