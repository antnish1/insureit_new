import Link from "next/link";
import { operationsQueueForStatus, type ClaimStatus } from "@/lib/claim-workflow";

export type QueueClaimRow = {
  id: string;
  claim_no: string;
  insurer_claim_no: string | null;
  current_status: ClaimStatus;
  accident_at: string | null;
  created_at: string | null;
  customers: { company_name: string | null; contact_name: string; phone: string | null } | null;
  vehicles: { vehicle_no: string; make: string | null; model: string | null } | null;
  policies: { policy_no: string } | null;
  insurance_companies: { name: string } | null;
};

export function ClaimQueueTable({ rows }: { rows: QueueClaimRow[] }) {
  const visibleRows = rows.slice(0, 7);
  return (
    <>
      <div className="overflow-hidden rounded-t-[8px] bg-white shadow-[0_8px_24px_rgba(7,29,73,0.07)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1460px] border-separate border-spacing-y-0 text-left text-[15px] text-[#071D49]">
            <thead>
              <tr className="bg-[#003A83] text-center text-[14px] font-black text-white">
                <Head className="rounded-tl-[8px]">Sr. No.</Head>
                <Head>Customer Name /<br />Mobile No.</Head>
                <Head>Vehicle No.</Head>
                <Head>Vehicle<br />Manufacturer</Head>
                <Head>Model</Head>
                <Head>Loss Date</Head>
                <Head>Insurer Name</Head>
                <Head>Policy Number</Head>
                <Head>Control Number</Head>
                <Head>Claim Number</Head>
                <Head>Process</Head>
                <Head className="rounded-tr-[8px]">Action</Head>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length ? visibleRows.map((claim, index) => <ClaimQueueRow key={claim.id} claim={claim} index={index} />) : (
                <tr><td className="px-4 py-12 text-center text-slate-500" colSpan={12}>No matching claims found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <QueuePagination total={rows.length} />
    </>
  );
}

function ClaimQueueRow({ claim, index }: { claim: QueueClaimRow; index: number }) {
  const process = operationsQueueForStatus(claim.current_status);
  const customer = claim.customers?.company_name ?? claim.customers?.contact_name ?? "-";
  const manufacturer = claim.vehicles?.make ?? "-";
  return (
    <tr className="group bg-white align-middle shadow-[0_1px_0_rgba(226,232,240,0.95)] transition hover:bg-[#F8FBFF]">
      <Cell className="text-center text-[20px] font-semibold text-black">{index + 1}</Cell>
      <Cell><span className="block text-[17px] font-black">{customer}</span><span className="mt-1 block text-[17px] font-medium">{claim.customers?.phone ?? "-"}</span></Cell>
      <Cell className="text-center text-[16px] font-bold tracking-tight">{claim.vehicles?.vehicle_no ?? "-"}</Cell>
      <Cell className="text-center"><ManufacturerBadge name={manufacturer} /></Cell>
      <Cell className="text-center text-[16px] font-semibold leading-6">{claim.vehicles?.model ?? "-"}</Cell>
      <Cell className="text-center font-semibold">{formatDate(claim.accident_at ?? claim.created_at)}</Cell>
      <Cell className="text-center"><div className="inline-flex items-center gap-2 font-black"><MiniShield />{claim.insurance_companies?.name ?? "InsureIT"}</div></Cell>
      <Cell className="text-center font-semibold">{claim.policies?.policy_no ?? "-"}</Cell>
      <Cell className="text-center font-semibold">{controlNumberFor(claim)}</Cell>
      <Cell className="text-center font-semibold">{claim.claim_no}</Cell>
      <Cell><ProcessCell label={process?.label ?? claim.current_status} keyName={process?.key ?? "default"} /></Cell>
      <td className="px-4 py-4 text-center"><Link href={`/claims/${claim.id}`} className="inline-flex h-[36px] items-center justify-center rounded-[5px] bg-[#003A83] px-5 text-[14px] font-bold text-white shadow-[0_4px_10px_rgba(0,58,131,0.22)] transition hover:bg-[#071D49]">Proceed</Link></td>
    </tr>
  );
}

function Head({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-4 ${className}`}>{children}</th>;
}

function Cell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-r border-[#E4EAF2] px-4 py-4 ${className}`}>{children}</td>;
}

function ManufacturerBadge({ name }: { name: string }) {
  const initial = name && name !== "-" ? name.charAt(0).toUpperCase() : "V";
  return <div className="flex flex-col items-center justify-center gap-1"><div className="grid h-10 min-w-12 place-items-center rounded-xl bg-white text-[28px] font-black text-[#003A83] shadow-[0_0_0_1px_rgba(7,29,73,0.08)]">{initial}</div><span className="max-w-[120px] text-center text-[13px] font-semibold leading-4">{name}</span></div>;
}

function MiniShield() {
  return <span className="grid h-8 w-8 place-items-center rounded-md border-2 border-[#071D49] bg-[#F4B329] text-[13px] font-black text-[#071D49]">IT</span>;
}

function ProcessCell({ label, keyName }: { label: string; keyName: string }) {
  const tone = processTone(keyName);
  return <div className="flex items-center gap-3"><span className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full text-[23px] ${tone.bg} ${tone.text}`}>{tone.icon}</span><span className="text-[14px] font-semibold leading-5">{label}</span></div>;
}

function processTone(keyName: string) {
  if (keyName === "spot-deputation") return { icon: "⌖", bg: "bg-[#FFF3E1]", text: "text-[#E27A12]" };
  if (keyName === "claim-intimation") return { icon: "▤", bg: "bg-[#F1ECFF]", text: "text-[#6B46C1]" };
  if (keyName === "work-approval") return { icon: "✓", bg: "bg-[#EAF8F1]", text: "text-[#0D8A5F]" };
  if (keyName === "reinspection") return { icon: "⌕", bg: "bg-[#EDF6FF]", text: "text-[#003A83]" };
  if (keyName === "delivery-order") return { icon: "▣", bg: "bg-[#F3F7FF]", text: "text-[#003A83]" };
  if (keyName === "payment") return { icon: "₹", bg: "bg-[#FFF1F1]", text: "text-[#C43B45]" };
  if (keyName === "closed-claims") return { icon: "✓", bg: "bg-[#E8F8F0]", text: "text-[#087F5B]" };
  return { icon: "▣", bg: "bg-[#EAF3FF]", text: "text-[#003A83]" };
}

function QueuePagination({ total }: { total: number }) {
  const pages = Math.max(1, Math.ceil(total / 7));
  return <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E4EAF2] bg-white px-4 py-4 text-[15px] font-medium text-[#1E2A44] shadow-[0_6px_18px_rgba(7,29,73,0.04)]"><p>Showing 1 to {Math.min(total, 7)} of {total} claims</p><div className="flex items-center gap-3"><PageButton disabled>‹</PageButton><PageButton active>1</PageButton><PageButton>2</PageButton><PageButton>3</PageButton><span className="grid h-10 min-w-10 place-items-center rounded-md border border-[#DCE4EF] px-3 font-black">...</span><PageButton>{pages}</PageButton><PageButton>›</PageButton></div><div className="flex items-center gap-3"><span>Items per page:</span><button className="flex h-10 min-w-[84px] items-center justify-center gap-2 rounded-md border border-[#DCE4EF] bg-white font-bold" type="button">7 <span>⌄</span></button></div></div>;
}

function PageButton({ children, active = false, disabled = false }: { children: React.ReactNode; active?: boolean; disabled?: boolean }) {
  return <button className={`grid h-10 min-w-10 place-items-center rounded-md border px-3 font-black ${active ? "border-[#003A83] bg-[#003A83] text-white" : disabled ? "border-[#E4EAF2] bg-[#F8FAFD] text-[#B6C1D1]" : "border-[#DCE4EF] bg-white text-[#071D49]"}`} type="button" disabled={disabled}>{children}</button>;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
}

function controlNumberFor(claim: Pick<QueueClaimRow, "insurer_claim_no" | "claim_no">) {
  if (claim.insurer_claim_no?.trim()) return claim.insurer_claim_no;
  const suffix = claim.claim_no.replace(/\D/g, "").slice(-5) || claim.claim_no.slice(-5);
  return `CTRL/${new Date().getFullYear().toString().slice(-2)}/${suffix}`;
}
