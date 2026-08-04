export function SpectateSkeleton() {
  return (
    <div className="min-h-screen flex flex-col animate-pulse">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 py-4">
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

        <div className="mt-3 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
          <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] p-6 space-y-4 min-h-[320px]">
            <div className="h-6 w-40 rounded bg-[#1e2b3b]" />
            <div className="h-10 w-72 rounded bg-[#1e2b3b]" />
            <div className="h-16 w-full rounded-lg bg-[#132030]" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-[#1e2b3b]" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] p-4 space-y-2 h-fit">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-[#1e2b3b]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
