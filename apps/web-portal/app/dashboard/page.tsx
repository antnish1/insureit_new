import Link from "next/link";
import { ClaimManagerShell } from "@/components/claim-manager/claim-manager-shell";
import { createServerSupabaseClient, getAuthenticatedProfile, getServerAccessToken } from "@/lib/auth-server";
import { getManagerDashboardData } from "@/lib/manager-dashboard";

type WorkflowGroup = {
  key: string;
  label: string;
  count: number;
  oldestLabel: string;
  href: string;
  tone: "blue" | "amber" | "green" | "slate";
};

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const accessToken = await getServerAccessToken();
  const { profile } = await getAuthenticatedProfile(accessToken);
  const dashboard = await getManagerDashboardData(supabase);

  const displayName = firstName(profile?.full_name) || "Manager";
  const greeting = greetingForIndiaTime();
  const workflowGroups = buildWorkflowGroups(dashboard);
  const totalClaims = workflowGroups.reduce((total, group) => total + group.count, 0);
  const closedClaims = workflowGroups.find((group) => group.key === "closed")?.count ?? 0;
  const activeClaims = Math.max(totalClaims - closedClaims, 0);

  return (
    <ClaimManagerShell title="Claim Manager Desk" activeNav="dashboard">
      <div className="space-y-3 pb-6">
        <section className="overflow-hidden rounded-2xl border border-[#DCE7F5] bg-white shadow-[0_10px_28px_rgba(7,29,73,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6EEF7] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#174EA6]">Claim Manager</p>
              <h1 className="mt-0.5 text-[20px] font-semibold tracking-tight text-[#071D49]">{greeting}, {displayName}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <HeaderMetric label="Total" value={totalClaims} />
              <HeaderMetric label="Open" value={activeClaims} />
              <HeaderMetric label="Closed" value={closedClaims} />
              <Link href="/claims" className="ml-1 inline-flex h-8 items-center rounded-lg bg-[#071D49] px-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#12356C]">
                Claims Queue
              </Link>
            </div>
          </div>

          <WorkflowBoard groups={workflowGroups} />
        </section>

        {dashboard.errors.length ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] leading-5 text-amber-800">
            {dashboard.errors.map((error) => <p key={error}>{error}</p>)}
          </div>
        ) : null}
      </div>
    </ClaimManagerShell>
  );
}

function HeaderMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex h-8 items-center gap-2 rounded-lg border border-[#E1E9F3] bg-[#F8FBFF] px-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#68758A]">{label}</span>
      <span className="text-[16px] font-semibold leading-none text-[#071D49]">{value}</span>
    </div>
  );
}

function WorkflowBoard({ groups }: { groups: WorkflowGroup[] }) {
  return (
    <div className="overflow-hidden">
      <div className="grid grid-cols-[1.5fr_80px_115px_76px] border-b border-[#E6EEF7] bg-[#F6F9FD] px-3 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#68758A] max-md:hidden">
        <div>Workflow Stage</div>
        <div className="text-right">Claims</div>
        <div className="text-right">Oldest</div>
        <div className="text-right">Action</div>
      </div>
      <div className="divide-y divide-[#E8EEF6] bg-white">
        {groups.map((group) => (
          <Link key={group.key} href={group.href} className="grid gap-1 px-3 py-2 transition hover:bg-[#FAFCFF] md:grid-cols-[1.5fr_80px_115px_76px] md:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${toneDot(group.tone)}`} />
                <p className="truncate text-[12px] font-semibold text-[#071D49]">{group.label}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 md:block md:text-right">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#7A8797] md:hidden">Claims</p>
              <p className="text-[14px] font-semibold leading-none text-[#071D49]">{group.count}</p>
            </div>
            <div className="flex items-center justify-between gap-3 md:block md:text-right">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#7A8797] md:hidden">Oldest</p>
              <p className="text-[10.5px] font-medium text-[#4B596B]">{group.oldestLabel}</p>
            </div>
            <div className="text-left md:text-right">
              <span className="inline-flex rounded-md border border-[#D6E0EC] px-2 py-1 text-[10.5px] font-semibold text-[#071D49] transition hover:border-[#174EA6] hover:bg-[#F3F7FD]">Open</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function buildWorkflowGroups(dashboard: Awaited<ReturnType<typeof getManagerDashboardData>>): WorkflowGroup[] {
  const stage = (key: string) => dashboard.journeyKpis.find((item) => item.key === key);
  const count = (...keys: string[]) => keys.reduce((total, key) => total + (stage(key)?.count ?? 0), 0);
  const oldest = (...keys: string[]) => oldestLabel(keys.map((key) => stage(key)?.oldestAgeLabel).filter(Boolean) as string[]);

  return [
    {
      key: "intake-documents",
      label: "Intake & Initial Documents",
      count: count("loss-report", "spot-intimation"),
      oldestLabel: oldest("loss-report", "spot-intimation"),
      href: "/claims?journey=spot-intimation",
      tone: "amber"
    },
    {
      key: "survey",
      label: "Survey",
      count: count("spot-surveyor-assigned", "spot-survey-completed", "final-surveyor"),
      oldestLabel: oldest("spot-surveyor-assigned", "spot-survey-completed", "final-surveyor"),
      href: "/claims?journey=spot-surveyor-assigned",
      tone: "blue"
    },
    {
      key: "final-documents",
      label: "Final Documents",
      count: count("final-documents", "claim-intimation"),
      oldestLabel: oldest("final-documents", "claim-intimation"),
      href: "/claims?journey=final-documents",
      tone: "amber"
    },
    {
      key: "approval",
      label: "Approval",
      count: count("work-approval"),
      oldestLabel: oldest("work-approval"),
      href: "/claims?journey=work-approval",
      tone: "blue"
    },
    {
      key: "repair-billing",
      label: "Repair & Billing",
      count: count("under-repair", "ri-stage", "do-stage", "vehicle-release"),
      oldestLabel: oldest("under-repair", "ri-stage", "do-stage", "vehicle-release"),
      href: "/claims?journey=under-repair",
      tone: "slate"
    },
    {
      key: "settlement",
      label: "Settlement",
      count: count("payment-advice-received"),
      oldestLabel: oldest("payment-advice-received"),
      href: "/claims?journey=payment-advice-received",
      tone: "green"
    },
    {
      key: "closed",
      label: "Closed / Completed",
      count: count("journey-complete"),
      oldestLabel: oldest("journey-complete"),
      href: "/claims?queue=closed",
      tone: "green"
    }
  ];
}

function oldestLabel(labels: string[]) {
  const days = labels.map((label) => oldestAgeDays(label)).filter((value) => value > 0);
  if (!labels.length) return "-";
  if (!days.length) return labels.some((label) => label === "Updated today") ? "Today" : "-";
  const max = Math.max(...days);
  return max === 1 ? "1 day" : `${max} days`;
}

function toneDot(tone: WorkflowGroup["tone"]) {
  if (tone === "green") return "bg-emerald-500";
  if (tone === "amber") return "bg-amber-500";
  if (tone === "blue") return "bg-blue-500";
  return "bg-slate-400";
}

function oldestAgeDays(label: string) {
  const match = label.match(/(\d+) day/);
  return match ? Number(match[1]) : 0;
}
function firstName(name?: string | null) { return name?.trim().split(/\s+/)[0] ?? ""; }
function greetingForIndiaTime() { const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date())); if (hour < 12) return "Good morning"; if (hour < 17) return "Good afternoon"; return "Good evening"; }
