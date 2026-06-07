export function BidSkeleton() {
  return (
    <div className="min-h-screen lg:h-screen overflow-y-auto lg:overflow-hidden">
      <div className="mx-auto max-w-[1440px] flex flex-col lg:flex-row gap-4 h-full px-4 py-4">
        {/* Centre skeleton */}
        <main className="flex-1 flex flex-col gap-4 overflow-hidden lg:order-2">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-[#1e2b3b] animate-pulse" />
              <div className="h-5 w-40 rounded bg-[#1e2b3b] animate-pulse" />
            </div>
            <div className="text-right space-y-1">
              <div className="h-7 w-20 rounded bg-[#1e2b3b] animate-pulse ml-auto" />
              <div className="h-3 w-16 rounded bg-[#1e2b3b] animate-pulse ml-auto" />
            </div>
          </div>

          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5 min-h-[300px] animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-12 rounded-full bg-[#1e2b3b]" />
                  <div className="h-3 w-16 rounded bg-[#1e2b3b]" />
                </div>
                <div className="h-7 w-48 rounded bg-[#1e2b3b]" />
              </div>
              <div className="text-right space-y-1">
                <div className="h-10 w-16 rounded bg-[#1e2b3b]" />
                <div className="h-3 w-10 rounded bg-[#1e2b3b] ml-auto" />
              </div>
            </div>
            <div className="flex gap-4 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-1 space-y-1">
                  <div className="h-3 w-12 rounded bg-[#1e2b3b]" />
                  <div className="h-6 w-full rounded bg-[#1e2b3b]" />
                </div>
              ))}
            </div>
            <div className="bg-[#132030] rounded-lg p-4 mb-4 space-y-2">
              <div className="h-3 w-24 rounded bg-[#1e2b3b]" />
              <div className="h-8 w-32 rounded bg-[#1e2b3b]" />
            </div>
            <div className="h-12 w-full rounded bg-[#1e2b3b]" />
          </div>
        </main>

        {/* Right skeleton */}
        <aside className="w-full lg:w-72 shrink-0 lg:order-3">
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4 space-y-3 animate-pulse">
            <div className="h-3 w-28 rounded bg-[#1e2b3b]" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-5 gap-1">
                <div className="h-5 w-10 rounded-full bg-[#1e2b3b]" />
                <div className="h-4 w-6 rounded bg-[#1e2b3b] mx-auto" />
                <div className="h-4 w-6 rounded bg-[#1e2b3b] mx-auto" />
                <div className="h-4 w-12 rounded bg-[#1e2b3b] ml-auto" />
                <div className="h-4 w-12 rounded bg-[#1e2b3b] ml-auto" />
              </div>
            ))}
          </div>
        </aside>

        {/* Left skeleton */}
        <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-4 order-3 lg:order-1">
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4 animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 w-16 rounded bg-[#1e2b3b]" />
              <div className="h-3 w-12 rounded bg-[#1e2b3b]" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between bg-[#132030] rounded px-3 py-1.5 mb-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-20 rounded bg-[#1e2b3b]" />
                  <div className="h-3 w-8 rounded bg-[#1e2b3b]" />
                </div>
                <div className="h-3 w-12 rounded bg-[#1e2b3b]" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
