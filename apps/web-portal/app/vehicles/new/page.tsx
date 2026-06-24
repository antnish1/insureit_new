import { createVehicle } from "@/app/actions";
import { VehicleForm } from "@/components/forms";
import { AppShell, PageHeader } from "@/components/shell";
import { createServerSupabaseClient } from "@/lib/auth-server";

type CustomerOption = { id: string; company_name: string | null; contact_name: string };
type ManufacturerOption = { name: string };

export default async function NewVehiclePage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: customers }, { data: manufacturers }] = await Promise.all([
    supabase.from("customers").select("id, company_name, contact_name").order("created_at", { ascending: false }).returns<CustomerOption[]>(),
    supabase.from("vehicle_manufacturers").select("name").eq("is_active", true).order("sort_order", { ascending: true }).order("name", { ascending: true }).returns<ManufacturerOption[]>()
  ]);
  const customerOptions = (customers ?? []).map((customer) => ({ value: customer.id, label: customer.company_name ?? customer.contact_name }));
  const manufacturerOptions = (manufacturers ?? []).map((manufacturer) => ({ value: manufacturer.name, label: manufacturer.name }));

  return <AppShell title="Add vehicle"><PageHeader title="Add vehicle" /><VehicleForm action={createVehicle} customers={customerOptions} manufacturers={manufacturerOptions} submitLabel="Add record" /></AppShell>;
}
