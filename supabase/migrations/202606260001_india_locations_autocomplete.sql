create table if not exists public.india_locations (
  id uuid primary key default gen_random_uuid(),
  pincode text not null check (pincode ~ '^[0-9]{6}$'),
  city_name text not null,
  district text not null,
  state_name text not null,
  search_text text generated always as (
    lower(city_name || ' ' || district || ' ' || state_name || ' ' || pincode)
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pincode, city_name, district, state_name)
);

create index if not exists india_locations_city_name_idx
on public.india_locations (lower(city_name) text_pattern_ops);

create index if not exists india_locations_search_text_idx
on public.india_locations using gin (to_tsvector('simple', search_text));

create index if not exists india_locations_pincode_idx
on public.india_locations (pincode);

drop trigger if exists india_locations_updated_at on public.india_locations;
create trigger india_locations_updated_at
before update on public.india_locations
for each row execute function public.set_updated_at();

alter table public.india_locations enable row level security;

drop policy if exists "Anyone can read India location autocomplete data" on public.india_locations;
create policy "Anyone can read India location autocomplete data"
on public.india_locations
for select
to anon, authenticated
using (true);
