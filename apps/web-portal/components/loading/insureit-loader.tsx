export function InsureItLoader({ label = "Processing claim operation", sublabel = "Please wait while InsureIt updates the workspace.", compact = false }: { label?: string; sublabel?: string; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "gap-2" : "gap-4"}`} role="status" aria-live="polite">
      <div className={`relative ${compact ? "h-12 w-12" : "h-20 w-20"}`}>
        <div className="absolute inset-0 rounded-2xl border border-[#BFD3F7] bg-white shadow-[0_18px_45px_rgba(7,29,73,0.14)]" />
        <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-[#071D49] via-[#12356C] to-[#174EA6] shadow-inner" />
        <div className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-[#F59E0B] border-r-[#20C997] animate-[insureit-orbit_1.1s_linear_infinite]" />
        <div className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg bg-white text-[16px] font-black text-[#071D49] shadow-sm">
          <span className="animate-[insureit-pulse_1.2s_ease-in-out_infinite]">I</span>
        </div>
        <span className="absolute -right-1 top-2 h-2.5 w-2.5 rounded-full bg-[#20C997] shadow-[0_0_0_4px_rgba(32,201,151,0.18)] animate-[insureit-blip_1s_ease-in-out_infinite]" />
      </div>
      <div>
        <p className={`${compact ? "text-[12px]" : "text-[15px]"} font-semibold text-[#071D49]`}>{label}</p>
        {!compact ? <p className="mt-1 text-[12px] text-[#526178]">{sublabel}</p> : null}
      </div>
      {!compact ? <div className="h-1.5 w-52 overflow-hidden rounded-full bg-[#E8EFF8]"><div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#071D49] via-[#174EA6] to-[#20C997] animate-[insureit-progress_1.15s_ease-in-out_infinite]" /></div> : null}
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
