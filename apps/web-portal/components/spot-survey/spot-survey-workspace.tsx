import Link from "next/link";

export type SpotSurveyClaim = {
  id: string;
  claim_no: string;
  insurer_claim_no?: string | null;
  accident_location: string | null;
  accident_description: string | null;
  customers: { company_name: string | null; contact_name: string; phone: string | null } | null;
  vehicles: { vehicle_no: string; make: string | null; model: string | null } | null;
  policies: { policy_no: string | null } | null;
  insurance_companies: { name: string | null } | null;
};

export type SpotSurveyDocument = {
  id: string;
  document_type: string;
  file_name: string;
  verification_status: "pending" | "verified" | "rejected";
  rejection_reason: string | null;
  created_at: string | null;
  signedUrl?: string | null;
};

type VerificationItem = {
  key: string;
  number: number;
  title: string;
  icon: string;
  accent: string;
  document?: SpotSurveyDocument | null;
  detailLabel?: string;
  detailValue?: string | null;
  status?: "verified" | "pending" | "rejected";
};

const documentAliases: Record<string, string[]> = {
  rc: ["RC Copy", "Registration certificate", "Registration Certificate"],
  insurance: ["Insurance Copy", "Policy copy", "Policy Copy"],
  dl: ["Driving licence", "Driving Licence", "Driving Licence Copy", "DL Copy"],
  gr: ["GR Copy / Road Challan", "GR / Load Challan Copy", "Road Challan", "Load Challan"]
};

export function SpotSurveyWorkspace({ claim, documents }: { claim: SpotSurveyClaim; documents: SpotSurveyDocument[] }) {
  const items = buildItems(claim, documents);
  const verifiedCount = items.filter((item) => item.status === "verified" || item.document?.verification_status === "verified").length;

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 pb-8">
      <ClaimInfoStrip claim={claim} />

      <section className="rounded-[20px] border border-[#DFE8F4] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(7,29,73,0.045)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[25px] font-semibold leading-tight tracking-[-0.02em] text-[#071D49]">Documents &amp; Details Verification</h1>
            <p className="mt-1 text-[14px] leading-5 text-[#4B596B]">Please verify all documents and details collected during spot survey.</p>
          </div>
          <div className="hidden rounded-2xl bg-[#F4F7FC] px-4 py-2 text-right lg:block">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#68758A]">Verified</p>
            <p className="text-[20px] font-semibold text-[#071D49]">{verifiedCount}/{items.length}</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {items.map((item) => <SpotVerificationCard key={item.key} item={item} claimId={claim.id} />)}
        </div>

        <div className="mt-5 grid gap-4 rounded-[14px] border border-[#E4ECF6] bg-[#FBFCFE] p-3 lg:grid-cols-[1fr_255px] lg:items-end">
          <label className="block">
            <span className="text-[13px] font-semibold text-[#071D49]">Remarks (Optional)</span>
            <textarea className="mt-1.5 h-[54px] w-full resize-none rounded-lg border border-[#C9D4E3] bg-white px-3 py-2 text-[13px] text-[#071D49] outline-none placeholder:text-[#8B98A9] focus:border-[#174EA6] focus:ring-4 focus:ring-blue-100" placeholder="Enter remarks here..." />
          </label>
          <button type="button" className="flex h-[54px] items-center justify-center gap-3 rounded-lg bg-[#071D49] px-5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#12356C]">
            Submit &amp; Proceed
            <span className="text-[22px] leading-none">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function ClaimInfoStrip({ claim }: { claim: SpotSurveyClaim }) {
  const customerName = claim.customers?.company_name || claim.customers?.contact_name || "-";
  const insurer = claim.insurance_companies?.name || "-";
  const insurerRef = claim.insurer_claim_no || claim.policies?.policy_no || claim.claim_no;

  return (
    <section className="grid overflow-hidden rounded-[18px] border border-[#DFE8F4] bg-[#F8FBFF] shadow-[0_8px_24px_rgba(7,29,73,0.035)] md:grid-cols-4">
      <SummaryCell icon="👤" label="Customer Name" title={customerName} subtitle={claim.customers?.phone ?? "-"} />
      <SummaryCell icon="🚗" label="Vehicle Number" title={claim.vehicles?.vehicle_no ?? "-"} />
      <SummaryCell icon="🚘" label="Make / Model" title={claim.vehicles?.make ?? "-"} subtitle={claim.vehicles?.model ?? "-"} />
      <SummaryCell icon="🛡️" label="Insurance Company" title={insurer} subtitle={insurerRef} last />
    </section>
  );
}

function SummaryCell({ icon, label, title, subtitle, last = false }: { icon: string; label: string; title: string; subtitle?: string | null; last?: boolean }) {
  return (
    <div className={`flex min-h-[118px] items-center gap-5 px-7 py-5 ${last ? "" : "border-b border-[#DFE8F4] md:border-b-0 md:border-r"}`}>
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#EEF4FC] text-[28px] text-[#071D49]">{icon}</div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium leading-5 text-[#174EA6]">{label}</p>
        <p className="mt-0.5 truncate text-[18px] font-semibold leading-6 text-[#071D49]">{title}</p>
        {subtitle ? <p className="mt-0.5 truncate text-[16px] leading-5 text-[#071D49]">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function SpotVerificationCard({ item, claimId }: { item: VerificationItem; claimId: string }) {
  const status = item.status ?? item.document?.verification_status ?? "pending";
  const isVerified = status === "verified";

  return (
    <article className="relative min-h-[295px] rounded-[18px] border border-[#E2EAF4] bg-white p-5 shadow-[0_8px_22px_rgba(7,29,73,0.035)]">
      <div className="mb-4 flex items-center gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F0E9FF] text-[18px] font-semibold text-[#071D49]">{item.number}</span>
        <h2 className="text-[22px] font-semibold leading-tight text-[#071D49]">{item.title}</h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-[150px_1fr] sm:items-center">
        <div className={`grid h-[132px] w-[150px] place-items-center rounded-[16px] ${item.accent}`}>
          <div className="text-[64px] leading-none">{item.icon}</div>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-[#071D49]">{item.document?.file_name ?? item.detailLabel ?? "Document not uploaded"}</p>
          {item.document?.signedUrl ? <Link href={item.document.signedUrl} target="_blank" className="mt-1 inline-block text-[14px] font-medium text-[#139657]">Preview available</Link> : <p className={`mt-1 text-[14px] font-medium ${isVerified ? "text-[#139657]" : status === "rejected" ? "text-[#C0362C]" : "text-[#8B98A9]"}`}>{statusLabel(status)}</p>}
          {item.detailValue ? <p className="mt-3 whitespace-pre-line text-[14px] leading-5 text-[#071D49]">{item.detailValue}</p> : null}
          <p className="mt-4 text-[13px] leading-5 text-[#071D49]">Uploaded on<br />{formatDate(item.document?.created_at)}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <button type="button" className="h-11 rounded-lg border border-[#16A36A] bg-white text-[14px] font-semibold text-[#16895C] transition hover:bg-[#F2FBF7]">♢ Verify</button>
        <button type="button" className="h-11 rounded-lg border border-[#4C68A6] bg-white text-[14px] font-semibold text-[#174EA6] transition hover:bg-[#F4F7FF]">⟳ Reload</button>
        <button type="button" className="h-11 rounded-lg border border-[#D15B5B] bg-white text-[14px] font-semibold text-[#C43D3D] transition hover:bg-[#FFF5F5]">▧ Replace</button>
      </div>
    </article>
  );
}

function buildItems(claim: SpotSurveyClaim, documents: SpotSurveyDocument[]): VerificationItem[] {
  const doc = (key: keyof typeof documentAliases) => {
    const aliases = documentAliases[key].map((name) => name.toLowerCase());
    return documents.find((item) => aliases.includes(item.document_type.toLowerCase()) && item.verification_status !== "rejected") ?? documents.find((item) => aliases.includes(item.document_type.toLowerCase())) ?? null;
  };

  return [
    { key: "rc", number: 1, title: "RC Copy", icon: "📄", accent: "bg-[#F1ECFF]", document: doc("rc") },
    { key: "insurance", number: 2, title: "Insurance Copy", icon: "📃", accent: "bg-[#FFF3D9]", document: doc("insurance") },
    { key: "dl", number: 3, title: "Driving Licence Copy", icon: "🪪", accent: "bg-[#EAF8EF]", document: doc("dl") },
    { key: "gr", number: 4, title: "GR / Load Challan Copy", icon: "🚚", accent: "bg-[#FFF1E6]", document: doc("gr") },
    { key: "driver", number: 5, title: "Driver Number", icon: "👤", accent: "bg-[#EEF6FF]", detailLabel: "DL Number", detailValue: extractDriverNumber(claim.accident_description), status: extractDriverNumber(claim.accident_description) ? "verified" : "pending" },
    { key: "location", number: 6, title: "Loss Location", icon: "📍", accent: "bg-[#F2EDFF]", detailLabel: "Location", detailValue: claim.accident_location, status: claim.accident_location ? "verified" : "pending" }
  ];
}

function extractDriverNumber(value?: string | null) {
  if (!value) return null;
  return value.match(/[A-Z]{2}\d{2}\s?\d{4}\s?\d{7}/i)?.[0] ?? null;
}

function statusLabel(status: string) {
  if (status === "verified") return "Verified";
  if (status === "rejected") return "Rejected";
  return "Pending verification";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
