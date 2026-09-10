-- BLACK BEARD barbershop schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ========== SERVICES ==========
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price integer not null,          -- price in RUB
  duration_minutes integer not null default 30,
  image_url text,                  -- e.g. /images/services/mens-haircut.png
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

-- ========== USERS (authenticated via Telegram / MAX / code login) ==========
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique,
  max_id bigint unique,
  phone text,
  phone_confirmed boolean not null default false,
  first_name text,
  last_name text,
  is_banned boolean not null default false,
  is_admin boolean not null default false,       -- persisted in DB, survives redeploys/restarts
  admin_master_id uuid references masters(id) on delete set null, -- null = sees all masters' notifications
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_have_an_identity check (telegram_id is not null or max_id is not null)
);

create index if not exists idx_users_telegram_id on users (telegram_id);
create index if not exists idx_users_is_admin on users (is_admin) where (is_admin = true);
create index if not exists idx_users_max_id on users (max_id);

-- ========== AUTH CODES (browser "enter code in the bot" login) ==========
create table if not exists auth_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  poll_token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'expired')),
  telegram_id bigint,
  max_id bigint,
  user_id uuid references users(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- The bot looks up a still-pending code by its 6-digit value.
create index if not exists idx_auth_codes_pending_code
  on auth_codes (code)
  where (status = 'pending');

-- ========== APPOINTMENTS ==========
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references masters(id) on delete restrict,
  service_id uuid not null references services(id) on delete restrict,
  user_id uuid references users(id),
  client_name text not null,
  client_phone text not null,
  appointment_date date not null,       -- e.g. 2026-09-15
  appointment_time time not null,       -- e.g. 08:00:00
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  source text default 'web',            -- 'telegram' | 'max' | 'web'
  admin_confirmed boolean not null default false, -- barber has acknowledged the booking
  reminder_sent boolean not null default false,    -- 1-hour-before reminder already sent
  created_at timestamptz not null default now()
);

-- Prevent double-booking of the same master/date/time while the slot is active
create unique index if not exists uniq_active_slot
  on appointments (master_id, appointment_date, appointment_time)
  where (status = 'confirmed');

create index if not exists idx_appointments_date_master
  on appointments (appointment_date, master_id);

-- ========== CLOSED DATES (admin-set days off) ==========
create table if not exists closed_dates (
  id uuid primary key default gen_random_uuid(),
  master_id uuid references masters(id) on delete cascade, -- null = whole shop closed
  date date not null,
  reason text,
  created_at timestamptz not null default now()
);

-- One shop-wide closure per date, one per-master closure per (date, master).
create unique index if not exists uniq_closed_date_shop
  on closed_dates (date)
  where (master_id is null);

create unique index if not exists uniq_closed_date_master
  on closed_dates (date, master_id)
  where (master_id is not null);

-- ========== ROW LEVEL SECURITY ==========
-- The app talks to Supabase only from server-side API routes using the
-- service role key, so RLS can stay strict (deny-all to anon/public).
alter table services enable row level security;
alter table masters enable row level security;
alter table appointments enable row level security;
alter table users enable row level security;
alter table auth_codes enable row level security;
alter table closed_dates enable row level security;

-- Allow public (anon) read-only access to services & masters so the
-- client can optionally fetch them directly if desired. Appointments are
-- only ever read/written through the server (service role bypasses RLS).
create policy "Public can read active services"
  on services for select
  using (is_active = true);

create policy "Public can read active masters"
  on masters for select
  using (is_active = true);

create policy "Public can read closed dates"
  on closed_dates for select
  using (true);

-- ========== SEED DATA ==========
insert into services (name, price, duration_minutes, image_url, sort_order) values
  ('Мужская стрижка', 1000, 60, '/images/services/mens-haircut.png', 1),
  ('Детская (до 10 лет)', 800, 45, '/images/services/kids-haircut.png', 2),
  ('Стрижка машинкой', 800, 30, '/images/services/machine-haircut.png', 3),
  ('Оформление бороды', 600, 30, '/images/services/beard-styling.png', 4),
  ('Окантовка', 300, 15, null, 5),
  ('Укладка', 300, 15, null, 6),
  ('Hair tattoo', 300, 20, null, 7)
on conflict do nothing;

insert into masters (name, avatar_url, sort_order) values
  ('Вадим', '/images/masters/vadim.png', 1),
  ('Марсель', '/images/masters/marsel.png', 2)
on conflict do nothing;
