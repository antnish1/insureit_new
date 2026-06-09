import { AppShell, Card, PageHeader } from "@/components/shell";
import { MetricCard, SearchFilterBar } from "@/components/ui";
import { createServerSupabaseClient } from "@/lib/auth-server";

export default async function ReportsPage() {
  const supabase = await createServerSupabaseClient();
  const [claims, customers, policies, vehicles] = await Promise.all([
    supabase.from("claims").select("id", { count: "exact", head: true }),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("policies").select("id", { count: "exact", head: true }),
    supabase.from("vehicles").select("id", { count: "exact", head: true })
  ]);

  return <AppShell><PageHeader title="Reports" description="Operational reporting backed by live Supabase table counts." /><SearchFilterBar searchPlaceholder="Search reports by insurer, branch, status, customer, or date range" filterLabel="Report view" /><div className="grid gap-4 md:grid-cols-4"><MetricCard label="Claims" value={`${claims.count ?? 0}`} hint="Live claim records" tone="navy" icon="◆" /><MetricCard label="Customers" value={`${customers.count ?? 0}`} hint="Live customer records" tone="green" icon="◉" /><MetricCard label="Policies" value={`${policies.count ?? 0}`} hint="Live policy records" tone="amber" icon="◫" /><MetricCard label="Vehicles" value={`${vehicles.count ?? 0}`} hint="Live vehicle records" tone="red" icon="▣" /></div><Card className="mt-6"><h3 className="text-lg font-semibold text-navy-900">Report exports</h3><p className="mt-2 text-sm text-slate-600">Detailed charts and exports can be added once production data accumulates. This page intentionally avoids demo insurer or claim statistics.</p></Card></AppShell>;
}
