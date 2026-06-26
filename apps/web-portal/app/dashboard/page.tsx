import Link from "next/link";
import { ClaimManagerShell } from "@/components/claim-manager/claim-manager-shell";
import { createServerSupabaseClient, getAuthenticatedProfile, getServerAccessToken } from "@/lib/auth-server";
import { getManagerDashboardData, type DashboardActivityRow } from "@/lib/manager-dashboard";
import { ActivityHandledButton, ActivitySeenButton, ActivityWorkButton } from "./activity-status-buttons";

type WorkflowGroup = {
  key: string;
  label: string;
  count: number;
  oldestLabel: string;
  href: string;
  tone: "blue" | "amber" | "green" | "red" | "slate";
};

type ActionGroup = {
  key: string;
  label: string;
  count: number;
  oldestLabel: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  href: string;
  actionLabel: string;
};

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const accessToken = await getServerAccessToken();
  const { profile } = await getAuthenticatedProfile(accessToken);
  const dashboard = await getManagerDashboardData(supabase);

  const displayName = firstName(profile?.full_name) || "Manager";
  const greeting = greetingForIndiaTime();
  const workflowGroups = buildWorkflowGroups(dashboard);
  const actionGroups = buildActionGroups(dashboard, workflowGroups);
  const totalClaims = workflowGroups.reduce((total, group) => total + group.count, 0);
  const closedClaims = workflowGroups.find((group) => group.key === "closed")?.count ?? 0;
  const activeClaims = Math.max(totalClaims - closedClaims, 0);
  const initialDocs = workflowGroups.find((group) => group.key === "intake-documents")?.count ?? 0;
  const finalDocs = workflowGroups.find((group) => group.key === "final-documents")?.count ?? 0;
  const ageingRisk = actionGroups.find((group) => group.key === "claims-delayed")?.count ?? 0;

  return (
    <ClaimManagerShell title="Command Center" activeNav="dashboard">
      <div className="space-y-5 pb-8">
        <section className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-semibold leading-8 tracking-[-0.02em] text-[#111827]">Command Center</h1>
            <p className="mt-1 text-[14px] leading-5 text-[#64748B]">{greeting}, {displayName}. Operational overview and urgent claim work.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/claims" className="inline-flex h-9 items-center rounded border border-[#E2E8F0] bg-white px-3 text-[12px] font-medium text-[#111827] transition hover:bg-[#F2F4F6]">All Claims</Link>
            <Link href="/dashboard#action-inbox" className="inline-flex h-9 items-center rounded bg-[#111827] px-3 text-[12px] font-medium text-white transition hover:bg-[#1F2937]">Action Inbox</Link>
          </div>
        </section>

        {dashboard.errors.length ? (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-[12px] leading-5 text-amber-800">
            {dashboard.errors.map((error) => <p key={error}>{error}</p>)}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-8">
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Operational summary">
              <SummaryCard label="Open Claims" value={activeClaims} href="/claims" />
              <SummaryCard label="Initial Doc Pending" value={initialDocs} href="/claims?journey=spot-intimation" />
              <SummaryCard label="Final Doc Pending" value={finalDocs} href="/claims?journey=final-documents" />
              <SummaryCard label="Ageing / SLA Risk" value={ageingRisk} href="/claims" tone="critical" />
            </section>

            <section className="rounded border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] px-5 py-4">
                <h2 className="text-[16px] font-semibold leading-6 text-[#111827]">Claim Pipeline</h2>
              </div>
              <WorkflowPipeline groups={workflowGroups} />
            </section>

            <section id="action-inbox" className="rounded border border-[#E2E8F0] bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] bg-[#F7F9FB] px-5 py-4">
                <div>
                  <h2 className="text-[16px] font-semibold leading-6 text-[#111827]">Action Inbox Summary</h2>
                  <p className="mt-0.5 text-[12px] text-[#64748B]">Grouped workload. Open a category instead of scrolling through every activity.</p>
                </div>
                <Link href="/dashboard#urgent-actions" className="inline-flex items-center gap-1 text-[12px] font-medium text-[#111827] hover:underline">View urgent items →</Link>
              </div>
              <ActionInboxSummary groups={actionGroups} />
            </section>
          </div>

          <aside className="space-y-5 xl:col-span-4">
            <section id="urgent-actions" className="rounded border border-[#E2E8F0] bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] bg-[#F7F9FB] px-5 py-4">
                <h2 className="flex items-center gap-2 text-[16px] font-semibold leading-6 text-[#111827]"><span className="text-rose-600">!</span> Urgent Actions</h2>
                <span className="rounded bg-[#F2F4F6] px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">Top {Math.min(dashboard.actionRows.length, 5)}</span>
              </div>
              <UrgentActions rows={dashboard.actionRows.slice(0, 5)} totalCount={dashboard.actionRows.length} />
            </section>

            <section className="rounded border border-[#E2E8F0] bg-white">
              <div className="border-b border-[#E2E8F0] bg-[#F7F9FB] px-5 py-4">
                <h2 className="text-[16px] font-semibold leading-6 text-[#111827]">Recent Activity</h2>
                <p className="mt-0.5 text-[12px] text-[#64748B]">Latest important customer and claim updates.</p>
              </div>
              <RecentActivity rows={dashboard.activityFeed.slice(0, 5)} />
              <div className="border-t border-[#E2E8F0] bg-[#F7F9FB] px-5 py-3 text-center">
                <Link href="/dashboard#customer-activity" className="text-[12px] font-medium text-[#111827] hover:underline">View Activity Log</Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </ClaimManagerShell>
  );
}

function SummaryCard({ label, value, href, tone = "default" }: { label: string; value: number; href: string; tone?: "default" | "critical" }) {
  const isCritical = tone === "critical";
  return (
    <Link href={href} className={`rounded border p-4 transition hover:bg-[#F7F9FB] ${isCritical ? "border-rose-200 bg-rose-50" : "border-[#E2E8F0] bg-white"}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${isCritical ? "text-rose-600" : "text-[#52647A]"}`}>{label}</p>
      <div className="mt-3 flex items-end justify-between">
        <p className={`text-[26px] font-semibold leading-none tracking-[-0.02em] ${isCritical ? "text-rose-600" : "text-[#111827]"}`}>{value}</p>
        <span className={`text-[18px] ${isCritical ? "text-rose-600" : "text-[#64748B]"}`}>□</span>
      </div>
    </Link>
  );
}

function WorkflowPipeline({ groups }: { groups: WorkflowGroup[] }) {
  return (
    <div className="overflow-x-auto px-4 py-5">
      <div className="relative flex min-w-[760px] items-start justify-between gap-3">
        <div className="absolute left-[6%] right-[6%] top-4 h-px bg-[#E2E8F0]" />
        {groups.map((group, index) => (
          <Link key={group.key} href={group.href} className="relative z-10 flex w-[120px] flex-col items-center text-center transition hover:-translate-y-0.5">
            <span className={`grid h-8 w-8 place-items-center rounded-full border-2 text-[12px] font-semibold ${pipelineStepClass(group.tone, index)}`}>{index + 1}</span>
            <span className="mt-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#52647A]">{group.label}</span>
            <span className="mt-1 text-[22px] font-semibold leading-none text-[#111827]">{group.count}</span>
            <span className={`mt-1 text-[12px] ${oldestAgeDays(group.oldestLabel) >= 7 ? "font-medium text-rose-600" : oldestAgeDays(group.oldestLabel) > 0 ? "text-amber-600" : "text-[#64748B]"}`}>Oldest: {group.oldestLabel}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ActionInboxSummary({ groups }: { groups: ActionGroup[] }) {
  if (!groups.length) return <EmptyState title="No grouped actions" message="Customer uploads, support replies and delayed claim groups will appear here." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#52647A]">
            <th className="px-5 py-3">Category</th>
            <th className="px-5 py-3 text-right">Count</th>
            <th className="px-5 py-3 text-right">Oldest</th>
            <th className="px-5 py-3">Priority</th>
            <th className="px-5 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {groups.map((group) => (
            <tr key={group.key} className="h-11 transition hover:bg-[#F7F9FB]">
              <td className="px-5 py-2 text-[13px] font-medium text-[#111827]">{group.label}</td>
              <td className="px-5 py-2 text-right font-mono text-[13px] text-[#111827]">{group.count}</td>
              <td className={`px-5 py-2 text-right text-[13px] ${oldestAgeDays(group.oldestLabel) >= 7 ? "font-medium text-rose-600" : "text-[#64748B]"}`}>{group.oldestLabel}</td>
              <td className="px-5 py-2"><PriorityPill label={group.priority} /></td>
              <td className="px-5 py-2 text-right"><Link href={group.href} className="inline-flex rounded border border-[#E2E8F0] px-3 py-1 text-[12px] font-medium text-[#111827] transition hover:bg-[#F2F4F6]">{group.actionLabel}</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UrgentActions({ rows, totalCount }: { rows: DashboardActivityRow[]; totalCount: number }) {
  if (!rows.length) return <EmptyState title="No urgent actions" message="Active customer updates and claim actions will appear here." />;

  return (
    <div className="space-y-3 p-4">
      {rows.map((row) => (
        <div key={row.id} className={`rounded border p-3 ${row.priority === "critical" || row.priority === "high" ? "border-rose-200 bg-rose-50/45" : "border-[#E2E8F0] bg-white"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[13px] font-semibold text-[#111827]">{vehicleNumber(row)}</p>
              <p className="font-mono text-[12px] text-[#64748B]">{claimNumber(row)}</p>
            </div>
            <span className="rounded border border-[#E2E8F0] bg-white px-2 py-0.5 text-[11px] font-medium text-[#64748B]">{relativeTime(row.created_at)}</span>
          </div>
          <p className="mt-2 text-[13px] font-medium text-[#111827]">{row.claims?.current_status ?? metadataText(row, "current_status") ?? eventLabel(row.event_type)}</p>
          <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#64748B]">{row.message ?? row.title}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link href={actionHref(row)} className="inline-flex h-8 flex-1 items-center justify-center rounded bg-[#111827] px-3 text-[12px] font-medium text-white transition hover:bg-[#1F2937]">Open</Link>
            {row.status === "new" ? <ActivitySeenButton activityId={row.id} /> : null}
            <ActivityWorkButton activityId={row.id} />
            <ActivityHandledButton activityId={row.id} />
          </div>
        </div>
      ))}
      {totalCount > rows.length ? <p className="text-center text-[12px] font-medium text-[#64748B]">+{totalCount - rows.length} more actions in the full queue</p> : null}
    </div>
  );
}

function RecentActivity({ rows }: { rows: DashboardActivityRow[] }) {
  if (!rows.length) return <EmptyState title="No recent activity" message="Latest customer and claim events will appear here." />;

  return (
    <div className="space-y-4 p-4">
      {rows.map((row) => (
        <Link key={row.id} href={actionHref(row)} className="flex gap-3 rounded p-1 transition hover:bg-[#F7F9FB]">
          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${activityDot(row)}`} />
          <span className="min-w-0">
            <span className="line-clamp-2 text-[13px] leading-5 text-[#111827]"><span className="font-medium">{row.title}</span>{row.claims?.claim_no ? ` for ${row.claims.claim_no}` : ""}</span>
            <span className="mt-0.5 block text-[11px] font-medium text-[#64748B]">{relativeTime(row.created_at)}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function buildWorkflowGroups(dashboard: Awaited<ReturnType<typeof getManagerDashboardData>>): WorkflowGroup[] {
  const stage = (key: string) => dashboard.journeyKpis.find((item) => item.key === key);
  const count = (...keys: string[]) => keys.reduce((total, key) => total + (stage(key)?.count ?? 0), 0);
  const oldest = (...keys: string[]) => oldestLabel(keys.map((key) => stage(key)?.oldestAgeLabel).filter(Boolean) as string[]);

  return [
    { key: "intake-documents", label: "Initial Docs", count: count("loss-report", "spot-intimation"), oldestLabel: oldest("loss-report", "spot-intimation"), href: "/claims?journey=spot-intimation", tone: "amber" },
    { key: "survey", label: "Survey", count: count("spot-surveyor-assigned", "spot-survey-completed", "final-surveyor"), oldestLabel: oldest("spot-surveyor-assigned", "spot-survey-completed", "final-surveyor"), href: "/claims?journey=spot-surveyor-assigned", tone: "blue" },
    { key: "approval", label: "Approval", count: count("work-approval"), oldestLabel: oldest("work-approval"), href: "/claims?journey=work-approval", tone: "blue" },
    { key: "repair-billing", label: "Repair", count: count("under-repair", "ri-stage", "do-stage", "vehicle-release"), oldestLabel: oldest("under-repair", "ri-stage", "do-stage", "vehicle-release"), href: "/claims?journey=under-repair", tone: "slate" },
    { key: "final-documents", label: "Final Docs", count: count("final-documents", "claim-intimation"), oldestLabel: oldest("final-documents", "claim-intimation"), href: "/claims?journey=final-documents", tone: "amber" },
    { key: "settlement", label: "Settlement", count: count("payment-advice-received"), oldestLabel: oldest("payment-advice-received"), href: "/claims?journey=payment-advice-received", tone: "green" },
    { key: "closed", label: "Closed", count: count("journey-complete"), oldestLabel: oldest("journey-complete"), href: "/claims?queue=closed", tone: "green" }
  ];
}

function buildActionGroups(dashboard: Awaited<ReturnType<typeof getManagerDashboardData>>, workflowGroups: WorkflowGroup[]): ActionGroup[] {
  const attention = (key: string) => dashboard.attentionKpis.find((item) => item.key === key);
  const delayedCount = workflowGroups.filter((group) => oldestAgeDays(group.oldestLabel) >= 7).reduce((total, group) => total + group.count, 0);

  const groups: ActionGroup[] = [
    { key: "documents-uploaded", label: "Documents Uploaded", count: attention("documents-uploaded")?.value ?? 0, oldestLabel: oldestActivityAge(dashboard.actionRows, ["claim_document_uploaded", "claim_documents_completed"]), priority: "High", href: attention("documents-uploaded")?.href ?? "/dashboard#urgent-actions", actionLabel: "Review" },
    { key: "reupload-received", label: "Reupload Received", count: attention("replacement-received")?.value ?? 0, oldestLabel: oldestActivityAge(dashboard.actionRows, ["claim_document_reuploaded"]), priority: "High", href: attention("replacement-received")?.href ?? "/dashboard#urgent-actions", actionLabel: "Review" },
    { key: "support-replies", label: "Support Replies", count: attention("support-replies")?.value ?? 0, oldestLabel: oldestActivityAge(dashboard.actionRows, ["support_ticket_message_sent"]), priority: "Medium", href: attention("support-replies")?.href ?? "/dashboard#urgent-actions", actionLabel: "Reply" },
    { key: "kyc-updates", label: "KYC / Profile Updates", count: attention("kyc-updates")?.value ?? 0, oldestLabel: oldestActivityAge(dashboard.actionRows, ["customer_kyc_uploaded", "customer_kyc_deleted"]), priority: "Medium", href: attention("kyc-updates")?.href ?? "/dashboard#urgent-actions", actionLabel: "Check" },
    { key: "claims-delayed", label: "Claims Delayed", count: delayedCount, oldestLabel: oldestDelayedLabel(workflowGroups), priority: delayedCount ? "Critical" : "Low", href: "/claims", actionLabel: "Open" }
  ];

  return groups.filter((group) => group.count > 0);
}

function PriorityPill({ label }: { label: ActionGroup["priority"] }) {
  const className = label === "Critical" ? "bg-rose-50 text-rose-600" : label === "High" ? "bg-amber-50 text-amber-600" : label === "Medium" ? "bg-blue-50 text-blue-700" : "bg-[#F2F4F6] text-[#64748B]";
  return <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${className}`}>{label}</span>;
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="px-5 py-8 text-center"><p className="text-[13px] font-semibold text-[#111827]">{title}</p><p className="mt-1 text-[12px] text-[#64748B]">{message}</p></div>;
}

function pipelineStepClass(tone: WorkflowGroup["tone"], index: number) {
  if (index === 0) return "border-[#111827] bg-[#111827] text-white";
  if (tone === "amber") return "border-amber-300 bg-white text-amber-700";
  if (tone === "green") return "border-emerald-300 bg-white text-emerald-700";
  if (tone === "red") return "border-rose-300 bg-white text-rose-700";
  return "border-[#CBD5E1] bg-white text-[#64748B]";
}

function oldestActivityAge(rows: DashboardActivityRow[], eventTypes: DashboardActivityRow["event_type"][]) {
  const timestamps = rows.filter((row) => eventTypes.includes(row.event_type)).map((row) => Date.parse(row.created_at)).filter((value) => Number.isFinite(value));
  if (!timestamps.length) return "-";
  return relativeTime(new Date(Math.min(...timestamps)).toISOString());
}

function oldestDelayedLabel(groups: WorkflowGroup[]) {
  const delayed = groups.map((group) => oldestAgeDays(group.oldestLabel)).filter((days) => days >= 7);
  if (!delayed.length) return "-";
  const max = Math.max(...delayed);
  return max === 1 ? "1 day" : `${max} days`;
}

function oldestLabel(labels: string[]) {
  const days = labels.map((label) => oldestAgeDays(label)).filter((value) => value > 0);
  if (!labels.length) return "-";
  if (!days.length) return labels.some((label) => label === "Updated today") ? "Today" : "-";
  const max = Math.max(...days);
  return max === 1 ? "1 day" : `${max} days`;
}

function oldestAgeDays(label: string) {
  const match = label.match(/(\d+) day/);
  return match ? Number(match[1]) : 0;
}
function activityDot(row: DashboardActivityRow) { if (row.priority === "critical" || row.priority === "high") return "bg-rose-600"; if (row.event_type.includes("document")) return "bg-amber-500"; if (row.event_type.includes("support")) return "bg-blue-600"; return "bg-emerald-600"; }
function vehicleNumber(row: DashboardActivityRow) { return row.vehicles?.vehicle_no ?? metadataText(row, "vehicle_no") ?? "Vehicle not linked"; }
function claimNumber(row: DashboardActivityRow) { return row.claims?.claim_no ?? metadataText(row, "claim_no") ?? "Claim not linked"; }
function actionHref(row: DashboardActivityRow) { if (row.claim_id) return `/claims/${row.claim_id}`; if (row.support_ticket_id) return `/support/${row.support_ticket_id}`; if (row.customer_id) return `/customers/${row.customer_id}`; return "/dashboard"; }
function metadataText(row: DashboardActivityRow, key: string) { const value = row.metadata?.[key]; return typeof value === "string" || typeof value === "number" ? String(value) : null; }
function eventLabel(eventType: DashboardActivityRow["event_type"]) { return eventType.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function relativeTime(value: string) { const diffMs = Date.now() - Date.parse(value); if (!Number.isFinite(diffMs)) return "-"; const minutes = Math.max(0, Math.floor(diffMs / 60000)); if (minutes < 1) return "Just now"; if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; const days = Math.floor(hours / 24); if (days === 1) return "1d ago"; return `${days}d ago`; }
function firstName(name?: string | null) { return name?.trim().split(/\s+/)[0] ?? ""; }
function greetingForIndiaTime() { const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date())); if (hour < 12) return "Good morning"; if (hour < 17) return "Good afternoon"; return "Good evening"; }