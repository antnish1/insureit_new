import Link from "next/link";
import { AppShell } from "@/components/shell";
import { StatusBadge } from "@/components/ui";
import { createServerSupabaseClient } from "@/lib/auth-server";
import { claimStatuses, isCustomerActionAwaited, isDocumentVerificationPending, isManagerActionRequired, isOpenClaimStatus, operationsQueueForKey, operationsQueueForStatus, stageAgeLabel, terminalClaimStatuses, type ClaimStatus } from "@/lib/claim-workflow";

type ClaimRow = {
  id: string;
  claim_no: string;
  insurer_claim_no: string | null;
  current_status: ClaimStatus;
  accident_at: string | null;
  estimated_loss: number | null;
  settlement_amount: number | null;
  updated_at: string | null;
  created_at: string | null;
  customers: { company_name: string | null; contact_name: string; phone: string | null } | null;
  vehicles: { vehicle_no: string; make: string | null; model: string | null } | null;
  policies: { policy_no: string } | null;
  insurance_companies: { name: string } | null;
  assignee: { full_name: string } | null;
};

type SearchParams = { queue?: string; status?: string; q?: string };

function currency(value: number | null) {
  return value == null ? "-" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
}

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("claims")
    .select("id, claim_no, insurer_claim_no, current_status, accident_at, estimated_loss, settlement_amount, updated_at, created_at, customers(company_name, contact_name, phone), vehicles(vehicle_no, make, model), policies(policy_no), insurance_companies(name), assignee:profiles!claims_assigned_to_fkey(full_name)")
    .order("updated_at", { ascending: false })
    .returns<ClaimRow[]>();

  const normalizedQuery = (params.q ?? "").trim().toLowerCase();
  const rows = (data ?? []).filter((claim) => {
    const queueMatch = matchesQueue(claim.current_status, params.queue);
    const statusMatch = !params.status || params.status === "all" || claim.current_status === params.status;
    const process = operationsQueueForStatus(claim.current_status)?.label;
    const haystack = [
      claim.claim_no,
      claim.insurer_claim_no,
      claim.current_status,
      process,
      claim.customers?.company_name,
      claim.customers?.contact_name,
      claim.customers?.phone,
      claim.vehicles?.vehicle_no,
      claim.vehicles?.make,
      claim.vehicles?.model,
      claim.policies?.policy_no,
      claim.insurance_companies?.name,
      claim.assignee?.full_name
    ].filter(Boolean).join(" ").toLowerCase();
    const searchMatch = !normalizedQuery || haystack.includes(normalizedQuery);
    return queueMatch && statusMatch && searchMatch;
  });

  return (
    <AppShell title={titleForQueue(params.queue)}>
      <div className="mb-5 overflow-hidden rounded-[2rem] border border-blue-100 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Claim queues</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-navy-900">{titleForQueue(params.queue)}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">Showing {rows.length} claim{rows.length === 1 ? "" : "s"}</p>
          </div>
          <Link href="/dashboard" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700">Back to dashboard</Link>
        </div>
      </div>

      <form className="mb-4 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm" action="/claims">
        {params.queue ? <input type="hidden" name="queue" value={params.queue} /> : null}
        <div className="grid gap-3 lg:grid-cols-[1fr_260px_auto] lg:items-center">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search by customer, vehicle no., claim no., policy no., insurer, process" aria-label="Search claims" />
          <select name="status" defaultValue={params.status ?? "all"} aria-label="Claim status">
            <option value="all">All statuses</option>
            {claimStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <button className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-900" type="submit">Filter</button>
        </div>
      </form>

      {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error.message}</div> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-navy-900 text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="rounded-l-2xl px-4 py-3">Sr. No.</th>
                <th className="px-4 py-3">Customer Name / Mobile No.</th>
                <th className="px-4 py-3">Vehicle No.</th>
                <th className="px-4 py-3">Vehicle Manufacturer</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Loss Date</th>
                <th className="px-4 py-3">Insurer Name</th>
                <th className="px-4 py-3">Policy Number</th>
                <th className="px-4 py-3">Claim Number</th>
                <th className="px-4 py-3">Process</th>
                <th className="px-4 py-3">Updated</th>
                <th className="rounded-r-2xl px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length ? rows.map((claim, index) => {
                const process = operationsQueueForStatus(claim.current_status);
                return (
                  <tr key={claim.id} className="hover:bg-blue-50/40">
                    <td className="px-4 py-4 font-bold text-slate-700">{index + 1}</td>
                    <td className="px-4 py-4 text-slate-700">
                      <span className="block font-black text-navy-900">{claim.customers?.company_name ?? claim.customers?.contact_name ?? "-"}</span>
                      <span className="text-xs text-slate-500">{claim.customers?.phone ?? "-"}</span>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-navy-900">{claim.vehicles?.vehicle_no ?? "-"}</td>
                    <td className="px-4 py-4 text-slate-700">{claim.vehicles?.make ?? "-"}</td>
                    <td className="px-4 py-4 text-slate-700">{claim.vehicles?.model ?? "-"}</td>
                    <td className="px-4 py-4 text-slate-700">{formatDate(claim.accident_at ?? claim.created_at)}</td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{claim.insurance_companies?.name ?? "-"}</td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-700">{claim.policies?.policy_no ?? "-"}</td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-700">{claim.insurer_claim_no ?? claim.claim_no}</td>
                    <td className="px-4 py-4"><ProcessCell label={process?.label ?? claim.current_status} /></td>
                    <td className="px-4 py-4 text-slate-500">{stageAgeLabel(claim.updated_at ?? claim.created_at)}</td>
                    <td className="px-4 py-4"><Link href={`/claims/${claim.id}`} className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-navy-900">Proceed</Link></td>
                  </tr>
                );
              }) : <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={12}>No matching claims found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <p>Showing 1 to {rows.length} of {rows.length} claims</p>
          <p className="font-semibold">Estimated loss visible in detail: {currency(rows.reduce((sum, claim) => sum + (claim.estimated_loss ?? 0), 0))}</p>
        </div>
      </section>
    </AppShell>
  );
}

function matchesQueue(status: ClaimStatus, queue?: string) {
  if (!queue) return true;
  const operationalQueue = operationsQueueForKey(queue);
  if (operationalQueue) return operationalQueue.statuses.includes(status);
  if (queue === "active") return isOpenClaimStatus(status);
  if (queue === "documents") return isDocumentVerificationPending(status);
  if (queue === "customer-action") return isCustomerActionAwaited(status);
  if (queue === "manager-action") return isManagerActionRequired(status);
  if (queue === "closed") return terminalClaimStatuses.includes(status);
  return true;
}

function titleForQueue(queue?: string) {
  const operationalQueue = operationsQueueForKey(queue);
  if (operationalQueue) return operationalQueue.label;
  if (queue === "active") return "Active Claims";
  if (queue === "documents") return "Documents Pending Verification";
  if (queue === "customer-action") return "Customer Action Awaited";
  if (queue === "manager-action") return "Our Action Required";
  if (queue === "closed") return "Closed Cases";
  return "Claims";
}

function ProcessCell({ label }: { label: string }) {
  return <span className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-800"><span className="h-2 w-2 rounded-full bg-blue-700" />{label}</span>;
}
