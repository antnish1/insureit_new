create or replace function public.validate_vehicle_manufacturer()
returns trigger
language plpgsql
as $$
begin
  if new.make is null or btrim(new.make) = '' then
    raise exception 'Vehicle manufacturer is required.';
  end if;

  if not exists (
    select 1
    from public.vehicle_manufacturers vm
    where vm.is_active = true
      and lower(vm.name) = lower(btrim(new.make))
  ) then
    raise exception 'Invalid vehicle manufacturer: %. Please choose a manufacturer from the master list.', new.make;
  end if;

  new.make := (
    select vm.name
    from public.vehicle_manufacturers vm
    where vm.is_active = true
      and lower(vm.name) = lower(btrim(new.make))
    order by vm.sort_order, vm.name
    limit 1
  );

  return new;
end;
$$;

drop trigger if exists validate_vehicle_manufacturer_before_save on public.vehicles;

create trigger validate_vehicle_manufacturer_before_save
before insert or update of make on public.vehicles
for each row
execute function public.validate_vehicle_manufacturer();
