export function LobbySkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 lg:py-10">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-7 w-56 rounded bg-[#1e2b3b] animate-pulse" />
              <div className="h-4 w-32 rounded bg-[#1e2b3b] animate-pulse" />
            </div>
            <div className="h-6 w-16 rounded-full bg-[#1e2b3b] animate-pulse shrink-0" />
          </div>

          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5 space-y-4 animate-pulse">
            <div className="h-3 w-40 rounded bg-[#1e2b3b]" />
            <div className="flex gap-3">
              <div className="h-9 w-32 rounded bg-[#1e2b3b]" />
              <div className="h-9 w-28 rounded bg-[#1e2b3b]" />
            </div>
          </div>

          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5 space-y-4 animate-pulse">
            <div className="h-3 w-24 rounded bg-[#1e2b3b]" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-[#132030] px-3 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1e2b3b]" />
                  <div className="h-4 w-28 rounded bg-[#1e2b3b]" />
                </div>
                <div className="h-7 w-16 rounded bg-[#1e2b3b]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
