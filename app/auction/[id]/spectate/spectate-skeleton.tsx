export function SpectateSkeleton() {
  return (
    <div className="h-screen flex flex-col animate-pulse">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="shrink-0 mx-auto w-full max-w-[1440px] px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-[#1e2b3b]" />
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-[#1e2b3b]" />
              <div className="h-4 w-40 rounded bg-[#1e2b3b]" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="space-y-2">
              <div className="h-5 w-10 rounded bg-[#1e2b3b] ml-auto" />
              <div className="h-3 w-8 rounded bg-[#1e2b3b] ml-auto" />
            </div>
            <div className="space-y-2">
              <div className="h-5 w-16 rounded bg-[#1e2b3b] ml-auto" />
              <div className="h-3 w-10 rounded bg-[#1e2b3b] ml-auto" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Body: three-column flex ──────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 mx-auto w-full max-w-[1440px] px-4 sm:px-6 pb-4">
        {/* ── Left: Sold history rail ────────────────────────────────── */}
        <aside className="w-full lg:w-72 lg:shrink-0 lg:min-h-0 lg:overflow-hidden lg:flex order-2 lg:order-1">
          <div className="w-full rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#3b4b3d] flex items-center justify-between shrink-0">
              <div className="h-3 w-20 rounded bg-[#1e2b3b]" />
              <div className="h-2.5 w-6 rounded bg-[#1e2b3b]" />
            </div>
            <div className="px-2 py-1.5 flex-1 min-h-0 overflow-y-auto space-y-0.5 max-h-44 lg:max-h-none">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-2 py-1.5 rounded-md space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#1e2b3b] shrink-0" />
                    <div className="h-2.5 w-6 rounded bg-[#1e2b3b] shrink-0" />
                    <div className="h-2.5 w-20 rounded bg-[#1e2b3b]" />
                  </div>
                  <div className="flex items-center justify-between pl-3">
                    <div className="h-2 w-14 rounded bg-[#1e2b3b]" />
                    <div className="h-2.5 w-8 rounded bg-[#1e2b3b]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Center: lot card + bidding ─────────────────────────────── */}
        <main className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden order-1 lg:order-2">
          {/* Lot card skeleton */}
          <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] flex-1 min-h-[320px] flex flex-col items-center justify-center text-center px-6 py-10">
            <div className="h-6 w-40 rounded bg-[#1e2b3b]" />
            <div className="mt-3 h-10 w-72 rounded bg-[#1e2b3b]" />
            <div className="mt-4 h-16 w-full rounded-lg bg-[#132030]" />
            <div className="mt-4 grid grid-cols-4 gap-2 w-full">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-[#1e2b3b]" />
              ))}
            </div>
          </div>
          {/* Bidding so far skeleton */}
          <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] flex flex-col overflow-hidden flex-1 min-h-0 max-h-87">
            <div className="px-4 py-2.5 border-b border-[#3b4b3d] shrink-0">
              <div className="h-3 w-24 rounded bg-[#1e2b3b]" />
            </div>
            <div className="px-2 py-1.5 space-y-0.5 overflow-y-auto flex-1 min-h-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                  <div className="h-2 w-2 rounded-full bg-[#1e2b3b] shrink-0" />
                  <div className="h-3 w-24 rounded bg-[#1e2b3b]" />
                  <div className="h-3 w-10 rounded bg-[#1e2b3b] ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* ── Right: Standings rail ──────────────────────────────────── */}
        <aside className="w-full lg:w-80 lg:shrink-0 lg:min-h-0 lg:overflow-hidden lg:flex order-3">
          <div className="w-full rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-[#132030] px-3 py-2.5">
                <div className="h-8 w-8 rounded-full bg-[#1e2b3b] shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-20 rounded bg-[#1e2b3b]" />
                  <div className="h-2 w-12 rounded bg-[#1e2b3b]" />
                </div>
                <div className="h-3 w-8 rounded bg-[#1e2b3b]" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
