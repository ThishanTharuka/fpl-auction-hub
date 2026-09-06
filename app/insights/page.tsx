import { Suspense } from "react";
import type { Metadata } from "next";
import { getFplData } from "@/lib/fpl-data";
import { InsightsClient } from "./insights-client";

export const metadata: Metadata = {
  title: "Insights | FPL Auction Hub",
  description:
    "FPL insights hub featuring live price changes, transfer momentum, xG/xA underlying stats, differential finder, and fixture ticker.",
};

function InsightsSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 animate-pulse">
      {/* Title */}
      <div className="mb-6">
        <div className="h-8 bg-[#1e2b3b] rounded w-48 mb-2" />
        <div className="h-4 bg-[#1e2b3b] rounded w-96 max-w-full" />
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] p-4"
          >
            <div className="h-3 bg-[#1e2b3b] rounded w-20 mb-3" />
            <div className="h-6 bg-[#1e2b3b] rounded w-28" />
          </div>
        ))}
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-9 bg-[#1e2b3b] rounded-lg w-28 shrink-0"
          />
        ))}
      </div>

      {/* Main card skeleton */}
      <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] p-6">
        <div className="space-y-4">
          <div className="h-10 bg-[#1e2b3b] rounded w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-[#1e2b3b]/60 rounded w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function InsightsDataLoader() {
  const data = await getFplData().catch(() => null);

  if (!data) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-12 text-center">
        <p className="text-rose-400 text-sm">
          Failed to load FPL insights data. Please try again.
        </p>
      </div>
    );
  }

  return (
    <InsightsClient
      players={data.players}
      teams={data.teams}
      events={data.events}
      fixtures={data.fixtures}
      currentGameweek={data.currentGameweek}
      liveGameweek={data.liveGameweek}
    />
  );
}

export default function InsightsPage() {
  return (
    <Suspense fallback={<InsightsSkeleton />}>
      <InsightsDataLoader />
    </Suspense>
  );
}
