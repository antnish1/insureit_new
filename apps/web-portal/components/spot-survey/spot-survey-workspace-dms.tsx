import Link from "next/link";
import { ReplaceDocumentButton } from "./replace-document-button";
import { VerificationActionButton } from "./verification-action-button";
import { VerifyDetailButton } from "./verify-buttons";
import type { SpotSurveyClaim, SpotSurveyDocument, SpotSurveyVerification } from "./spot-survey-workspace-v2";

type Item = { key: string; no: number; title: string; documentType: string; document?: SpotSurveyDocument | null };

const aliases = {
  rc: ["rc copy", "registration certificate"],
  insurance: ["insurance copy", "policy copy"],
  dl: ["driving licence", "driving licence copy", "dl copy"],
  gr: ["gr copy / road challan", "gr / load challan copy", "road challan", "load challan"]
};

export function SpotSurveyWorkspace({ claim, documents, verifications = [] }: { claim: SpotSurveyClaim; documents: SpotSurveyDocument[]; verifications?: SpotSurveyVerification[] }) {
  const items = buildItems(documents);
  const verifiedCount = items.filter((item) => isVerified(item, verifications)).length;
  const driverNumber = extractDriverNumber(claim.accident_description);
  const driverVerification = latestDetailVerification("driver", verifications);
  const locationVerification = latestDetailVerification("location", verifications);

  return (
    <div className="mx-auto max-w-[1440px] space-y-3 pb-5 text-[#071D49]">
      <CompactClaimHeader claim={claim} />

      <section className="rounded-lg border border-[#D9E3F0] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E7EEF7] px-4 py-2.5">
          <div>
            <h2 className="text-[15px] font-semibold">Spot Survey Details</h2>
            <p className="text-[11px] text-[#66758A]">Driver and loss location information.</p>
          </div>
          <span className="rounded border border-[#D9E3F0] bg-[#F7F9FC] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#526178]">Details</span>
        </div>
        <div className="grid divide-y divide-[#E7EEF7] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <DetailLine title="Driver / DL Number" value={driverNumber} verified={Boolean(driverVerification?.is_valid)} action={<VerifyDetailButton claimId={claim.id} detailKey="driver" detailLabel="Driver / DL Number" detailValue={driverNumber ?? ""} disabled={!driverNumber} />} />
          <DetailLine title="Loss Location" value={claim.accident_location} verified={Boolean(locationVerification?.is_valid)} action={<VerifyDetailButton claimId={claim.id} detailKey="location" detailLabel="Loss Location" detailValue={claim.accident_location ?? ""} disabled={!claim.accident_location} />} />
        </div>
      </section>

      <section className="rounded-lg border border-[#D9E3F0] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E7EEF7] px-4 py-2.5">
          <div>
            <h2 className="text-[15px] font-semibold">Document Verification</h2>
            <p className="text-[11px] text-[#66758A]">Required spot survey documents.</p>
          </div>
          <div className="rounded border border-[#D9E3F0] bg-[#F7F9FC] px-3 py-1 text-right">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#66758A]">Verified</p>
            <p className="text-[14px] font-bold text-[#071D49]">{verifiedCount}/{items.length}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-[12px]">
            <thead className="bg-[#F7F9FC] text-[10px] uppercase tracking-[0.08em] text-[#526178]">
              <tr>
                <th className="w-[44px] px-4 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Document</th>
                <th className="px-3 py-2 font-semibold">File</th>
                <th className="px-3 py-2 font-semibold">Uploaded</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EEF7]">
              {items.map((item) => <DocumentRow key={item.key} item={item} claim={claim} verification={latestVerificationForItem(item, verifications)} />)}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 border-t border-[#E7EEF7] bg-[#FBFCFE] px-4 py-3 lg:grid-cols-[1fr_190px] lg:items-end">
          <label className="block">
            <span className="text-[11px] font-semibold">Remarks (Optional)</span>
            <textarea className="mt-1 h-[38px] w-full resize-none rounded border border-[#C9D4E3] bg-white px-2 py-1.5 text-[12px] outline-none focus:border-[#174EA6]" placeholder="Enter remarks here..." />
          </label>
          <button type="button" className="h-[38px] rounded bg-[#071D49] px-4 text-[12px] font-semibold text-white hover:bg-[#12356C]">Submit &amp; Proceed</button>
        </div>
      </section>
    </div>
  );
}

function CompactClaimHeader({ claim }: { claim: SpotSurveyClaim }) {
  const customerName = claim.customers?.company_name || claim.customers?.contact_name || "-";
  const insurer = claim.insurance_companies?.name || "-";
  const insurerRef = claim.insurer_claim_no || claim.policies?.policy_no || claim.claim_no;
  return <section className="grid rounded-lg border border-[#D9E3F0] bg-white shadow-sm md:grid-cols-4"><Info label="Customer" value={customerName} sub={claim.customers?.phone ?? "-"} /><Info label="Vehicle" value={claim.vehicles?.vehicle_no ?? "-"} /><Info label="Make / Model" value={claim.vehicles?.make ?? "-"} sub={claim.vehicles?.model ?? "-"} /><Info label="Insurance" value={insurer} sub={insurerRef} last /></section>;
}

function Info({ label, value, sub, last = false }: { label: string; value: string; sub?: string | null; last?: boolean }) {
  return <div className={`min-h-[62px] px-4 py-2.5 ${last ? "" : "border-b border-[#E7EEF7] md:border-b-0 md:border-r"}`}><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#174EA6]">{label}</p><p className="mt-0.5 truncate text-[14px] font-semibold text-[#071D49]">{value}</p>{sub ? <p className="truncate text-[12px] text-[#1F2B3D]">{sub}</p> : null}</div>;
}

function DetailLine({ title, value, verified, action }: { title: string; value?: string | null; verified: boolean; action: React.ReactNode }) {
  return <div className="grid grid-cols-[150px_1fr_100px] items-center gap-3 px-4 py-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#66758A]">{title}</p></div><p className="truncate text-[13px] font-medium text-[#071D49]">{value || "Not available"}</p><div>{verified ? <span className="inline-flex h-8 w-full items-center justify-center rounded border border-green-200 bg-green-50 text-[12px] font-semibold text-green-700">Verified</span> : action}</div></div>;
}

function DocumentRow({ item, claim, verification }: { item: Item; claim: SpotSurveyClaim; verification?: SpotSurveyVerification }) {
  const doc = item.document;
  const status = doc?.verification_status ?? "pending";
  const verified = status === "verified" || Boolean(verification?.is_valid);
  const invalid = verification && !verification.is_valid;
  return <tr className={`${verified ? "bg-green-50/35" : invalid ? "bg-red-50/30" : "bg-white"} hover:bg-[#F8FBFF]`}><td className="px-4 py-2.5 align-middle"><span className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#EEF4FC] text-[11px] font-bold text-[#071D49]">{item.no}</span></td><td className="px-3 py-2.5 align-middle"><p className="font-semibold text-[#071D49]">{item.title}</p><p className="text-[10px] text-[#66758A]">{item.documentType}</p></td><td className="max-w-[270px] px-3 py-2.5 align-middle"><p className="truncate font-medium text-[#071D49]">{doc?.file_name ?? "Document not uploaded"}</p>{doc?.signedUrl ? <Link href={doc.signedUrl} target="_blank" className="text-[11px] font-semibold text-[#00875A]">Preview</Link> : null}{invalid ? <p className="line-clamp-1 text-[10px] font-semibold text-red-700">{verification.invalid_reason}</p> : null}</td><td className="px-3 py-2.5 align-middle text-[#526178]">{formatDateShort(doc?.created_at)}</td><td className="px-3 py-2.5 align-middle">{verified ? <span className="rounded border border-green-200 bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700">Verified</span> : invalid ? <span className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">Invalid</span> : <span className="rounded border border-[#D9E3F0] bg-[#F7F9FC] px-2 py-1 text-[11px] font-semibold text-[#526178]">{statusLabel(status)}</span>}</td><td className="px-3 py-2.5 align-middle"><div className="flex justify-end gap-2">{doc ? verified ? <button disabled className="h-8 min-w-[76px] rounded border border-green-200 bg-green-50 px-3 text-[12px] font-semibold text-green-700">Verified</button> : <VerificationActionButton claimId={claim.id} documentId={doc.id} itemKey={item.key} incidentDate={claim.accident_at} /> : <button disabled className="h-8 min-w-[76px] rounded border border-slate-200 bg-slate-50 px-3 text-[12px] font-semibold text-slate-400">Verify</button>}{doc?.signedUrl ? <Link href={doc.signedUrl} target="_blank" className="inline-flex h-8 min-w-[76px] items-center justify-center rounded border border-[#4C68A6] bg-white px-3 text-[12px] font-semibold text-[#174EA6]">Reload</Link> : null}<ReplaceDocumentButton claimId={claim.id} customerId={claim.customer_id} documentType={item.documentType} label={item.title} /></div></td></tr>;
}

function buildItems(documents: SpotSurveyDocument[]): Item[] {
  const doc = (key: keyof typeof aliases) => documents.find((d) => aliases[key].includes(d.document_type.toLowerCase()) && d.verification_status !== "rejected") ?? documents.find((d) => aliases[key].includes(d.document_type.toLowerCase())) ?? null;
  return [{ key: "rc", no: 1, title: "RC Copy", documentType: "Registration certificate", document: doc("rc") }, { key: "insurance", no: 2, title: "Insurance Copy", documentType: "Policy copy", document: doc("insurance") }, { key: "dl", no: 3, title: "Driving Licence Copy", documentType: "Driving licence", document: doc("dl") }, { key: "gr", no: 4, title: "GR / Load Challan Copy", documentType: "GR Copy / Road Challan", document: doc("gr") }];
}

function latestVerificationForItem(item: Item, verifications: SpotSurveyVerification[]) { return verifications.find((row) => item.document?.id && row.document_id === item.document.id) ?? verifications.find((row) => row.verification_type === item.key && row.is_valid) ?? verifications.find((row) => row.verification_type === item.key); }
function latestDetailVerification(detailKey: string, verifications: SpotSurveyVerification[]) { return verifications.find((row) => row.verification_type === "detail" && getDetailKey(row) === detailKey && row.is_valid) ?? verifications.find((row) => row.verification_type === "detail" && getDetailKey(row) === detailKey); }
function getDetailKey(row: SpotSurveyVerification) { const value = row.details?.spot_survey_detail_key; return typeof value === "string" ? value : ""; }
function isVerified(item: Item, verifications: SpotSurveyVerification[]) { return item.document?.verification_status === "verified" || Boolean(latestVerificationForItem(item, verifications)?.is_valid); }
function extractDriverNumber(value?: string | null) { return value?.match(/[A-Z]{2}\d{2}\s?\d{4}\s?\d{7}/i)?.[0] ?? null; }
function statusLabel(status: string) { if (status === "verified") return "Verified"; if (status === "rejected") return "Rejected"; return "Pending"; }
function formatDateShort(value?: string | null) { return value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"; }
