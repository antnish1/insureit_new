import Link from "next/link";
import { ClaimManagerShell } from "@/components/claim-manager/claim-manager-shell";
import { createServerSupabaseClient, getAuthenticatedProfile, getServerAccessToken } from "@/lib/auth-server";
import type { ClaimStatus } from "@/lib/claim-workflow";

type ClaimRow = {
  id: string;
  current_status: ClaimStatus;
};

const customerJourneyStages = [
  { key: "loss-report", label: "Loss Report", statuses: ["Accident Reported"] as ClaimStatus[] },
  { key: "spot-intimation", label: "Spot Intimation", statuses: ["Initial Documents Pending", "Initial Documents Verification Pending", "Initial Documents Submitted", "Initial Documents Verified", "Documents Submitted", "Documents Pending"] as ClaimStatus[] },
  { key: "spot-surveyor-assigned", label: "Spot Surveyor Assigned", statuses: ["Surveyor Appointed"] as ClaimStatus[] },
  { key: "spot-survey-completed", label: "Spot Survey Completed", statuses: ["Vehicle Inspected"] as ClaimStatus[] },
  { key: "final-documents", label: "Final Documents", statuses: ["Final Documents Awaited", "Final Documents Verification Pending", "Final Documents Submitted", "Final Documents Verified"] as ClaimStatus[] },
  { key: "claim-intimation", label: "Claim Intimation", statuses: ["Claim Intimated", "Claim Intimation"] as ClaimStatus[] },
  { key: "final-surveyor", label: "Final Surveyor", statuses: ["Final Surveyor Details", "Survey Status", "Survey Done"] as ClaimStatus[] },
  { key: "work-approval", label: "Work Approval", statuses: ["Work Approval Status", "Work Approval Received", "Estimate Submitted", "Approval Pending"] as ClaimStatus[] },
  { key: "under-repair", label: "Under Repair", statuses: ["Under Repair", "Repair Done", "Repair Started", "Repair Completed"] as ClaimStatus[] },
  { key: "ri-stage", label: "RI Stage", statuses: ["RA Intimation", "RA Intimation Done"] as ClaimStatus[] },
  { key: "do-stage", label: "DO Stage", statuses: ["DO Status", "DO Submitted"] as ClaimStatus[] },
  { key: "vehicle-release", label: "Vehicle Release", statuses: ["Final Bill Submitted"] as ClaimStatus[] },
  { key: "payment-advice-received", label: "Payment Advice Received", statuses: ["Payment Stage", "Claim Completion In Progress", "Settlement Under Process"] as ClaimStatus[] },
  { key: "journey-complete", label: "Journey Complete", statuses: ["Claim Complete", "Settled", "Closed"] as ClaimStatus[] }
] as const;

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const accessToken = await getServerAccessToken();
  const { profile } = await getAuthenticatedProfile(accessToken);
  const { data, error } = await supabase.from("claims").select("id, current_status").returns<ClaimRow[]>();

  const claims = data ?? [];
  const displayName = firstName(profile?.full_name) || "Manager";
  const greeting = greetingForIndiaTime();

  const cards = customerJourneyStages.map((stage, index) => ({
    ...stage,
    index: index + 1,
    count: claims.filter((claim) => stage.statuses.includes(claim.current_status)).length
  }));

  return (
    <ClaimManagerShell title="Dashboard" activeNav="dashboard">
      <div className="space-y-3 pb-8">
        <section className="rounded-2xl border border-[#DCE7F5] bg-white px-4 py-3 shadow-[0_8px_22px_rgba(7,29,73,0.04)]">
          <h1 className="text-[20px] font-medium tracking-tight text-[#071D49]">{greeting}, {displayName}!</h1>
          <p className="mt-0.5 text-[13px] font-normal text-[#68758A]">Have a nice day.</p>
        </section>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">{error.message}</div> : null}

        <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
          {cards.map((card) => (
            <JourneyKpiCard key={card.key} href={`/claims?journey=${card.key}`} index={card.index} title={card.label} value={card.count} />
          ))}
        </section>
      </div>
    </ClaimManagerShell>
  );
}

function JourneyKpiCard({ href, index, title, value }: { href: string; index: number; title: string; value: number }) {
  return (
    <Link href={href} className="group min-h-[94px] rounded-2xl border border-[#DCE7F5] bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#BFD0E5] hover:shadow-[0_10px_24px_rgba(7,29,73,0.07)]">
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#F2F6FB] text-[11px] font-medium text-[#68758A]">{String(index).padStart(2, "0")}</span>
        <span className="text-[26px] font-medium leading-none tracking-tight text-[#071D49]">{value}</span>
      </div>
      <h2 className="mt-3 line-clamp-2 text-[12.5px] font-medium leading-4 text-[#26364B]">{title}</h2>
      <p className="mt-2 text-[11px] font-normal text-[#7A8797] group-hover:text-[#174EA6]">Open stage</p>
    </Link>
  );
}

function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] ?? "";
}

function greetingForIndiaTime() {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
