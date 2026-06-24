import Link from "next/link";
import { ClaimManagerShell } from "@/components/claim-manager/claim-manager-shell";
import { createServerSupabaseClient, getAuthenticatedProfile, getServerAccessToken } from "@/lib/auth-server";
import { getManagerDashboardData, type DashboardActivityRow } from "@/lib/manager-dashboard";
import { ActivityHandledButton, ActivitySeenButton, ActivityWorkButton } from "./activity-status-buttons";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const accessToken = await getServerAccessToken();
  const { profile } = await getAuthenticatedProfile(accessToken);
  const dashboard = await getManagerDashboardData(supabase);

  const displayName = firstName(profile?.full_name) || "Manager";
  const greeting = greetingForIndiaTime();

  return (
    <ClaimManagerShell title="Dashboard" activeNav="dashboard">
      <div className="space-y-4 pb-8">
        <section className="rounded-2xl border border-[#DCE7F5] bg-white px-4 py-3 shadow-[0_8px_22px_rgba(7,29,73,0.04)]">
          <h1 className="text-[20px] font-medium tracking-tight text-[#071D49]">{greeting}, {displayName}!</h1>
          <p className="mt-0.5 text-[13px] font-normal text-[#68758A]">Have a nice day.</p>
        </section>

        {dashboard.errors.length ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] leading-5 text-amber-800">
            {dashboard.errors.map((error) => <p key={error}>{error}</p>)}
          </div>
        ) : null}

        <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6" aria-label="Customer activity requiring attention">
          {dashboard.attentionKpis.map((kpi) => (
            <AttentionKpiCard key={kpi.key} href={kpi.href} label={kpi.label} value={kpi.value} hint={kpi.hint} />
          ))}
        </section>

        <section className="rounded-2xl border border-[#DCE7F5] bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-[#071D49]">Customer Claim Journey</h2>
              <p className="mt-0.5 text-[11.5px] text-[#68758A]">Same stages that customer sees in the mobile app.</p>
            </div>
            <Link href="/claims" className="rounded-lg border border-[#D6E0EC] px-3 py-1.5 text-[11px] font-medium text-[#071D49] transition hover:border-[#174EA6] hover:bg-[#F3F7FD]">All claims</Link>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
            {dashboard.journeyKpis.map((card) => (
              <JourneyKpiCard key={card.key} href={`/claims?journey=${card.key}`} index={card.index} title={card.label} value={card.count} updatedCount={card.updatedCount} oldestAgeLabel={card.oldestAgeLabel} />
            ))}
          </div>
        </section>

        <section id="manager-action" className="rounded-2xl border border-[#DCE7F5] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#E6EEF7] px-4 py-3">
            <div>
              <h2 className="text-[15px] font-semibold text-[#071D49]">Manager Action Required</h2>
              <p className="mt-0.5 text-[11.5px] text-[#68758A]">Customer updates that still need attention.</p>
            </div>
            <span className="rounded-full bg-[#F2F6FB] px-2.5 py-1 text-[11px] font-medium text-[#68758A]">{dashboard.actionRows.length} active</span>
          </div>
          <ManagerActionTable rows={dashboard.actionRows} />
        </section>

        <section id="customer-activity" className="rounded-2xl border border-[#DCE7F5] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#E6EEF7] px-4 py-3">
            <div>
              <h2 className="text-[15px] font-semibold text-[#071D49]">Customer Activity Feed</h2>
              <p className="mt-0.5 text-[11.5px] text-[#68758A]">Latest updates captured from customer mobile actions.</p>
            </div>
          </div>
          <ActivityFeed rows={dashboard.activityFeed} />
        </section>
      </div>
    </ClaimManagerShell>
  );
}

function AttentionKpiCard({ href, label, value, hint }: { href: string; label: string; value: number; hint: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-[#DCE7F5] bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#BFD0E5] hover:shadow-[0_10px_24px_rgba(7,29,73,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11.5px] font-medium text-[#516073]">{label}</p>
          <p className="mt-2 text-[26px] font-semibold leading-none tracking-tight text-[#071D49]">{value}</p>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#F2F6FB] text-[13px] font-semibold text-[#718096]">!</span>
      </div>
      <p className="mt-2 truncate text-[11px] text-[#7A8797] group-hover:text-[#174EA6]">{hint}</p>
    </Link>
  );
}

function JourneyKpiCard({ href, index, title, value, updatedCount, oldestAgeLabel }: { href: string; index: number; title: string; value: number; updatedCount: number; oldestAgeLabel: string }) {
  return (
    <Link href={href} className="group min-h-[100px] rounded-xl border border-[#E1E9F3] bg-[#FBFCFE] p-3 transition hover:-translate-y-0.5 hover:border-[#BFD0E5] hover:bg-white hover:shadow-[0_8px_18px_rgba(7,29,73,0.06)]">
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#EEF3F9] text-[10px] font-medium text-[#68758A]">{String(index).padStart(2, "0")}</span>
        <span className="text-[24px] font-semibold leading-none tracking-tight text-[#071D49]">{value}</span>
      </div>
      <h3 className="mt-2 line-clamp-2 text-[12.5px] font-medium leading-4 text-[#26364B]">{title}</h3>
      <div className="mt-2 flex items-center justify-between gap-2 text-[10.5px] text-[#7A8797]">
        <span>{oldestAgeLabel}</span>
        {updatedCount ? <span className="rounded-full bg-[#EEF6FF] px-1.5 py-0.5 text-[#174EA6]">{updatedCount} updates</span> : null}
      </div>
    </Link>
  );
}

function ManagerActionTable({ rows }: { rows: DashboardActivityRow[] }) {
  if (!rows.length) return <EmptyState title="No customer action pending" message="New customer uploads, replies, KYC updates and support activity will appear here." />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-[12px]">
        <thead className="bg-[#F6F9FD] text-[10.5px] uppercase tracking-[0.08em] text-[#68758A]">
          <tr><th className="px-4 py-2.5 font-semibold">Priority</th><th className="px-4 py-2.5 font-semibold">Customer</th><th className="px-4 py-2.5 font-semibold">Vehicle</th><th className="px-4 py-2.5 font-semibold">Control No</th><th className="px-4 py-2.5 font-semibold">Customer Activity</th><th className="px-4 py-2.5 font-semibold">Stage</th><th className="px-4 py-2.5 font-semibold">Age</th><th className="px-4 py-2.5 text-right font-semibold">Action</th></tr>
        </thead>
        <tbody className="divide-y divide-[#E8EEF6]">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-[#FAFCFF]">
              <td className="px-4 py-2.5"><PriorityBadge priority={row.priority} /></td>
              <td className="px-4 py-2.5 font-medium text-[#071D49]">{customerName(row)}</td>
              <td className="px-4 py-2.5 text-[#4B596B]">{row.vehicles?.vehicle_no ?? "-"}</td>
              <td className="px-4 py-2.5 text-[#4B596B]">{row.claims?.claim_no ?? metadataText(row, "claim_no") ?? "-"}</td>
              <td className="max-w-[260px] px-4 py-2.5"><p className="font-medium text-[#26364B]">{row.title}</p><p className="mt-0.5 line-clamp-1 text-[11px] text-[#7A8797]">{row.message ?? eventLabel(row.event_type)}</p>{row.status === "in_progress" ? <span className="mt-1 inline-flex rounded-full bg-[#EEF6FF] px-2 py-0.5 text-[10px] font-medium text-[#174EA6]">In progress</span> : null}</td>
              <td className="px-4 py-2.5 text-[#4B596B]">{row.claims?.current_status ?? metadataText(row, "current_status") ?? "-"}</td>
              <td className="px-4 py-2.5 text-[#68758A]">{relativeTime(row.created_at)}</td>
              <td className="px-4 py-2.5 text-right"><div className="flex items-center justify-end gap-1.5"><Link href={actionHref(row)} className="rounded-lg bg-[#071D49] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#12356C]">Open</Link><ActivityWorkButton activityId={row.id} /><ActivityHandledButton activityId={row.id} /></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityFeed({ rows }: { rows: DashboardActivityRow[] }) {
  if (!rows.length) return <EmptyState title="No customer activity yet" message="After the Supabase migrations are applied, mobile app actions will start appearing here." />;

  return (
    <div className="divide-y divide-[#E8EEF6]">
      {rows.map((row) => (
        <div key={row.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[#FAFCFF]">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#F2F6FB] text-[12px] font-semibold text-[#68758A]">{activityIcon(row.event_type)}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-[12.5px] font-semibold text-[#071D49]">{row.title}</p><PriorityBadge priority={row.priority} compact /><span className="text-[11px] text-[#7A8797]">{relativeTime(row.created_at)}</span><span className="rounded-full bg-[#F2F6FB] px-2 py-0.5 text-[10px] font-medium capitalize text-[#68758A]">{row.status.replace("_", " ")}</span></div>
            <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-5 text-[#5C6878]">{row.message ?? eventLabel(row.event_type)}</p>
            <p className="mt-1 text-[11px] text-[#7A8797]">{customerName(row)} {row.claims?.claim_no ? `· ${row.claims.claim_no}` : ""} {row.vehicles?.vehicle_no ? `· ${row.vehicles.vehicle_no}` : ""}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">{row.status === "new" ? <ActivitySeenButton activityId={row.id} /> : null}<Link href={actionHref(row)} className="rounded-lg border border-[#D6E0EC] px-3 py-1.5 text-[11px] font-medium text-[#071D49] transition hover:border-[#174EA6] hover:bg-[#F3F7FD]">View</Link></div>
        </div>
      ))}
    </div>
  );
}

function PriorityBadge({ priority, compact = false }: { priority: DashboardActivityRow["priority"]; compact?: boolean }) {
  const className = priority === "critical" ? "border-red-200 bg-red-50 text-red-700" : priority === "high" ? "border-orange-200 bg-orange-50 text-orange-700" : priority === "medium" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium capitalize ${className}`}>{compact ? priority.slice(0, 1).toUpperCase() : priority}</span>;
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="px-4 py-8 text-center"><p className="text-[13px] font-semibold text-[#071D49]">{title}</p><p className="mt-1 text-[11.5px] text-[#7A8797]">{message}</p></div>;
}

function customerName(row: DashboardActivityRow) { return row.customers?.company_name || row.customers?.contact_name || "Customer"; }
function actionHref(row: DashboardActivityRow) { if (row.claim_id) return `/claims/${row.claim_id}`; if (row.support_ticket_id) return `/support/${row.support_ticket_id}`; if (row.customer_id) return `/customers/${row.customer_id}`; return "/dashboard"; }
function metadataText(row: DashboardActivityRow, key: string) { const value = row.metadata?.[key]; return typeof value === "string" || typeof value === "number" ? String(value) : null; }
function eventLabel(eventType: DashboardActivityRow["event_type"]) { return eventType.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function activityIcon(eventType: DashboardActivityRow["event_type"]) { if (eventType.includes("document")) return "D"; if (eventType.includes("support")) return "S"; if (eventType.includes("kyc")) return "K"; if (eventType.includes("roadside")) return "R"; return "C"; }
function relativeTime(value: string) { const diffMs = Date.now() - Date.parse(value); if (!Number.isFinite(diffMs)) return "-"; const minutes = Math.max(0, Math.floor(diffMs / 60000)); if (minutes < 1) return "Just now"; if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; const days = Math.floor(hours / 24); if (days === 1) return "1d ago"; return `${days}d ago`; }
function firstName(name?: string | null) { return name?.trim().split(/\s+/)[0] ?? ""; }
function greetingForIndiaTime() { const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date())); if (hour < 12) return "Good morning"; if (hour < 17) return "Good afternoon"; return "Good evening"; }
