import { Suspense } from "react";
import { TeamsClient } from "./teams-client";
import { getFplData } from "@/lib/fpl-data";

function TeamsPageSkeleton() {
  const slotCounts = { gkp: 1, def: 4, mid: 3, fwd: 3 };
  const positions = ["gkp", "def", "mid", "fwd"] as const;

  function SlotPlaceholder() {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div className="w-12 h-14 rounded-md border-2 border-dashed border-white/10 opacity-30" />
        <div className="bg-white/5 rounded px-1.5 py-0.5 text-center min-w-[60px]">
          <div className="h-[15px] bg-white/10 rounded w-10 mx-auto mb-0.5" />
          <div className="h-[13px] bg-white/10 rounded w-8 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 animate-pulse">
      {/* Toolbar */}
      <div className="mb-4 sm:mb-5 flex flex-wrap items-center gap-3">
        <div className="h-8 bg-[#1e2b3b] rounded w-40" />
        <div className="h-8 bg-[#1e2b3b] rounded w-24" />
        <div className="h-4 bg-[#1e2b3b] rounded w-48 ml-auto" />
      </div>

      {/* Team tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4 min-h-[32px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-7 bg-[#1e2b3b] rounded-full w-24" />
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] border border-border rounded-xl overflow-hidden">
        {/* Left: Pitch + Bench */}
        <div>
          <div className="bg-[#1a5c35]">
            <div className="p-6 pb-4 min-h-[520px]">
              <div className="flex flex-col items-center gap-1">
                {positions.map((pos) => (
                  <div key={pos} className="w-full flex flex-col items-center">
                    <div className="h-3 bg-white/10 rounded w-8 mb-1" />
                    <div className="flex justify-center gap-3">
                      {Array.from({ length: slotCounts[pos] }).map((_, i) => (
                        <SlotPlaceholder key={i} />
                      ))}
                    </div>
                    {pos !== "fwd" && <div className="w-full my-2 border-t border-white/5" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-[#163d24] border-t border-white/10 py-3 min-h-[120px]">
            <div className="h-3 bg-white/10 rounded w-10 mx-auto mb-2" />
            <div className="flex justify-center gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SlotPlaceholder key={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Squad sidebar */}
        <div className="border-l border-border flex flex-col bg-[#0f1c2c]">
          <div className="px-4 py-3 border-b border-border/50">
            <div className="h-4 bg-[#1e2b3b] rounded w-24 mb-1" />
            <div className="h-3 bg-[#1e2b3b] rounded w-32" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {["GKP", "DEF", "MID", "FWD"].map((pos, i) => (
              <div key={pos}>
                <div className="h-3 bg-[#1e2b3b] rounded w-12 mb-2" />
                {Array.from({ length: [2, 4, 4, 3][i]! }).map((_, j) => (
                  <div key={j} className="h-10 bg-[#1e2b3b] rounded w-full mb-1.5" />
                ))}
              </div>
            ))}
            <div>
              <div className="h-3 bg-[#1e2b3b] rounded w-12 mb-2" />
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="h-10 bg-[#1e2b3b] rounded w-full mb-1.5" />
              ))}
            </div>
          </div>
          <div className="px-4 py-3 border-t border-border/50 space-y-2">
            <div className="h-3 bg-[#1e2b3b] rounded w-full" />
            <div className="h-1.5 bg-[#1e2b3b] rounded-full w-full" />
            <div className="flex gap-1.5 pt-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-5 bg-[#1e2b3b] rounded-full w-16" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function TeamsLoader() {
  const data = await getFplData().catch(() => null);
  if (!data) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-12 text-center">
        <p className="text-red-400 text-sm">
          Failed to load player data. Please try again.
        </p>
      </div>
    );
  }
  return <TeamsClient players={data.players} currentGameweek={data.currentGameweek} />;
}

export default function TeamsPage() {
  return (
    <Suspense fallback={<TeamsPageSkeleton />}>
      <TeamsLoader />
    </Suspense>
  );
}
