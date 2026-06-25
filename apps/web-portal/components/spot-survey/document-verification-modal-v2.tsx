"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { verifySpotSurveyDocument } from "@/app/claims/[id]/spot-survey-actions";

type ModalType = "rc" | "insurance";
type Result = { ok: boolean; message?: string };
type Status = "" | "Valid" | "Invalid";

const rcRows = [
  ["fitness_valid_upto", "fitness_status", "Fitness Valid Upto"],
  ["tax_valid_upto", "tax_status", "Tax Valid Upto"],
  ["insurance_valid_upto", "insurance_status", "Insurance Valid Upto"],
  ["pucc_valid_upto", "pucc_status", "PUCC Valid Upto"],
  ["local_permit_valid_upto", "local_permit_status", "Local Permit Valid Upto"],
  ["national_permit_valid_upto", "national_permit_status", "National Permit Valid Upto"]
] as const;

export function DocumentVerificationModalButton({ claimId, documentId, modalType, incidentDate }: { claimId: string; documentId: string; modalType: ModalType; incidentDate?: string | null }) {
  const router = useRouter();
  const incident = dateOnly(incidentDate);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  const [saved, setSaved] = useState(false);
  const [rcDates, setRcDates] = useState<Record<string, string>>({});
  const [ins, setIns] = useState({ start: "", end: "", ncb: "", category: "", gvw: "" });

  const rcComplete = rcRows.every(([dateName]) => Boolean(rcDates[dateName]));
  const rcValid = rcRows.every(([dateName]) => expiryStatus(rcDates[dateName], incident) === "Valid");
  const insEndStatus = expiryStatus(ins.end, incident);
  const insComplete = Boolean(ins.start && ins.end && ins.ncb && ins.category && ins.gvw);
  const insDatesValid = Boolean(ins.start && ins.end && ins.start <= ins.end && insEndStatus === "Valid");
  const canSave = modalType === "rc" ? rcComplete && rcValid : insComplete && insDatesValid;

  const helperMessage = useMemo(() => {
    if (modalType === "rc") {
      if (!rcComplete) return "Enter all six RC dates to enable Save & Close.";
      if (!rcValid) return "One or more RC dates are invalid. Save & Close is disabled.";
      return "All RC dates are valid. You can save verification.";
    }
    if (!insComplete) return "Enter all required insurance details to enable Save & Close.";
    if (!insDatesValid) return "Insurance dates are invalid. Save & Close is disabled.";
    return "Insurance details are valid. You can save verification.";
  }, [modalType, rcComplete, rcValid, insComplete, insDatesValid]);

  return (
    <div>
      <button type="button" onClick={() => { setResult(null); setOpen(true); }} className={`h-8 w-full rounded-md border text-[12px] font-semibold ${saved ? "border-green-300 bg-green-50 text-green-700" : "border-[#16A36A] bg-white text-[#16895C] hover:bg-[#F2FBF7]"}`}>{saved ? "Verified" : "Verify"}</button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-4">
          <form
            action={(formData) => {
              if (!canSave) return;
              startTransition(async () => {
                formData.set("claimId", claimId);
                formData.set("documentId", documentId);
                const response = await verifySpotSurveyDocument(formData);
                setResult(response);
                if (response.ok) {
                  setSaved(true);
                  router.refresh();
                }
              });
            }}
            className="w-full max-w-[760px] overflow-hidden rounded-xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
          >
            <Header modalType={modalType} onClose={() => setOpen(false)} />
            <div className="max-h-[68vh] overflow-y-auto">
              {modalType === "rc" ? <RcFields incidentDate={incident} values={rcDates} setValues={setRcDates} /> : <InsuranceFields incidentDate={incident} values={ins} setValues={setIns} />}
              <div className="px-6 pb-4">
                <p className={`rounded-lg border px-3 py-2 text-[12px] font-semibold ${canSave ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{helperMessage}</p>
                {result ? <p className={`mt-2 rounded-lg border px-3 py-2 text-[12px] font-semibold ${result.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{result.message ?? (result.ok ? "Document verified successfully." : "Verification failed")}</p> : null}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[#E6EEF7] px-6 py-4">
              <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-md border border-[#B8C5D6] px-7 text-[13px] font-semibold text-[#071D49]">{result?.ok ? "Close" : "Cancel"}</button>
              <button type="submit" disabled={pending || Boolean(result?.ok) || !canSave} className="h-10 rounded-md bg-[#071D49] px-10 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#A9B4C5] disabled:opacity-70">{pending ? "Saving..." : result?.ok ? "Saved" : "Save & Close"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Header({ modalType, onClose }: { modalType: ModalType; onClose: () => void }) {
  return <div className="flex items-start justify-between border-b border-[#E6EEF7] px-6 py-5"><div className="flex items-start gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#EEF4FF] text-[32px]">{modalType === "rc" ? "📄" : "🛡️"}</div><div><h2 className="text-[22px] font-semibold leading-tight text-[#071D49]">{modalType === "rc" ? "RC Copy Verification Details" : "Insurance Copy Verification Details"}</h2><p className="mt-2 max-w-[520px] text-[13px] leading-5 text-[#4B596B]">{modalType === "rc" ? "Please verify the validity of the following details from RC." : "Please verify the following details from the insurance document."}</p></div></div><button type="button" onClick={onClose} className="text-[34px] leading-none text-[#071D49]">×</button></div>;
}

function RcFields({ incidentDate, values, setValues }: { incidentDate: string | null; values: Record<string, string>; setValues: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  return <div className="divide-y divide-[#E6EEF7]">{rcRows.map(([dateName, statusName, label], index) => <DateStatusRow key={dateName} number={index + 1} label={label} dateName={dateName} statusName={statusName} value={values[dateName] ?? ""} incidentDate={incidentDate} onChange={(next) => setValues((prev) => ({ ...prev, [dateName]: next }))} />)}</div>;
}

function DateStatusRow({ number, label, dateName, statusName, value, incidentDate, onChange }: { number: number; label: string; dateName: string; statusName: string; value: string; incidentDate: string | null; onChange: (value: string) => void }) {
  const status = expiryStatus(value, incidentDate);
  return <div className={`grid grid-cols-[52px_1fr_170px_170px] items-center gap-4 px-6 py-4 ${status === "Invalid" ? "bg-red-50/25" : ""}`}><Number number={number} /><p className="text-[14px] font-semibold text-[#071D49]">{label}</p><label><span className="mb-1 block text-[10px] font-semibold text-[#071D49]">Valid Upto</span><input name={dateName} type="date" value={value} onChange={(event) => onChange(event.target.value)} className={`h-10 w-full rounded-md border bg-white px-3 text-[13px] text-[#071D49] ${status === "Invalid" ? "border-red-300" : status === "Valid" ? "border-green-300" : "border-[#C9D4E3]"}`} /></label><div><span className="mb-1 block text-[10px] font-semibold text-[#071D49]">Status</span><StatusDisplay status={status} /><input type="hidden" name={statusName} value={status} /></div></div>;
}

function InsuranceFields({ incidentDate, values, setValues }: { incidentDate: string | null; values: { start: string; end: string; ncb: string; category: string; gvw: string }; setValues: React.Dispatch<React.SetStateAction<{ start: string; end: string; ncb: string; category: string; gvw: string }>> }) {
  const endStatus = expiryStatus(values.end, incidentDate);
  const startAfterEnd = Boolean(values.start && values.end && values.start > values.end);
  return <div className="divide-y divide-[#E6EEF7]"><div className="grid grid-cols-[52px_1fr_210px_210px] items-center gap-4 px-6 py-4"><Number number={1} /><p className="text-[14px] font-semibold text-[#071D49]">Insurance Start Date</p><DateInput label="Start Date" name="insurance_start_date" value={values.start} onChange={(value) => setValues((prev) => ({ ...prev, start: value }))} invalid={startAfterEnd} /><DateInput label="End Date" name="insurance_end_date" value={values.end} onChange={(value) => setValues((prev) => ({ ...prev, end: value }))} invalid={endStatus === "Invalid" || startAfterEnd} valid={endStatus === "Valid" && !startAfterEnd} /></div><input type="hidden" name="policy_status" value={startAfterEnd ? "Invalid" : endStatus} /><InsuranceRow number={2} label="NCB Verification"><div className="relative"><input name="ncb_percent" type="number" value={values.ncb} onChange={(event) => setValues((prev) => ({ ...prev, ncb: event.target.value }))} placeholder="Enter NCB %" className="h-10 w-full rounded-md border border-[#C9D4E3] px-3 pr-8 text-[13px]" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#68758A]">%</span></div></InsuranceRow><InsuranceRow number={3} label="Hazardous or Non Hazardous Policy"><select name="policy_type_check" value={values.category} onChange={(event) => setValues((prev) => ({ ...prev, category: event.target.value }))} className="h-10 w-full rounded-md border border-[#C9D4E3] px-3 text-[13px]"><option value="">Select</option><option>Hazardous</option><option>Non Hazardous</option><option>Not Mentioned</option></select></InsuranceRow><InsuranceRow number={4} label="GVW Mention (in Kgs)"><div className="relative"><input name="gvw_kg" type="number" value={values.gvw} onChange={(event) => setValues((prev) => ({ ...prev, gvw: event.target.value }))} placeholder="Enter GVW" className="h-10 w-full rounded-md border border-[#C9D4E3] px-3 pr-12 text-[13px]" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#68758A]">Kgs</span></div></InsuranceRow><div className="px-6 py-3"><div className={`rounded-lg border px-3 py-2 text-[12px] font-semibold ${endStatus === "Invalid" || startAfterEnd ? "border-red-200 bg-red-50 text-red-700" : endStatus === "Valid" ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>Insurance validity status: {startAfterEnd ? "Invalid - start date is after end date" : endStatus || "Select end date"}</div></div></div>;
}

function InsuranceRow({ number, label, children }: { number: number; label: string; children: React.ReactNode }) {
  return <div className="grid grid-cols-[52px_1fr_420px] items-center gap-4 px-6 py-4"><Number number={number} /><p className="text-[14px] font-semibold text-[#071D49]">{label} <span className="text-red-600">*</span></p>{children}</div>;
}

function DateInput({ label, name, value, onChange, invalid = false, valid = false }: { label: string; name: string; value: string; onChange: (value: string) => void; invalid?: boolean; valid?: boolean }) {
  return <label><span className="mb-1 block text-[10px] font-semibold text-[#071D49]">{label} <span className="text-red-600">*</span></span><input name={name} type="date" value={value} onChange={(event) => onChange(event.target.value)} className={`h-10 w-full rounded-md border bg-white px-3 text-[13px] text-[#071D49] ${invalid ? "border-red-300" : valid ? "border-green-300" : "border-[#C9D4E3]"}`} /></label>;
}

function StatusDisplay({ status }: { status: Status }) {
  const className = status === "Invalid" ? "border-red-200 text-red-600" : status === "Valid" ? "border-green-200 text-green-700" : "border-[#C9D4E3] text-[#8B98A9]";
  return <div className={`flex h-10 items-center gap-2 rounded-md border bg-white px-3 text-[13px] font-semibold ${className}`}><span>{status === "Invalid" ? "🚩" : status === "Valid" ? "🏳️" : "—"}</span><span className="flex-1">{status || "Auto"}</span><span className="text-[#68758A]">⌄</span></div>;
}

function Number({ number }: { number: number }) { return <span className="grid h-8 w-8 place-items-center rounded-md bg-[#EEF4FF] text-[16px] font-semibold text-[#071D49]">{number}</span>; }
function expiryStatus(date: string, incidentDate: string | null): Status { if (!date || !incidentDate) return ""; return date < incidentDate ? "Invalid" : "Valid"; }
function dateOnly(value?: string | null) { if (!value) return null; const parsed = new Date(value); if (Number.isNaN(parsed.getTime())) return null; return parsed.toISOString().slice(0, 10); }
