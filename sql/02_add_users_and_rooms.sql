-- Run AFTER 01_schema.sql. Safe to run again.
-- 1) Link your two Auth users to roles (matched by email)
insert into public.profiles(id, full_name, role, hotel_id)
select u.id, 'Kodai Admin', 'admin', null
from auth.users u where u.email = 'kodaiadmin@starlighthotels.in'
on conflict (id) do update set role='admin', hotel_id=null, is_active=true;

insert into public.profiles(id, full_name, role, hotel_id)
select u.id, 'Kodai Reception', 'receptionist', (select id from public.hotels where code='KDL01')
from auth.users u where u.email = 'kodai@starlighthotels.in'
on conflict (id) do update set role='receptionist',
  hotel_id=(select id from public.hotels where code='KDL01'), is_active=true;

-- 2) Kodaikanal rooms  (EDIT the numbers to your real rooms)
insert into public.rooms(hotel_id, room_number, room_type)
select h.id, r, 'Standard' from public.hotels h,
  unnest(array['101','102','103','104','105','201','202','203','204','205']) r
where h.code='KDL01' on conflict do nothing;

-- 3) Check result: should show 2 rows
select u.email, p.role, h.code as hotel from public.profiles p
join auth.users u on u.id=p.id left join public.hotels h on h.id=p.hotel_id;
