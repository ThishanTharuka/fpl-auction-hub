import { Suspense } from "react";
import { PlayersTable } from "./players-table";
import { getFplData } from "@/lib/fpl-data";

function PlayersTableSkeleton() {
  const rows = Array.from({ length: 20 });
  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 animate-pulse">
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-start sm:items-center gap-2 sm:gap-3">
        <div className="h-10 bg-[#1e2b3b] rounded w-full sm:w-56" />
        <div className="flex gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["All", "GKP", "DEF", "MID", "FWD"].map((p) => (
            <div key={p} className="h-8 bg-[#1e2b3b] rounded w-12 shrink-0" />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="h-8 bg-[#1e2b3b] rounded w-28" />
          <div className="flex items-center gap-1.5">
            <div className="h-8 bg-[#1e2b3b] rounded w-14" />
            <div className="h-8 bg-[#1e2b3b] rounded w-14" />
          </div>
          <div className="hidden sm:flex items-center gap-3 ml-auto">
            <div className="h-4 bg-[#1e2b3b] rounded w-16" />
            <div className="h-8 bg-[#1e2b3b] rounded w-24" />
          </div>
        </div>
      </div>

      {/* Mobile player count */}
      <div className="sm:hidden h-4 bg-[#1e2b3b] rounded w-20 mb-2" />

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border border-[#3b4b3d] overflow-hidden">
        <div className="bg-[#0f1c2c] border-b border-[#3b4b3d]">
          <div className="flex">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-10 flex-1 px-4 py-3">
                <div className="h-3 bg-[#1e2b3b] rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
        {rows.map((_, i) => (
          <div
            key={i}
            className={`flex border-b border-[#3b4b3d]/50 ${i % 2 === 0 ? "bg-[#061423]" : "bg-[#0a1828]"}`}
          >
            {Array.from({ length: 7 }).map((_, j) => (
              <div key={j} className="flex-1 px-4 py-2.5">
                <div className="h-3 bg-[#1e2b3b]/60 rounded w-3/4" />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-[#0a1828] rounded-lg border border-[#3b4b3d]/50 px-3.5 py-3"
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="h-4 bg-[#1e2b3b] rounded w-24" />
                <div className="h-3 bg-[#1e2b3b] rounded w-12" />
              </div>
              <div className="h-5 bg-[#1e2b3b] rounded w-[74px]" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 bg-[#1e2b3b] rounded w-[120px]" />
              <div className="h-3 bg-[#1e2b3b] rounded w-[60px] ml-auto" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="h-4 bg-[#1e2b3b] rounded w-36" />
        <div className="flex gap-2">
          <div className="h-8 bg-[#1e2b3b] rounded w-20" />
          <div className="h-8 bg-[#1e2b3b] rounded w-16" />
        </div>
      </div>
    </div>
  );
}

async function PlayersTableLoader() {
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
  return <PlayersTable players={data.players} />;
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<PlayersTableSkeleton />}>
      <PlayersTableLoader />
    </Suspense>
  );
}
