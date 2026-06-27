import { InsureItLoader } from "@/components/loading/insureit-loader";

export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F6F9FD] px-4" aria-live="polite" aria-busy="true">
      <div className="w-full max-w-[380px] rounded-3xl border border-[#DFE8F4] bg-white p-8 shadow-[0_28px_90px_rgba(7,29,73,0.12)]">
        <InsureItLoader label="Loading InsureIt workspace" sublabel="Preparing claim data, documents and operational actions." />
      </div>
    </div>
  );
}
