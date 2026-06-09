import { allowedAdminRoles } from "@/lib/auth-config";
import { DataError, DataTable } from "@/components/record-list";
import { AppShell, Card, PageHeader } from "@/components/shell";
import { SearchFilterBar, StatusBadge } from "@/components/ui";
import { createServerSupabaseClient } from "@/lib/auth-server";

type ProfileRow = { id: string; full_name: string; role: string; phone: string | null; is_active: boolean };

export default async function UsersPage() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("profiles").select("id, full_name, role, phone, is_active").order("created_at", { ascending: false }).returns<ProfileRow[]>();

  return <AppShell><PageHeader title="User management" description="Manage staff access and role-based permissions for the InsureIt admin portal." /><SearchFilterBar searchPlaceholder="Search users by name, email, role, or status" filterLabel="User status" /><div className="grid gap-6 xl:grid-cols-3"><div className="xl:col-span-2">{error ? <DataError message={error.message} /> : <DataTable rows={data ?? []} emptyTitle="No staff users added yet" emptyDescription="Add authorized staff users to manage portal access." columns={[{ header: "Name", cell: (user) => <p className="font-semibold text-navy-900">{user.full_name}</p> }, { header: "Role", cell: (user) => user.role }, { header: "Phone", cell: (user) => user.phone ?? "—" }, { header: "Status", cell: (user) => <StatusBadge status={user.is_active ? "Active" : "Closed"} /> }]} />}</div><Card><h3 className="text-lg font-semibold text-navy-900">Portal roles</h3><ul className="mt-4 space-y-2 text-sm text-slate-600">{allowedAdminRoles.map((role) => <li className="rounded-xl bg-slate-50 px-3 py-2" key={role}>{role}</li>)}</ul><p className="mt-4 text-xs text-slate-500">Assign each team member the appropriate role for their claim assistance responsibilities.</p></Card></div></AppShell>;
}
