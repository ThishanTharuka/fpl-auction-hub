export function LobbySkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 w-56 rounded-xl bg-muted/60 animate-pulse" />
              <div className="h-4 w-32 rounded bg-muted/40 animate-pulse" />
            </div>
            <div className="h-7 w-20 rounded-full bg-muted/60 animate-pulse shrink-0" />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-6 space-y-4 animate-pulse">
            <div className="h-3.5 w-40 rounded bg-muted/50" />
            <div className="flex gap-3">
              <div className="h-9 w-32 rounded-full bg-muted/60" />
              <div className="h-9 w-28 rounded-full bg-muted/60" />
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-6 space-y-4 animate-pulse">
            <div className="h-3.5 w-24 rounded bg-muted/50" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/40 px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-muted/60" />
                  <div className="h-4 w-28 rounded bg-muted/50" />
                </div>
                <div className="h-7 w-16 rounded-full bg-muted/60" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
