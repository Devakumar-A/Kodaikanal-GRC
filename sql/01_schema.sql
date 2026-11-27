-- =====================================================================
--  STARLIGHT HOTELS - FRONT DESK / GRC SYSTEM  (Supabase / PostgreSQL)
--  Run this whole file once in: Supabase > SQL Editor
--  Hotels: Mylapore (MYL14), Kodaikanal  (add more rows in `hotels`)
--  Roles : admin (all hotels)  |  receptionist (own hotel only)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS + INDIAN TIME
-- ---------------------------------------------------------------------
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- timestamptz is stored in UTC internally (correct). Sessions display IST.
alter database postgres set timezone to 'Asia/Kolkata';
set timezone to 'Asia/Kolkata';

-- ---------------------------------------------------------------------
-- 1. MASTER TABLES
-- ---------------------------------------------------------------------
create table if not exists public.hotels (
  id                           uuid primary key default gen_random_uuid(),
  code                         text unique not null,            -- MYL14, KDL01 ...
  name                         text not null,                   -- "Starlight Hotels Mylapore"
  address                      text,
  phone                        text,
  gstin                        text,
  logo_url                     text,
  checkin_time                 time not null default '12:00',
  checkout_time                time not null default '11:00',   -- change to '23:00' for 11 PM
  auto_checkout_grace_minutes  int  not null default 0,
  terms                        jsonb not null default '[
    "Check-in time is 12:00 PM and check-out time is 11:00 AM.",
    "Any damage caused to hotel property, furnishings, equipment, or other belongings shall be compensated by the guest.",
    "Alcohol, drugs, pets, weapons, flammable materials, and other hazardous substances are strictly prohibited on the hotel premises.",
    "Management reserves the right to refuse admission or terminate a guest''s stay when deemed necessary.",
    "Management shall not be responsible for the loss, theft, or damage of the guest''s personal belongings.",
    "Parking facilities for two-wheelers and four-wheelers are provided entirely at the owner''s risk.",
    "Visitors are not permitted inside guest rooms unless expressly authorized by hotel management."
  ]'::jsonb,
  is_active                    boolean not null default true,
  created_at                   timestamptz not null default now()
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null check (role in ('admin','receptionist')),
  hotel_id    uuid references public.hotels(id),               -- null allowed only for admin
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint receptionist_needs_hotel check (role = 'admin' or hotel_id is not null)
);

create table if not exists public.rooms (
  id           uuid primary key default gen_random_uuid(),
  hotel_id     uuid not null references public.hotels(id),
  room_number  text not null,
  room_type    text,
  base_rate    numeric(10,2),
  is_active    boolean not null default true,
  unique (hotel_id, room_number)
);

create table if not exists public.booking_sources (
  name        text primary key,
  sort_order  int  not null default 100,
  is_active   boolean not null default true
);

insert into public.booking_sources(name, sort_order) values
  ('Walk-in',1),('Agoda',2),('MMT',3),('Goibibo',4),('Airbnb',5),
  ('Booking.com',6),('Expedia',7),('Brevistay',8),('Instagram',9),('Other',10)
on conflict do nothing;

-- GRC counter: one running number per hotel per year -> GRC-2026-018845
create table if not exists public.grc_counters (
  hotel_id  uuid not null references public.hotels(id),
  year      int  not null,
  last_no   int  not null default 0,
  primary key (hotel_id, year)
);

-- ---------------------------------------------------------------------
-- 2. STAYS (one row per guest check-in = one GRC)
-- ---------------------------------------------------------------------
create table if not exists public.stays (
  id                    uuid primary key default gen_random_uuid(),
  hotel_id              uuid not null references public.hotels(id),
  grc_number            text not null,

  -- guest
  guest_name            text not null,
  mobile                text not null check (mobile ~ '^[0-9+ -]{7,15}$'),
  address               text,
  id_proof_type         text,
  id_proof_number       text,
  purpose_of_visit      text,

  -- booking
  booking_source        text references public.booking_sources(name),
  booking_id            text,
  number_of_guests      int  not null default 1 check (number_of_guests > 0),
  number_of_rooms       int  not null default 1 check (number_of_rooms > 0),
  room_numbers          text[] not null,                       -- fast display, no join

  -- timing (all timestamptz, shown in IST)
  stay_type             text not null default 'NIGHTLY' check (stay_type in ('NIGHTLY','HOURLY')),
  hours                 int  check (hours is null or hours > 0),
  checkin_at            timestamptz not null default now(),
  original_checkout_at  timestamptz not null,                  -- NEVER changes
  current_checkout_at   timestamptz not null,                  -- moves on every extension
  actual_checkout_at    timestamptz,

  status                text not null default 'ACTIVE' check (status in ('ACTIVE','CHECKED_OUT','CANCELLED')),
  checkout_type         text check (checkout_type in ('MANUAL','AUTO')),
  extension_count       int  not null default 0,

  -- money (cached by triggers from segments + payments)
  total_amount          numeric(12,2) not null default 0,
  total_paid            numeric(12,2) not null default 0,
  balance               numeric(12,2) generated always as (total_amount - total_paid) stored,
  payment_status        text generated always as (
                          case when total_amount > 0 and total_paid >= total_amount then 'PAID'
                               when total_paid > 0 then 'PARTIAL'
                               else 'PENDING' end) stored,
  payment_mode_summary  text,                                  -- CASH/GPAY/CARD/ONLINE/MULTIPLE

  created_by            uuid references auth.users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint hourly_needs_hours check (stay_type = 'NIGHTLY' or hours is not null),
  constraint checkout_after_checkin check (original_checkout_at > checkin_at and current_checkout_at > checkin_at),
  unique (hotel_id, grc_number)
);

-- One ACTIVE row per room -> a room can never be double-booked
create table if not exists public.stay_rooms (
  id           uuid primary key default gen_random_uuid(),
  stay_id      uuid not null references public.stays(id) on delete cascade,
  hotel_id     uuid not null,
  room_number  text not null,
  is_active    boolean not null default true,
  foreign key (hotel_id, room_number) references public.rooms(hotel_id, room_number)
);
create unique index if not exists uq_active_room on public.stay_rooms(hotel_id, room_number) where is_active;
create index if not exists idx_stay_rooms_stay on public.stay_rooms(stay_id);

-- ---------------------------------------------------------------------
-- 3. STAY SEGMENTS  (seq 1 = original booking, 2,3,4... = each extension)
-- ---------------------------------------------------------------------
create table if not exists public.stay_segments (
  id               uuid primary key default gen_random_uuid(),
  stay_id          uuid not null references public.stays(id) on delete cascade,
  hotel_id         uuid not null references public.hotels(id),
  seq              int  not null,
  kind             text not null check (kind in ('INITIAL','EXTENSION')),
  from_at          timestamptz not null,
  to_at            timestamptz not null,
  booking_source   text references public.booking_sources(name),
  booking_id       text,
  number_of_rooms  int,
  number_of_guests int,
  amount           numeric(12,2) not null default 0 check (amount >= 0),
  reason           text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  unique (stay_id, seq),
  check (to_at > from_at)
);
create index if not exists idx_segments_stay on public.stay_segments(stay_id);

-- ---------------------------------------------------------------------
-- 4. PAYMENTS LEDGER (one row per mode per payment; advance + balance later)
--    "Multiple" in the UI = several rows here. Never stored as a mode.
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  stay_id       uuid not null references public.stays(id) on delete cascade,
  segment_id    uuid references public.stay_segments(id) on delete set null,
  hotel_id      uuid not null references public.hotels(id),
  amount        numeric(12,2) not null check (amount > 0),
  mode          text not null check (mode in ('CASH','GPAY','CARD','ONLINE')),
  kind          text not null check (kind in ('CHECKIN','EXTENSION','BALANCE','REFUND')),
  reference_no  text,
  note          text,
  paid_at       timestamptz not null default now(),
  received_by   uuid references auth.users(id)
);
create index if not exists idx_payments_stay on public.payments(stay_id);
create index if not exists idx_payments_hotel_paid on public.payments(hotel_id, paid_at desc);

-- ---------------------------------------------------------------------
-- 5. AUDIT LOG
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   uuid,
  action      text not null,
  actor       uuid,
  old_data    jsonb,
  new_data    jsonb,
  at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. INDEXES FOR SPEED
-- ---------------------------------------------------------------------
create index if not exists idx_stays_active   on public.stays(hotel_id, current_checkout_at) where status = 'ACTIVE';
create index if not exists idx_stays_report   on public.stays(hotel_id, checkin_at desc);
create index if not exists idx_stays_status   on public.stays(hotel_id, status, checkin_at desc);
create index if not exists idx_stays_pending  on public.stays(hotel_id) where total_paid < total_amount;
create index if not exists idx_stays_mobile   on public.stays(mobile);
create index if not exists idx_stays_name_trgm on public.stays using gin (guest_name gin_trgm_ops);
create index if not exists idx_stays_grc_trgm  on public.stays using gin (grc_number gin_trgm_ops);

-- ---------------------------------------------------------------------
-- 7. HELPER FUNCTIONS (roles)
-- ---------------------------------------------------------------------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = (select auth.uid()) and is_active
$$;

create or replace function public.my_hotel() returns uuid
language sql stable security definer set search_path = public as $$
  select hotel_id from public.profiles where id = (select auth.uid()) and is_active
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

create or replace function public.can_access_hotel(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or (h is not null and h = public.my_hotel())
$$;

-- ---------------------------------------------------------------------
-- 8. TRIGGERS
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_stays_updated on public.stays;
create trigger trg_stays_updated before update on public.stays
  for each row execute function public.set_updated_at();

-- Keep stays.total_amount / total_paid / payment_mode_summary always correct
create or replace function public.recompute_stay_totals() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_stay uuid := coalesce(new.stay_id, old.stay_id);
begin
  update public.stays s set
    total_amount = coalesce((select sum(amount) from public.stay_segments where stay_id = v_stay), 0),
    total_paid   = coalesce((select sum(case when kind = 'REFUND' then -amount else amount end)
                             from public.payments where stay_id = v_stay), 0),
    payment_mode_summary = (select case count(distinct mode) when 0 then null when 1 then max(mode) else 'MULTIPLE' end
                            from public.payments where stay_id = v_stay and kind <> 'REFUND')
  where s.id = v_stay;
  return null;
end $$;

drop trigger if exists trg_totals_payments on public.payments;
create trigger trg_totals_payments after insert or update or delete on public.payments
  for each row execute function public.recompute_stay_totals();
drop trigger if exists trg_totals_segments on public.stay_segments;
create trigger trg_totals_segments after insert or update or delete on public.stay_segments
  for each row execute function public.recompute_stay_totals();

create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log(table_name, record_id, action, actor, old_data, new_data)
  values (tg_table_name, coalesce(new.id, old.id), tg_op, auth.uid(),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $$;

drop trigger if exists trg_audit_payments on public.payments;
create trigger trg_audit_payments after insert or update or delete on public.payments
  for each row execute function public.audit_row();
drop trigger if exists trg_audit_segments on public.stay_segments;
create trigger trg_audit_segments after insert or update or delete on public.stay_segments
  for each row execute function public.audit_row();
drop trigger if exists trg_audit_stays_del on public.stays;
create trigger trg_audit_stays_del after delete on public.stays
  for each row execute function public.audit_row();
drop trigger if exists trg_audit_stays_upd on public.stays;
create trigger trg_audit_stays_upd after update on public.stays
  for each row when (old.status is distinct from new.status
                  or old.guest_name is distinct from new.guest_name
                  or old.mobile is distinct from new.mobile
                  or old.id_proof_number is distinct from new.id_proof_number
                  or old.current_checkout_at is distinct from new.current_checkout_at)
  execute function public.audit_row();

-- ---------------------------------------------------------------------
-- 9. BUSINESS FUNCTIONS
-- ---------------------------------------------------------------------

-- 9.1  GRC number  -> GRC-2026-018845 (year in IST, running no. per hotel)
create or replace function public.next_grc_number(p_hotel uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_year int := extract(year from (now() at time zone 'Asia/Kolkata'))::int;
  v_no   int;
begin
  insert into public.grc_counters(hotel_id, year, last_no) values (p_hotel, v_year, 1)
  on conflict (hotel_id, year) do update set last_no = public.grc_counters.last_no + 1
  returning last_no into v_no;
  return 'GRC-' || v_year || '-' || lpad(v_no::text, 6, '0');
end $$;

-- 9.2  Default checkout: hotel checkout_time (11:00) on day (check-in date IST + nights)
create or replace function public.default_checkout(p_hotel uuid, p_checkin timestamptz, p_nights int default 1)
returns timestamptz language sql stable set search_path = public as $$
  select (((p_checkin at time zone 'Asia/Kolkata')::date + greatest(p_nights,1)) + h.checkout_time)
         at time zone 'Asia/Kolkata'
  from public.hotels h where h.id = p_hotel
$$;

-- 9.3  Insert payment rows. Rules: distinct modes, amount > 0, mode in CASH/GPAY/CARD/ONLINE
create or replace function public._apply_payments(p_stay uuid, p_seg uuid, p_hotel uuid, p_pay jsonb, p_kind text)
returns numeric language plpgsql security definer set search_path = public as $$
declare r record; v_sum numeric := 0; v_modes text[] := '{}';
begin
  if p_pay is null or jsonb_typeof(p_pay) <> 'array' then return 0; end if;
  for r in
    select upper(trim(t.e->>'mode')) as mode,
           nullif(t.e->>'amount','')::numeric as amount,
           t.e->>'reference_no' as ref
    from jsonb_array_elements(p_pay) as t(e)
  loop
    if r.amount is null or r.amount <= 0 then continue; end if;
    if r.mode not in ('CASH','GPAY','CARD','ONLINE') then
      raise exception 'Invalid payment mode: %', r.mode;
    end if;
    if r.mode = any(v_modes) then raise exception 'Payment mode % given twice', r.mode; end if;
    v_modes := v_modes || r.mode;
    insert into public.payments(stay_id, segment_id, hotel_id, amount, mode, kind, reference_no, received_by)
    values (p_stay, p_seg, p_hotel, r.amount, r.mode, p_kind, r.ref, auth.uid());
    v_sum := v_sum + r.amount;
  end loop;
  return v_sum;
end $$;

create or replace function public._assert_not_overpaid(p_stay uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s record;
begin
  select total_amount, total_paid into s from public.stays where id = p_stay;
  if s.total_paid > s.total_amount then
    raise exception 'Amount paid (%) is more than amount due (%)', s.total_paid, s.total_amount;
  end if;
end $$;

-- 9.4  CREATE STAY (check-in + GRC + advance payment) in ONE transaction
/* payload example:
{
 "hotel_id":"<uuid>", "guest_name":"Ridhi Malawade", "mobile":"9620675844",
 "address":"CHIKSANDRA BANGALORE 560061", "id_proof_type":"Aadhaar Card",
 "id_proof_number":"229482403570", "purpose_of_visit":"INTERVIEW",
 "booking_source":"Goibibo", "booking_id":"GH21188282485172",
 "number_of_guests":1, "room_numbers":["203"],
 "stay_type":"NIGHTLY", "nights":1,            -- or "HOURLY" with "hours":3
 "checkout_at": null,                           -- optional manual override (ISO)
 "total_amount":1843,
 "payments":[{"mode":"ONLINE","amount":1843}]   -- [] if nothing paid; advance = less than total
}*/
create or replace function public.create_stay(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_hotel    uuid := (p->>'hotel_id')::uuid;
  v_checkin  timestamptz := coalesce(nullif(p->>'checkin_at','')::timestamptz, now());
  v_type     text := upper(coalesce(p->>'stay_type','NIGHTLY'));
  v_hours    int  := nullif(p->>'hours','')::int;
  v_nights   int  := coalesce(nullif(p->>'nights','')::int, 1);
  v_override timestamptz := nullif(p->>'checkout_at','')::timestamptz;
  v_checkout timestamptz;
  v_rooms    text[];
  v_total    numeric(12,2) := coalesce(nullif(p->>'total_amount','')::numeric, 0);
  v_stay     uuid := gen_random_uuid();
  v_seg      uuid := gen_random_uuid();
  v_grc      text;
  v_busy     text;
begin
  if not public.can_access_hotel(v_hotel) then raise exception 'Not allowed for this hotel'; end if;
  if coalesce(trim(p->>'guest_name'),'') = '' then raise exception 'Guest name is required'; end if;

  select array_agg(distinct trim(value)) into v_rooms from jsonb_array_elements_text(p->'room_numbers');
  if v_rooms is null or array_length(v_rooms,1) = 0 then raise exception 'Select at least one room'; end if;

  select room_number into v_busy from public.stay_rooms
   where hotel_id = v_hotel and is_active and room_number = any(v_rooms) limit 1;
  if found then raise exception 'Room % is already occupied', v_busy; end if;

  if v_type = 'HOURLY' then
    if v_hours is null or v_hours <= 0 then raise exception 'Enter number of hours'; end if;
    v_checkout := coalesce(v_override, v_checkin + make_interval(hours => v_hours));
  else
    v_hours := null;
    v_checkout := coalesce(v_override, public.default_checkout(v_hotel, v_checkin, v_nights));
  end if;
  if v_checkout <= v_checkin then raise exception 'Checkout must be after check-in'; end if;

  v_grc := public.next_grc_number(v_hotel);

  insert into public.stays(id, hotel_id, grc_number, guest_name, mobile, address, id_proof_type, id_proof_number,
      purpose_of_visit, booking_source, booking_id, number_of_guests, number_of_rooms, room_numbers,
      stay_type, hours, checkin_at, original_checkout_at, current_checkout_at, created_by)
  values (v_stay, v_hotel, v_grc, trim(p->>'guest_name'), trim(p->>'mobile'), p->>'address',
      p->>'id_proof_type', p->>'id_proof_number', p->>'purpose_of_visit',
      nullif(p->>'booking_source',''), p->>'booking_id',
      coalesce(nullif(p->>'number_of_guests','')::int,1), array_length(v_rooms,1), v_rooms,
      v_type, v_hours, v_checkin, v_checkout, v_checkout, auth.uid());

  begin
    insert into public.stay_rooms(stay_id, hotel_id, room_number)
    select v_stay, v_hotel, unnest(v_rooms);
  exception
    when unique_violation then raise exception 'One of the selected rooms was just taken';
    when foreign_key_violation then raise exception 'Unknown room number for this hotel';
  end;

  insert into public.stay_segments(id, stay_id, hotel_id, seq, kind, from_at, to_at, booking_source, booking_id,
      number_of_rooms, number_of_guests, amount, created_by)
  values (v_seg, v_stay, v_hotel, 1, 'INITIAL', v_checkin, v_checkout, nullif(p->>'booking_source',''),
      p->>'booking_id', array_length(v_rooms,1), coalesce(nullif(p->>'number_of_guests','')::int,1),
      v_total, auth.uid());

  perform public._apply_payments(v_stay, v_seg, v_hotel, p->'payments', 'CHECKIN');
  perform public._assert_not_overpaid(v_stay);

  return jsonb_build_object('stay_id', v_stay, 'grc_number', v_grc, 'checkout_at', v_checkout);
end $$;

-- 9.5  EXTEND STAY (unlimited times). Also re-opens a stay that was auto-checked-out
--      within the last 24h if its rooms are still free.
/* p example:
{ "new_checkout": "2026-11-28T05:30:00Z"  (null => next day 11:00 IST after current checkout),
  "reason":"Interview postponed", "booking_source":"Walk-in", "booking_id":null,
  "number_of_rooms":1, "number_of_guests":1, "amount":1500,
  "payments":[{"mode":"CASH","amount":500},{"mode":"GPAY","amount":500}] } */
create or replace function public.extend_stay(p_stay uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s          public.stays%rowtype;
  v_new      timestamptz;
  v_seq      int;
  v_seg      uuid := gen_random_uuid();
  v_amount   numeric(12,2) := coalesce(nullif(p->>'amount','')::numeric, 0);
  v_checkout time;
begin
  select * into s from public.stays where id = p_stay for update;
  if not found then raise exception 'Stay not found'; end if;
  if not public.can_access_hotel(s.hotel_id) then raise exception 'Not allowed'; end if;

  if s.status = 'CHECKED_OUT' and s.checkout_type = 'AUTO' and s.actual_checkout_at > now() - interval '24 hours' then
    begin
      update public.stay_rooms set is_active = true where stay_id = s.id;
    exception when unique_violation then
      raise exception 'Room has been given to another guest. Cannot extend.';
    end;
    update public.stays set status = 'ACTIVE', actual_checkout_at = null, checkout_type = null where id = s.id;
  elsif s.status <> 'ACTIVE' then
    raise exception 'Only an active stay can be extended';
  end if;

  select checkout_time into v_checkout from public.hotels where id = s.hotel_id;
  v_new := coalesce(nullif(p->>'new_checkout','')::timestamptz,
                    (((s.current_checkout_at at time zone 'Asia/Kolkata')::date + 1) + v_checkout) at time zone 'Asia/Kolkata');
  if v_new <= s.current_checkout_at then raise exception 'New checkout must be after current checkout'; end if;

  select coalesce(max(seq),1) + 1 into v_seq from public.stay_segments where stay_id = s.id;

  insert into public.stay_segments(id, stay_id, hotel_id, seq, kind, from_at, to_at, booking_source, booking_id,
      number_of_rooms, number_of_guests, amount, reason, created_by)
  values (v_seg, s.id, s.hotel_id, v_seq, 'EXTENSION', s.current_checkout_at, v_new,
      coalesce(nullif(p->>'booking_source',''), s.booking_source), p->>'booking_id',
      coalesce(nullif(p->>'number_of_rooms','')::int, s.number_of_rooms),
      coalesce(nullif(p->>'number_of_guests','')::int, s.number_of_guests),
      v_amount, p->>'reason', auth.uid());

  update public.stays set current_checkout_at = v_new, extension_count = extension_count + 1 where id = s.id;

  perform public._apply_payments(s.id, v_seg, s.hotel_id, p->'payments', 'EXTENSION');
  perform public._assert_not_overpaid(s.id);

  return jsonb_build_object('stay_id', s.id, 'extension_no', v_seq - 1, 'current_checkout_at', v_new);
end $$;

-- 9.6  COLLECT BALANCE LATER (works for active AND checked-out stays)
/* p_payments example: [{"mode":"CASH","amount":300},{"mode":"GPAY","amount":200}] */
create or replace function public.add_payment(p_stay uuid, p_payments jsonb, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.stays%rowtype; v_sum numeric;
begin
  select * into s from public.stays where id = p_stay for update;
  if not found then raise exception 'Stay not found'; end if;
  if not public.can_access_hotel(s.hotel_id) then raise exception 'Not allowed'; end if;
  if s.status = 'CANCELLED' then raise exception 'Stay is cancelled'; end if;

  v_sum := public._apply_payments(s.id, null, s.hotel_id, p_payments, 'BALANCE');
  if v_sum <= 0 then raise exception 'Enter a payment amount'; end if;
  if p_note is not null then
    update public.payments set note = p_note where stay_id = s.id and kind = 'BALANCE' and paid_at >= now() - interval '5 seconds';
  end if;
  perform public._assert_not_overpaid(s.id);

  select * into s from public.stays where id = p_stay;
  return jsonb_build_object('total_paid', s.total_paid, 'balance', s.balance, 'payment_status', s.payment_status);
end $$;

-- 9.7  MANUAL CHECKOUT (blocks if balance pending unless p_allow_balance = true)
create or replace function public.checkout_stay(p_stay uuid, p_allow_balance boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.stays%rowtype;
begin
  select * into s from public.stays where id = p_stay for update;
  if not found then raise exception 'Stay not found'; end if;
  if not public.can_access_hotel(s.hotel_id) then raise exception 'Not allowed'; end if;
  if s.status <> 'ACTIVE' then raise exception 'Stay is not active'; end if;
  if s.balance > 0 and not p_allow_balance then
    raise exception 'Balance of Rs % is pending. Collect it or confirm checkout with balance.', s.balance;
  end if;
  update public.stays set status = 'CHECKED_OUT', checkout_type = 'MANUAL', actual_checkout_at = now() where id = s.id;
  update public.stay_rooms set is_active = false where stay_id = s.id;
  return jsonb_build_object('stay_id', s.id, 'balance', s.balance);
end $$;

-- 9.8  AUTO CHECKOUT (cron every minute) -> moves expired stays out of Home into Reports
create or replace function public.auto_checkout_expired() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.stays s
     set status = 'CHECKED_OUT', checkout_type = 'AUTO', actual_checkout_at = s.current_checkout_at
    from public.hotels h
   where h.id = s.hotel_id and s.status = 'ACTIVE'
     and s.current_checkout_at + make_interval(mins => h.auto_checkout_grace_minutes) <= now();
  get diagnostics n = row_count;

  update public.stay_rooms r set is_active = false
    from public.stays s
   where r.stay_id = s.id and r.is_active and s.status <> 'ACTIVE';
  return n;
end $$;

-- 9.9  FIX GUEST DETAILS (typo correction by receptionist)
create or replace function public.update_guest_details(p_stay uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_hotel uuid;
begin
  select hotel_id into v_hotel from public.stays where id = p_stay;
  if not public.can_access_hotel(v_hotel) then raise exception 'Not allowed'; end if;
  update public.stays set
    guest_name       = coalesce(nullif(trim(p->>'guest_name'),''), guest_name),
    mobile           = coalesce(nullif(trim(p->>'mobile'),''), mobile),
    address          = coalesce(p->>'address', address),
    id_proof_type    = coalesce(p->>'id_proof_type', id_proof_type),
    id_proof_number  = coalesce(p->>'id_proof_number', id_proof_number),
    purpose_of_visit = coalesce(p->>'purpose_of_visit', purpose_of_visit),
    booking_id       = coalesce(p->>'booking_id', booking_id),
    number_of_guests = coalesce(nullif(p->>'number_of_guests','')::int, number_of_guests)
  where id = p_stay;
end $$;

-- ---------------------------------------------------------------------
-- 10. VIEWS + REPORT FUNCTIONS
-- ---------------------------------------------------------------------

-- HOME SCREEN: only guests still inside their stay time
create or replace view public.v_active_stays with (security_invoker = true) as
select s.id, s.hotel_id, s.grc_number, s.guest_name, s.mobile, s.room_numbers, s.stay_type,
       s.booking_source, s.number_of_guests, s.checkin_at, s.current_checkout_at,
       s.total_amount, s.total_paid, s.balance, s.payment_status, s.payment_mode_summary, s.extension_count
from public.stays s
join public.hotels h on h.id = s.hotel_id
where s.status = 'ACTIVE'
  and s.current_checkout_at + make_interval(mins => h.auto_checkout_grace_minutes) > now();

-- REPORT SCREEN: filters + search + pagination (use p_limit / p_offset)
create or replace function public.report_stays(
  p_hotel          uuid    default null,
  p_from           timestamptz default null,
  p_to             timestamptz default null,
  p_status         text    default null,      -- ACTIVE | CHECKED_OUT | CANCELLED
  p_source         text    default null,
  p_payment_mode   text    default null,      -- CASH | GPAY | CARD | ONLINE
  p_payment_status text    default null,      -- PAID | PARTIAL | PENDING
  p_extended       boolean default null,
  p_search         text    default null,      -- name / mobile / GRC / booking id / room
  p_limit          int     default 50,
  p_offset         int     default 0
) returns table (
  id uuid, hotel_id uuid, hotel_code text, grc_number text, guest_name text, mobile text,
  room_numbers text[], booking_source text, booking_id text, stay_type text,
  checkin_at timestamptz, original_checkout_at timestamptz, current_checkout_at timestamptz,
  actual_checkout_at timestamptz, status text, total_amount numeric, total_paid numeric,
  balance numeric, payment_status text, payment_mode_summary text, extension_count int,
  total_count bigint
) language sql stable set search_path = public as $$
  select s.id, s.hotel_id, h.code, s.grc_number, s.guest_name, s.mobile,
         s.room_numbers, s.booking_source, s.booking_id, s.stay_type,
         s.checkin_at, s.original_checkout_at, s.current_checkout_at,
         s.actual_checkout_at, s.status, s.total_amount, s.total_paid,
         s.balance, s.payment_status, s.payment_mode_summary, s.extension_count,
         count(*) over()
  from public.stays s
  join public.hotels h on h.id = s.hotel_id
  where (p_hotel is null or s.hotel_id = p_hotel)
    and (p_from is null or s.checkin_at >= p_from)
    and (p_to   is null or s.checkin_at <  p_to)
    and (p_status is null or s.status = p_status)
    and (p_source is null or s.booking_source = p_source)
    and (p_payment_status is null or s.payment_status = p_payment_status)
    and (p_extended is null or (s.extension_count > 0) = p_extended)
    and (p_payment_mode is null or exists (
          select 1 from public.payments p where p.stay_id = s.id and p.mode = p_payment_mode))
    and (p_search is null or p_search = '' or
         s.guest_name ilike '%' || p_search || '%' or
         s.mobile like '%' || p_search || '%' or
         s.grc_number ilike '%' || p_search || '%' or
         s.booking_id ilike '%' || p_search || '%' or
         p_search = any (s.room_numbers))
  order by s.checkin_at desc
  limit least(greatest(p_limit,1), 200) offset greatest(p_offset,0)
$$;

-- ONE CALL gives everything needed to print the GRC (hotel, stay, extensions, payments)
create or replace function public.get_grc(p_stay uuid) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'hotel', to_jsonb(h),
    'stay',  to_jsonb(s),
    'segments', (select coalesce(jsonb_agg(to_jsonb(g) order by g.seq), '[]'::jsonb)
                 from public.stay_segments g where g.stay_id = s.id),
    'payments', (select coalesce(jsonb_agg(to_jsonb(p) order by p.paid_at), '[]'::jsonb)
                 from public.payments p where p.stay_id = s.id))
  from public.stays s join public.hotels h on h.id = s.hotel_id
  where s.id = p_stay
$$;

-- Daily collection by mode (admin dashboard charts)
create or replace view public.v_daily_collections with (security_invoker = true) as
select hotel_id, (paid_at at time zone 'Asia/Kolkata')::date as day, mode,
       sum(case when kind = 'REFUND' then -amount else amount end) as amount, count(*) as txns
from public.payments group by 1,2,3;

-- ADMIN DASHBOARD summary (dates are IST dates)
create or replace function public.admin_summary(p_from date, p_to date, p_hotel uuid default null) returns jsonb
language plpgsql stable set search_path = public as $$
declare
  v_from timestamptz := (p_from::timestamp) at time zone 'Asia/Kolkata';
  v_to   timestamptz := ((p_to + 1)::timestamp) at time zone 'Asia/Kolkata';
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  return jsonb_build_object(
    'stays',           (select count(*) from public.stays where checkin_at >= v_from and checkin_at < v_to and (p_hotel is null or hotel_id = p_hotel)),
    'active_now',      (select count(*) from public.stays where status = 'ACTIVE' and (p_hotel is null or hotel_id = p_hotel)),
    'billed',          (select coalesce(sum(total_amount),0) from public.stays where checkin_at >= v_from and checkin_at < v_to and (p_hotel is null or hotel_id = p_hotel)),
    'pending_balance', (select coalesce(sum(total_amount - total_paid),0) from public.stays where total_paid < total_amount and (p_hotel is null or hotel_id = p_hotel)),
    'extensions',      (select count(*) from public.stay_segments where seq > 1 and created_at >= v_from and created_at < v_to and (p_hotel is null or hotel_id = p_hotel)),
    'collected_by_mode', (select coalesce(jsonb_object_agg(mode, amt), '{}'::jsonb) from (
        select mode, sum(case when kind = 'REFUND' then -amount else amount end) amt
        from public.payments where paid_at >= v_from and paid_at < v_to and (p_hotel is null or hotel_id = p_hotel)
        group by mode) t),
    'stays_by_source', (select coalesce(jsonb_object_agg(src, c), '{}'::jsonb) from (
        select coalesce(booking_source,'Unknown') src, count(*) c
        from public.stays where checkin_at >= v_from and checkin_at < v_to and (p_hotel is null or hotel_id = p_hotel)
        group by 1) t)
  );
end $$;

-- ---------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY
--     Receptionists READ their own hotel only; all their WRITES go through
--     the functions above. Admin can read/write everything.
-- ---------------------------------------------------------------------
alter table public.hotels          enable row level security;
alter table public.profiles        enable row level security;
alter table public.rooms           enable row level security;
alter table public.booking_sources enable row level security;
alter table public.grc_counters    enable row level security;
alter table public.stays           enable row level security;
alter table public.stay_rooms      enable row level security;
alter table public.stay_segments   enable row level security;
alter table public.payments        enable row level security;
alter table public.audit_log       enable row level security;

do $$
declare t text;
begin
  foreach t in array array['hotels','profiles','rooms','booking_sources','stays','stay_rooms','stay_segments','payments','audit_log']
  loop
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists staff_read on public.hotels;
create policy staff_read on public.hotels for select to authenticated using (public.can_access_hotel(id));
drop policy if exists own_profile on public.profiles;
create policy own_profile on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists staff_read on public.rooms;
create policy staff_read on public.rooms for select to authenticated using (public.can_access_hotel(hotel_id));
drop policy if exists staff_read on public.booking_sources;
create policy staff_read on public.booking_sources for select to authenticated using (true);
drop policy if exists staff_read on public.stays;
create policy staff_read on public.stays for select to authenticated using (public.can_access_hotel(hotel_id));
drop policy if exists staff_read on public.stay_rooms;
create policy staff_read on public.stay_rooms for select to authenticated using (public.can_access_hotel(hotel_id));
drop policy if exists staff_read on public.stay_segments;
create policy staff_read on public.stay_segments for select to authenticated using (public.can_access_hotel(hotel_id));
drop policy if exists staff_read on public.payments;
create policy staff_read on public.payments for select to authenticated using (public.can_access_hotel(hotel_id));

-- Only logged-in users may call functions
revoke execute on all functions in schema public from public, anon;
grant  execute on all functions in schema public to authenticated;

-- ---------------------------------------------------------------------
-- 12. AUTO CHECKOUT SCHEDULE (every minute) + LIVE UPDATES
-- ---------------------------------------------------------------------
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule('auto-checkout') where exists (select 1 from cron.job where jobname = 'auto-checkout');
  perform cron.schedule('auto-checkout', '* * * * *', 'select public.auto_checkout_expired()');
exception when others then
  raise notice 'pg_cron not enabled. Enable it in Dashboard > Database > Extensions, then re-run this block. (%)', sqlerrm;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.stays;
exception when others then null;
end $$;

-- ---------------------------------------------------------------------
-- 13. SEED DATA  (edit before running!)
-- ---------------------------------------------------------------------
insert into public.hotels(code, name, address, phone) values
  ('MYL14', 'Starlight Hotels Mylapore',   'Mylapore, Chennai',      null),
  ('KDL01', 'Starlight Hotels Kodaikanal', 'Kodaikanal, Tamil Nadu', null)   -- <- change code/address
on conflict (code) do nothing;

-- Example rooms (change to your real room numbers):
-- insert into public.rooms(hotel_id, room_number, room_type)
-- select h.id, r, 'Standard' from public.hotels h, unnest(array['101','102','103','201','202','203']) r
-- where h.code = 'MYL14' on conflict do nothing;

-- Create staff: first add the user in Supabase > Authentication > Users, then:
-- insert into public.profiles(id, full_name, role, hotel_id)
-- values ('<auth-user-uuid>', 'Admin',        'admin',        null);
-- insert into public.profiles(id, full_name, role, hotel_id)
-- values ('<auth-user-uuid>', 'Reception KDL','receptionist', (select id from public.hotels where code='KDL01'));
