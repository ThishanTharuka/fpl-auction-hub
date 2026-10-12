export function BidSkeleton() {
  return (
    <div className="min-h-screen lg:h-screen overflow-y-auto lg:overflow-hidden">
      <div className="mx-auto max-w-[1440px] flex flex-col lg:flex-row gap-4 h-full px-4 py-4">
        {/* Centre skeleton */}
        <main className="flex-1 flex flex-col gap-4 overflow-hidden lg:order-2">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              <div className="h-5 w-40 rounded bg-muted animate-pulse" />
            </div>
            <div className="text-right space-y-1">
              <div className="h-7 w-20 rounded bg-muted animate-pulse ml-auto" />
              <div className="h-3 w-16 rounded bg-muted animate-pulse ml-auto" />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 min-h-[300px] animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-12 rounded-full bg-muted" />
                  <div className="h-3 w-16 rounded bg-muted" />
                </div>
                <div className="h-7 w-48 rounded bg-muted" />
              </div>
              <div className="text-right space-y-1">
                <div className="h-10 w-16 rounded bg-muted" />
                <div className="h-3 w-10 rounded bg-muted ml-auto" />
              </div>
            </div>
            <div className="mb-4">
              <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-background p-4 animate-pulse">
                <div className="flex gap-4 flex-wrap items-start">
                  <div className="w-[120px] h-[148px] rounded-xl bg-muted" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-5 w-44 rounded bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted" />
                    <div className="h-5 w-16 rounded-full bg-muted" />
                    <div className="h-3 w-16 rounded bg-muted" />
                    <div className="h-3 w-20 rounded bg-muted" />
                  </div>
                  <div className="shrink-0 grid grid-cols-1 gap-2">
                    <div className="h-[68px] w-[76px] rounded-xl bg-muted" />
                    <div className="h-[68px] w-[76px] rounded-xl bg-muted" />
                  </div>
                </div>
                <div className="my-3 border-t border-border/40" />
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-[52px] rounded-xl bg-muted" />
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-4 mb-4 space-y-2">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-8 w-32 rounded bg-muted" />
            </div>
            <div className="h-12 w-full rounded bg-muted" />
          </div>
        </main>

        {/* Right skeleton */}
        <aside className="w-full lg:w-72 shrink-0 lg:order-3">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3 animate-pulse">
            <div className="h-3 w-28 rounded bg-muted" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-5 gap-1">
                <div className="h-5 w-10 rounded-full bg-muted" />
                <div className="h-4 w-6 rounded bg-muted mx-auto" />
                <div className="h-4 w-6 rounded bg-muted mx-auto" />
                <div className="h-4 w-12 rounded bg-muted ml-auto" />
                <div className="h-4 w-12 rounded bg-muted ml-auto" />
              </div>
            ))}
          </div>
        </aside>

        {/* Left skeleton */}
        <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-4 order-3 lg:order-1">
          <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 w-16 rounded bg-muted" />
              <div className="h-3 w-12 rounded bg-muted" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between bg-muted rounded px-3 py-1.5 mb-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-20 rounded bg-muted" />
                  <div className="h-3 w-8 rounded bg-muted" />
                </div>
                <div className="h-3 w-12 rounded bg-muted" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
