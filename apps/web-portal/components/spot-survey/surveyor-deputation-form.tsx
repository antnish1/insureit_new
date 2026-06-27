"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deputeSpotSurveyor } from "@/app/claims/[id]/surveyor-actions";

type Result = { ok: boolean; message?: string };

export function SurveyorDeputationForm({ claimId, variant = "launcher", backHref }: { claimId: string; variant?: "launcher" | "form"; backHref?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  const [surveyorName, setSurveyorName] = useState("");
  const [surveyorNumber, setSurveyorNumber] = useState("");
  const [surveyorEmail, setSurveyorEmail] = useState("");

  const mobileValid = /^\d{10}$/.test(surveyorNumber.trim());
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(surveyorEmail.trim());
  const canSubmit = Boolean(surveyorName.trim() && mobileValid && emailValid);

  if (variant === "launcher") {
    return (
      <div className="mt-3 rounded-2xl border border-green-200 bg-green-50/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-[#071D49]">All documents verified successfully</h2>
            <p className="mt-1 text-[12px] text-[#526178]">You can now depute the spot surveyor for this claim.</p>
          </div>
          <Link href={`/claims/${claimId}/spot-surveyor`} className="inline-flex h-10 items-center rounded-lg bg-[#071D49] px-5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#12356C]">
            Depute Spot Surveyor
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        if (!canSubmit) return;
        startTransition(async () => {
          formData.set("claimId", claimId);
          const response = await deputeSpotSurveyor(formData);
          setResult(response);
          if (response.ok) router.refresh();
        });
      }}
      className="rounded-2xl border border-[#DFE8F4] bg-white p-5 shadow-[0_10px_24px_rgba(7,29,73,0.04)]"
    >
      <div>
        <h2 className="text-[20px] font-semibold text-[#071D49]">Surveyor Details</h2>
        <p className="mt-1 text-[13px] text-[#526178]">Please provide surveyor details to proceed.</p>
      </div>

      <div className="mt-5 space-y-5">
        <SurveyorField number={1} label="Surveyor Name" required>
          <input name="surveyorName" value={surveyorName} onChange={(event) => setSurveyorName(event.target.value)} placeholder="Enter surveyor name" className="mt-2 h-12 w-full rounded-lg border border-[#C9D4E3] bg-white px-4 text-[14px] text-[#071D49] outline-none transition focus:border-[#174EA6]" />
        </SurveyorField>

        <SurveyorField number={2} label="Surveyor Number" required helper={surveyorNumber && !mobileValid ? "Enter valid 10 digit mobile number." : undefined} invalid={Boolean(surveyorNumber && !mobileValid)}>
          <input name="surveyorNumber" value={surveyorNumber} onChange={(event) => setSurveyorNumber(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Enter surveyor mobile number" className={`mt-2 h-12 w-full rounded-lg border bg-white px-4 text-[14px] text-[#071D49] outline-none transition focus:border-[#174EA6] ${surveyorNumber && !mobileValid ? "border-red-300" : "border-[#C9D4E3]"}`} />
        </SurveyorField>

        <SurveyorField number={3} label="Surveyor Email" required helper={surveyorEmail && !emailValid ? "Enter valid email address." : undefined} invalid={Boolean(surveyorEmail && !emailValid)}>
          <input name="surveyorEmail" type="email" value={surveyorEmail} onChange={(event) => setSurveyorEmail(event.target.value)} placeholder="Enter surveyor email address" className={`mt-2 h-12 w-full rounded-lg border bg-white px-4 text-[14px] text-[#071D49] outline-none transition focus:border-[#174EA6] ${surveyorEmail && !emailValid ? "border-red-300" : "border-[#C9D4E3]"}`} />
        </SurveyorField>
      </div>

      {result ? <p className={`mt-5 rounded-lg border px-3 py-2 text-[12px] font-semibold ${result.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{result.message}</p> : null}

      <div className="mt-6 flex items-center justify-between border-t border-[#E6EEF7] pt-5">
        <Link href={backHref ?? `/claims/${claimId}`} className="inline-flex h-10 items-center rounded-lg border border-[#B8C5D6] px-6 text-[13px] font-semibold text-[#071D49]">Cancel</Link>
        <button type="submit" disabled={pending || !canSubmit || result?.ok} className="h-10 rounded-lg bg-[#071D49] px-8 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#A9B4C5] disabled:opacity-70">
          {pending ? "Submitting..." : result?.ok ? "Submitted" : "Submit"}
        </button>
      </div>
    </form>
  );
}

function SurveyorField({ number, label, children, required = false, helper, invalid = false }: { number: number; label: string; children: React.ReactNode; required?: boolean; helper?: string; invalid?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#F0E9FF] text-[13px] font-semibold text-[#071D49]">{number}</span>
        <label className="text-[14px] font-semibold text-[#071D49]">{label} {required ? <span className="text-red-600">*</span> : null}</label>
      </div>
      {children}
      {helper ? <p className={`mt-1 text-[11px] font-semibold ${invalid ? "text-red-600" : "text-[#526178]"}`}>{helper}</p> : null}
    </div>
  );
}
