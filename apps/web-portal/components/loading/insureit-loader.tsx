export function InsureItLoader({ label = "Loading", sublabel = "", compact = false }: { label?: string; sublabel?: string; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "gap-2" : "gap-3"}`} role="status" aria-live="polite">
      <div className={`relative ${compact ? "h-12 w-12" : "h-16 w-16"}`}>
        <div className="absolute inset-0 rounded-2xl bg-[#071D49] shadow-[0_18px_42px_rgba(7,29,73,0.18)]" />
        <div className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-[#F59E0B] border-r-[#20C997] animate-[insureit-orbit_0.9s_linear_infinite]" />
        <div className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl bg-white text-[15px] font-black text-[#071D49]">
          I
        </div>
      </div>
      <div>
        <p className={`${compact ? "text-[13px]" : "text-[15px]"} font-semibold text-[#071D49]`}>{label}</p>
        {!compact && sublabel ? <p className="mt-1 text-[12px] text-[#526178]">{sublabel}</p> : null}
      </div>
      {!compact ? <div className="h-1 w-40 overflow-hidden rounded-full bg-[#E8EFF8]"><div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#071D49] to-[#20C997] animate-[insureit-progress_1.05s_ease-in-out_infinite]" /></div> : null}
    </div>
  );
}

export function InsureItButtonLoader({ label = "Working" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative h-4 w-4 rounded-md bg-white/15">
        <span className="absolute inset-0 rounded-md border border-white/30 border-t-white animate-[insureit-orbit_0.75s_linear_infinite]" />
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white" />
      </span>
      <span>{label}</span>
    </span>
  );
}
