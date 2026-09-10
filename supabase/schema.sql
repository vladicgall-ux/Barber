-- BLACK BEARD barbershop schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ========== SERVICES ==========
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price integer not null,          -- price in RUB
  duration_minutes integer not null default 30,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ========== MASTERS ==========
create table if not exists masters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ========== APPOINTMENTS ==========
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references masters(id) on delete restrict,
  service_id uuid not null references services(id) on delete restrict,
  client_name text not null,
  client_phone text not null,
  appointment_date date not null,       -- e.g. 2026-09-15
  appointment_time time not null,       -- e.g. 08:00:00
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  source text default 'web',            -- 'telegram' | 'vk' | 'web'
  created_at timestamptz not null default now()
);

-- Prevent double-booking of the same master/date/time while the slot is active
create unique index if not exists uniq_active_slot
  on appointments (master_id, appointment_date, appointment_time)
  where (status = 'confirmed');

create index if not exists idx_appointments_date_master
  on appointments (appointment_date, master_id);

-- ========== ROW LEVEL SECURITY ==========
-- The app talks to Supabase only from server-side API routes using the
-- service role key, so RLS can stay strict (deny-all to anon/public).
alter table services enable row level security;
alter table masters enable row level security;
alter table appointments enable row level security;

-- Allow public (anon) read-only access to services & masters so the
-- client can optionally fetch them directly if desired. Appointments are
-- only ever read/written through the server (service role bypasses RLS).
create policy "Public can read active services"
  on services for select
  using (is_active = true);

create policy "Public can read active masters"
  on masters for select
  using (is_active = true);

-- ========== SEED DATA ==========
insert into services (name, price, duration_minutes, sort_order) values
  ('Мужская стрижка', 1000, 60, 1),
  ('Детская (до 10 лет)', 800, 45, 2),
  ('Стрижка машинкой', 800, 30, 3),
  ('Оформление бороды', 600, 30, 4),
  ('Окантовка', 300, 15, 5),
  ('Укладка', 300, 15, 6),
  ('Hair tattoo', 300, 20, 7)
on conflict do nothing;

insert into masters (name, sort_order) values
  ('Вадим', 1),
  ('Марсель', 2)
on conflict do nothing;
