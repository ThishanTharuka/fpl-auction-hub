import { Suspense } from "react";
import { IndexBuilderClient } from "./index-builder-client";
import { getFplData } from "@/lib/fpl-data";

function IndexBuilderSkeleton() {
  const tableCols = ["#", "Player", "Pos", "Pts", "Key Stats", "Score"];
  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 pb-14 lg:pb-6 animate-pulse">
      {/* Title */}
      <div className="mb-4 sm:mb-6">
        <div className="h-7 sm:h-8 bg-[#1e2b3b] rounded w-40 mb-2" />
        <div className="h-4 bg-[#1e2b3b] rounded w-[460px] max-w-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 sm:gap-6">
        {/* Left sidebar */}
        <aside className="hidden lg:block rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 bg-[#1e2b3b] rounded w-28" />
            <div className="h-4 bg-[#1e2b3b] rounded w-10" />
          </div>
          <div className="mb-4">
            <div className="h-3 bg-[#1e2b3b] rounded w-14 mb-2" />
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-7 bg-[#1e2b3b] rounded w-16" />
              ))}
            </div>
          </div>
          <div className="mb-4">
            <div className="h-8 bg-[#1e2b3b] rounded w-full" />
          </div>
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, g) => (
              <div key={g}>
                <div className="h-3 bg-[#1e2b3b] rounded w-16 mb-2" />
                {Array.from({ length: 3 }).map((_, s) => (
                  <div key={s} className="flex items-center gap-2 mb-3">
                    <div className="h-3 bg-[#1e2b3b] rounded w-24" />
                    <div className="h-4 bg-[#1e2b3b] rounded flex-1" />
                    <div className="h-3 bg-[#1e2b3b] rounded w-5" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Right panel */}
        <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-[#3b4b3d]">
            <div className="h-5 bg-[#1e2b3b] rounded w-20" />
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-3 bg-[#1e2b3b] rounded w-20" />
              <div className="h-3 bg-[#1e2b3b] rounded w-8" />
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block">
            <div className="flex bg-[#0a1828]">
              {tableCols.map((_, i) => (
                <div
                  key={i}
                  className={`px-4 py-2.5 ${i === 0 ? "w-10" : i === 1 ? "flex-1" : i === 5 ? "w-20 text-right" : "w-14"}`}
                >
                  <div className="h-3 bg-[#1e2b3b] rounded" />
                </div>
              ))}
            </div>
            {Array.from({ length: 12 }).map((_, r) => (
              <div
                key={r}
                className="flex border-b border-[#3b4b3d]/40"
              >
                {tableCols.map((_, c) => (
                  <div
                    key={c}
                    className={`px-4 py-3 ${c === 0 ? "w-10" : c === 1 ? "flex-1" : c === 5 ? "w-20 text-right" : "w-14"}`}
                  >
                    <div className={`h-3 bg-[#1e2b3b]/60 rounded ${c === 5 ? "ml-auto w-10" : ""}`} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Mobile card list */}
          <div className="lg:hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 border-b border-[#3b4b3d]/40"
              >
                <div className="h-3 bg-[#1e2b3b] rounded w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 bg-[#1e2b3b] rounded w-28 mb-1" />
                  <div className="h-3 bg-[#1e2b3b] rounded w-20" />
                </div>
                <div className="h-5 bg-[#1e2b3b] rounded w-10 shrink-0" />
                <div className="h-4 bg-[#1e2b3b] rounded w-12 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile floating trigger */}
      <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2">
        <div className="h-10 bg-[#0f1c2c] rounded-full border border-[#3b4b3d] px-4 flex items-center gap-2">
          <div className="h-3 w-3 bg-[#1e2b3b] rounded" />
          <div className="h-3 bg-[#1e2b3b] rounded w-20" />
          <div className="h-3 bg-[#1e2b3b] rounded w-4" />
        </div>
      </div>
    </div>
  );
}

async function IndexBuilderLoader() {
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
  return <IndexBuilderClient players={data.players} />;
}

export default function IndexBuilderPage() {
  return (
    <Suspense fallback={<IndexBuilderSkeleton />}>
      <IndexBuilderLoader />
    </Suspense>
  );
}
