-- Doctor Dent — core schema: profiles, specialists, reviews, promotions, appointments.
--
-- Booking rules live in the database (not the app) so every client gets the same checks:
--   * slots are 60 minutes, 09:00–19:00 start times, Monday–Friday, clinic time (Asia/Almaty)
--   * bookable window: today + 13 days, future slots only
--   * one patient per specialist per slot (unique index), no double-booking yourself
-- Patients write appointments and reviews only through the security-definer functions below.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.specialty as enum (
  'Therapist',
  'Surgeon',
  'Implantologist',
  'Orthodontist',
  'Orthopedist',
  'Periodontist',
  'Pediatric dentist'
);

-- "completed" is not stored: a scheduled appointment in the past is a completed visit.
create type public.appointment_status as enum ('scheduled', 'cancelled');

create type public.appointment_type as enum ('First appointment', 'Follow-up appointment');

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user, created by trigger)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text,
  full_name text check (char_length(full_name) <= 120),
  home_address text check (char_length(home_address) <= 240),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Patients read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Patients update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Patients may edit their name and address only; `phone` mirrors auth.users.
revoke update on public.profiles from authenticated;
grant update (full_name, home_address) on public.profiles to authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone) values (new.id, new.phone);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Specialists
-- ---------------------------------------------------------------------------

create table public.specialists (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  specialty public.specialty not null,
  -- Path inside the public `media` storage bucket.
  photo_path text,
  years_of_experience integer not null check (years_of_experience >= 0),
  price_from integer not null check (price_from >= 0), -- tenge
  clinic text not null,
  skills text[] not null default '{}',
  description text not null default '',
  -- Denormalised so lists don't aggregate reviews; kept current by leave_review().
  rating numeric(2, 1) not null default 0 check (rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index specialists_specialty_idx on public.specialists (specialty) where is_active;

alter table public.specialists enable row level security;

create policy "Anyone can read active specialists"
  on public.specialists for select to anon, authenticated
  using (is_active);

-- ---------------------------------------------------------------------------
-- Promotions (Home "Promotions" row)
-- ---------------------------------------------------------------------------

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_path text not null, -- path inside the `media` bucket
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.promotions enable row level security;

create policy "Anyone can read active promotions"
  on public.promotions for select to anon, authenticated
  using (is_active);

-- ---------------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------------

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  specialist_id uuid not null references public.specialists (id),
  starts_at timestamptz not null,
  title text not null default 'Consultation',
  type public.appointment_type not null,
  status public.appointment_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A specialist can't have two live bookings in the same slot.
create unique index appointments_specialist_slot_key
  on public.appointments (specialist_id, starts_at)
  where status = 'scheduled';

create index appointments_patient_starts_at_idx on public.appointments (patient_id, starts_at);

alter table public.appointments enable row level security;

-- Read-only for patients; writes go through book_appointment / cancel_appointment.
create policy "Patients read their own appointments"
  on public.appointments for select to authenticated
  using ((select auth.uid()) = patient_id);

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  specialist_id uuid not null references public.specialists (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  -- One review per visit. Null for reviews imported from before the app.
  appointment_id uuid unique references public.appointments (id) on delete set null,
  author_name text not null,
  rating numeric(2, 1) not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index reviews_specialist_created_idx on public.reviews (specialist_id, created_at desc);

alter table public.reviews enable row level security;

create policy "Anyone can read reviews"
  on public.reviews for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Clinic schedule
-- ---------------------------------------------------------------------------

-- True when `p_starts_at` is a slot patients may book right now.
create function public.is_bookable_slot(p_starts_at timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  with t as (
    select
      p_starts_at at time zone 'Asia/Almaty' as local_start,
      (now() at time zone 'Asia/Almaty')::date as today
  )
  select
    p_starts_at > now()
    and date_trunc('hour', local_start) = local_start
    and extract(hour from local_start) between 9 and 19
    and extract(isodow from local_start) between 1 and 5
    and local_start::date between today and today + 13
  from t;
$$;

-- Every bookable slot in the window for a specialty, with the specialists still free in it.
-- Security definer so it can see other patients' bookings; it only returns specialist ids.
create function public.get_slot_availability(p_specialty public.specialty)
returns table (starts_at timestamptz, free_specialist_ids uuid[])
language sql
stable
security definer
set search_path = ''
as $$
  with days as (
    select generate_series(
      (now() at time zone 'Asia/Almaty')::date::timestamp,
      (now() at time zone 'Asia/Almaty')::date::timestamp + interval '13 days',
      interval '1 day'
    ) as day
  ),
  slots as (
    select (d.day + make_interval(hours => h)) at time zone 'Asia/Almaty' as starts_at
    from days d
    cross join generate_series(9, 19) as h
  )
  select
    s.starts_at,
    coalesce(array_agg(sp.id order by sp.full_name) filter (where sp.id is not null), '{}') as free_specialist_ids
  from slots s
  left join public.specialists sp
    on sp.specialty = p_specialty
    and sp.is_active
    and not exists (
      select 1
      from public.appointments a
      where a.specialist_id = sp.id
        and a.starts_at = s.starts_at
        and a.status = 'scheduled'
    )
  where public.is_bookable_slot(s.starts_at)
  group by s.starts_at
  order by s.starts_at;
$$;

-- ---------------------------------------------------------------------------
-- Patient actions
-- ---------------------------------------------------------------------------

-- Books a slot, or moves an existing appointment when p_reschedule_id is given.
-- Errors (raised as the exception message): not_authenticated, slot_unavailable,
-- specialist_not_found, patient_busy, slot_taken, appointment_not_found.
create function public.book_appointment(
  p_specialist_id uuid,
  p_starts_at timestamptz,
  p_reschedule_id uuid default null
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.appointments;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_bookable_slot(p_starts_at) then
    raise exception 'slot_unavailable';
  end if;

  if not exists (select 1 from public.specialists where id = p_specialist_id and is_active) then
    raise exception 'specialist_not_found';
  end if;

  if exists (
    select 1
    from public.appointments
    where patient_id = v_uid
      and starts_at = p_starts_at
      and status = 'scheduled'
      and id is distinct from p_reschedule_id
  ) then
    raise exception 'patient_busy';
  end if;

  begin
    if p_reschedule_id is null then
      insert into public.appointments (patient_id, specialist_id, starts_at, type)
      values (
        v_uid,
        p_specialist_id,
        p_starts_at,
        case
          when exists (
            select 1
            from public.appointments
            where patient_id = v_uid
              and specialist_id = p_specialist_id
              and status = 'scheduled'
              and starts_at < now()
          ) then 'Follow-up appointment'::public.appointment_type
          else 'First appointment'::public.appointment_type
        end
      )
      returning * into v_row;
    else
      update public.appointments
      set specialist_id = p_specialist_id,
          starts_at = p_starts_at,
          updated_at = now()
      where id = p_reschedule_id
        and patient_id = v_uid
        and status = 'scheduled'
        and starts_at > now()
      returning * into v_row;

      if not found then
        raise exception 'appointment_not_found';
      end if;
    end if;
  exception
    when unique_violation then
      raise exception 'slot_taken';
  end;

  return v_row;
end;
$$;

create function public.cancel_appointment(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.appointments
  set status = 'cancelled', updated_at = now()
  where id = p_appointment_id
    and patient_id = auth.uid()
    and status = 'scheduled'
    and starts_at > now();

  if not found then
    raise exception 'appointment_not_found';
  end if;
end;
$$;

-- Review a completed visit (once). Errors: appointment_not_found, already_reviewed.
create function public.leave_review(p_appointment_id uuid, p_rating numeric, p_body text)
returns public.reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_specialist_id uuid;
  v_author text;
  v_row public.reviews;
begin
  select a.specialist_id into v_specialist_id
  from public.appointments a
  where a.id = p_appointment_id
    and a.patient_id = v_uid
    and a.status = 'scheduled'
    and a.starts_at < now();

  if v_specialist_id is null then
    raise exception 'appointment_not_found';
  end if;

  -- "Dana Sarsenova" → "Dana S.", "Dana" → "Dana", no name → "Patient"
  select case
    when coalesce(trim(p.full_name), '') = '' then 'Patient'
    when position(' ' in trim(p.full_name)) = 0 then trim(p.full_name)
    else split_part(trim(p.full_name), ' ', 1) || ' ' || left(split_part(trim(p.full_name), ' ', 2), 1) || '.'
  end
  into v_author
  from public.profiles p
  where p.id = v_uid;

  begin
    insert into public.reviews (specialist_id, author_id, appointment_id, author_name, rating, body)
    values (v_specialist_id, v_uid, p_appointment_id, coalesce(v_author, 'Patient'), p_rating, trim(p_body))
    returning * into v_row;
  exception
    when unique_violation then
      raise exception 'already_reviewed';
  end;

  update public.specialists
  set rating = round((rating * review_count + p_rating) / (review_count + 1), 1),
      review_count = review_count + 1
  where id = v_specialist_id;

  return v_row;
end;
$$;

-- "Delete profile": removes the auth user; profile, appointments cascade, reviews stay anonymous.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

-- Functions are executable by PUBLIC by default; only signed-in patients may call these.
revoke all on function public.is_bookable_slot(timestamptz) from public, anon;
revoke all on function public.get_slot_availability(public.specialty) from public, anon;
revoke all on function public.book_appointment(uuid, timestamptz, uuid) from public, anon;
revoke all on function public.cancel_appointment(uuid) from public, anon;
revoke all on function public.leave_review(uuid, numeric, text) from public, anon;
revoke all on function public.delete_my_account() from public, anon;

grant execute on function public.is_bookable_slot(timestamptz) to authenticated;
grant execute on function public.get_slot_availability(public.specialty) to authenticated;
grant execute on function public.book_appointment(uuid, timestamptz, uuid) to authenticated;
grant execute on function public.cancel_appointment(uuid) to authenticated;
grant execute on function public.leave_review(uuid, numeric, text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
