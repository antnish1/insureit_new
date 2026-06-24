create table if not exists public.vehicle_manufacturers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  logo_path text,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vehicle_manufacturers_active_sort_idx
on public.vehicle_manufacturers (is_active, sort_order, name);

alter table public.vehicle_manufacturers enable row level security;

drop policy if exists "Authenticated users can read vehicle manufacturers" on public.vehicle_manufacturers;
create policy "Authenticated users can read vehicle manufacturers"
on public.vehicle_manufacturers
for select
using (auth.role() = 'authenticated');

insert into public.vehicle_manufacturers (name, slug, logo_path, sort_order)
values
  ('Ashok Leyland', 'ashok-leyland', '/assets/vehicle-brands/ashok-leyland.svg', 10),
  ('Honda', 'honda', '/assets/vehicle-brands/honda.svg', 20),
  ('Hyundai', 'hyundai', '/assets/vehicle-brands/hyundai.svg', 30),
  ('Kia', 'kia', '/assets/vehicle-brands/kia.svg', 40),
  ('Mahindra', 'mahindra', '/assets/vehicle-brands/mahindra.svg', 50),
  ('Maruti Suzuki', 'maruti-suzuki', '/assets/vehicle-brands/maruti-suzuki.svg', 60),
  ('Tata Motors', 'tata-motors', '/assets/vehicle-brands/tata.svg', 70),
  ('Toyota', 'toyota', '/assets/vehicle-brands/toyota.svg', 80)
on conflict (slug) do update set
  name = excluded.name,
  logo_path = excluded.logo_path,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
