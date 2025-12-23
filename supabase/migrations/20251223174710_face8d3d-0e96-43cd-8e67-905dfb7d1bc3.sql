-- New Dark Tech V2 hierarchy & finance schema (fixed, no IF NOT EXISTS on policies)

-- 1) Vendors table (one row per vendor user)
create table if not exists public.vendors (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_blocked boolean not null default false,
  access_expires_at timestamptz,
  mercado_pago_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vendors enable row level security;

-- Admins can manage all vendors
create policy "Vendors admin manage all"
  on public.vendors
  as permissive
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Vendor can view and edit own vendor row
create policy "Vendors self view"
  on public.vendors
  as permissive
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Vendors self update"
  on public.vendors
  as permissive
  for update
  to authenticated
  using (auth.uid() = id);

-- 2) Vendor <-> Clients relationships
create table if not exists public.vendor_clients (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  is_blocked boolean not null default false,
  access_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, client_id)
);

alter table public.vendor_clients enable row level security;

-- Admins manage all vendor_clients
create policy "Vendor clients admin manage all"
  on public.vendor_clients
  as permissive
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Vendor can see and manage their own clients
create policy "Vendor clients by vendor"
  on public.vendor_clients
  as permissive
  for select
  to authenticated
  using (vendor_id = auth.uid());

create policy "Vendor clients insert by vendor"
  on public.vendor_clients
  as permissive
  for insert
  to authenticated
  with check (vendor_id = auth.uid());

create policy "Vendor clients update by vendor"
  on public.vendor_clients
  as permissive
  for update
  to authenticated
  using (vendor_id = auth.uid());

-- Client can see which vendor they belong to
create policy "Vendor clients by client"
  on public.vendor_clients
  as permissive
  for select
  to authenticated
  using (client_id = auth.uid());

-- 3) Vendor <-> Drivers relationships
create table if not exists public.vendor_drivers (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  driver_id uuid not null references auth.users(id) on delete cascade,
  is_blocked boolean not null default false,
  access_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, driver_id)
);

alter table public.vendor_drivers enable row level security;

-- Admins manage all vendor_drivers
create policy "Vendor drivers admin manage all"
  on public.vendor_drivers
  as permissive
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Vendor can see and manage their own drivers
create policy "Vendor drivers by vendor"
  on public.vendor_drivers
  as permissive
  for select
  to authenticated
  using (vendor_id = auth.uid());

create policy "Vendor drivers insert by vendor"
  on public.vendor_drivers
  as permissive
  for insert
  to authenticated
  with check (vendor_id = auth.uid());

create policy "Vendor drivers update by vendor"
  on public.vendor_drivers
  as permissive
  for update
  to authenticated
  using (vendor_id = auth.uid());

-- Driver can see which vendor they belong to
create policy "Vendor drivers by driver"
  on public.vendor_drivers
  as permissive
  for select
  to authenticated
  using (driver_id = auth.uid());

-- 4) Admin commissions linked to orders and vendors
create table if not exists public.admin_commissions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  commission_cents integer not null,
  commission_rate numeric(5,2),
  created_at timestamptz not null default now()
);

alter table public.admin_commissions enable row level security;

create policy "Admin commissions admin manage all"
  on public.admin_commissions
  as permissive
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 5) Finance view: aggregate orders per vendor
create or replace view public.orders_finance_view as
select
  o.vendor_id,
  count(*) as order_count,
  sum(o.total_cents) as total_cents
from public.orders o
group by o.vendor_id;

grant select on public.orders_finance_view to authenticated;
