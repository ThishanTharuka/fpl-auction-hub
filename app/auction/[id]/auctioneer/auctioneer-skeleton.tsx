export function AuctioneerSkeleton() {
  return (
    <div className="h-screen lg:h-screen overflow-hidden animate-pulse">
      <div className="mx-auto max-w-[1440px] flex flex-col lg:flex-row gap-4 h-full px-4 py-4">
        {/* ── Left: Player search + sold log ───────────────────────── */}
        <aside className="w-full lg:w-72 flex flex-col gap-4 overflow-hidden">
          {/* Nominate Player */}
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 rounded bg-[#1e2b3b]" />
              <div className="h-5 w-5 rounded bg-[#1e2b3b]" />
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-1 h-6 rounded bg-[#1e2b3b]" />
              ))}
            </div>
            <div className="h-8 w-full rounded bg-[#1e2b3b]" />
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded bg-[#132030] px-3 py-1.5"
                >
                  <div className="space-y-1">
                    <div className="h-2.5 w-20 rounded bg-[#1e2b3b]" />
                    <div className="h-2 w-10 rounded bg-[#1e2b3b]" />
                  </div>
                  <div className="h-4 w-8 rounded bg-[#1e2b3b]" />
                </div>
              ))}
            </div>
          </div>

          {/* Sold log (desktop) */}
          <div className="hidden lg:flex rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4 flex-1 overflow-hidden flex-col">
            <div className="h-3 w-16 rounded bg-[#1e2b3b] mb-3" />
            <div className="space-y-1 overflow-y-auto flex-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded bg-[#132030] px-2.5 py-1.5"
                >
                  <div className="space-y-1">
                    <div className="h-2.5 w-16 rounded bg-[#1e2b3b]" />
                    <div className="h-2 w-12 rounded bg-[#1e2b3b]" />
                  </div>
                  <div className="h-2.5 w-10 rounded bg-[#1e2b3b]" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Centre: Live nomination ──────────────────────────────── */}
        <main className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-10 rounded bg-[#1e2b3b]" />
                  <div className="h-3 w-16 rounded bg-[#1e2b3b]" />
                </div>
                <div className="h-8 w-56 rounded bg-[#1e2b3b]" />
                <div className="h-3 w-32 rounded bg-[#1e2b3b]" />
              </div>
              <div className="text-right space-y-2">
                <div className="h-10 w-16 rounded bg-[#1e2b3b] ml-auto" />
                <div className="h-3 w-12 rounded bg-[#1e2b3b] ml-auto" />
              </div>
            </div>

            {/* Stats bar skeleton */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-[#1e2b3b]" />
              ))}
            </div>

            {/* Current bid */}
            <div className="bg-[#132030] rounded-lg p-4 mb-4">
              <div className="h-3 w-24 rounded bg-[#1e2b3b] mb-2" />
              <div className="h-8 w-28 rounded bg-[#1e2b3b]" />
              <div className="h-3 w-20 rounded bg-[#1e2b3b] mt-2" />
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <div className="flex-1 h-14 rounded-lg bg-[#1e2b3b]" />
              <div className="h-14 w-14 rounded-lg bg-[#1e2b3b]" />
              <div className="h-14 w-14 rounded-lg bg-[#1e2b3b]" />
            </div>
          </div>

          {/* Bid history */}
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4 flex-1 overflow-hidden flex flex-col">
            <div className="h-3 w-24 rounded bg-[#1e2b3b] mb-3" />
            <div className="space-y-1 overflow-y-auto flex-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs"
                >
                  <div className="h-2 w-2 rounded-full bg-[#1e2b3b] shrink-0" />
                  <div className="h-2.5 w-20 rounded bg-[#1e2b3b]" />
                  <div className="h-2.5 w-10 rounded bg-[#1e2b3b] ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* ── Right: Teams / Budgets (desktop) ─────────────────────── */}
        <aside className="hidden lg:flex w-80 shrink-0 flex-col gap-4 overflow-hidden">
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4 space-y-2 flex-1 overflow-y-auto">
            <div className="h-3 w-20 rounded bg-[#1e2b3b] mb-2" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg bg-[#132030] px-3 py-2.5"
              >
                <div className="h-8 w-8 rounded-full bg-[#1e2b3b] shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-20 rounded bg-[#1e2b3b]" />
                  <div className="h-2 w-12 rounded bg-[#1e2b3b]" />
                </div>
                <div className="text-right space-y-1">
                  <div className="h-2.5 w-10 rounded bg-[#1e2b3b] ml-auto" />
                  <div className="h-2 w-8 rounded bg-[#1e2b3b] ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
