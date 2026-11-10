import { Suspense } from "react";
import type { Metadata } from "next";
import type { PlayerFixturePreview } from "@/lib/fpl-types";
import { PlayersTable } from "./players-table";
import { PLAYERS_PAGE_SIZE } from "./constants";
import { getFplData } from "@/lib/fpl-data";

export const metadata: Metadata = {
  title: "Players | FPL Auction Hub",
  description:
    "Browse, search, and compare FPL player stats. Sort by points, form, price, or any stat across the league.",
};

function PlayersTableSkeleton() {
  const rows = Array.from({ length: PLAYERS_PAGE_SIZE });
  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 pb-6 animate-pulse">
      {/* Page header */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-4 sm:pt-6 pb-3">
        <div className="h-7 bg-secondary rounded w-28" />
        <div className="h-3 bg-secondary rounded w-32" />
      </div>

      {/* Sticky glass filter bar — mirrors the loaded bar exactly (heights,
          scroll-edge fade, materials) so the swap never shifts the page */}
      <div
        data-frost="background"
        className="sticky top-14 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 mb-4 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65 after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-gradient-to-b after:from-background/70 after:to-transparent after:pointer-events-none md:after:hidden flex flex-wrap items-start sm:items-center gap-2 sm:gap-3"
      >
        <div className="h-10 bg-secondary rounded-full w-full sm:w-56" />
        <div className="-mx-1.5 flex gap-1 overflow-x-auto overflow-y-hidden w-[calc(100%_+_12px)] sm:w-auto px-1.5 py-1.5 scrollbar-none">
          {["All", "GKP", "DEF", "MID", "FWD"].map((p) => (
            <div key={p} className="h-8 bg-secondary rounded-full w-12 shrink-0" />
          ))}
          <div className="sm:hidden flex items-center gap-1 ml-auto">
            <div className="h-8 bg-secondary rounded w-[90px] shrink-0" />
            <div className="h-8 w-8 bg-secondary rounded shrink-0" />
          </div>
        </div>
        <div className="hidden sm:flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="h-8 bg-secondary rounded w-28" />
          <div className="flex items-center gap-1.5">
            <div className="h-8 bg-secondary rounded w-14" />
            <div className="h-8 bg-secondary rounded w-14" />
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3 ml-auto">
          <div className="h-4 bg-secondary rounded w-16" />
          <div className="h-8 bg-secondary rounded w-28" />
          <div className="h-8 bg-secondary rounded w-20" />
          <div className="h-8 bg-secondary rounded w-24" />
        </div>
      </div>

      {/* Mobile player count + toolbar */}
      <div className="sm:hidden flex items-center justify-between mb-2">
        <div className="h-4 bg-secondary rounded w-20" />
        <div className="h-8 bg-secondary rounded w-28" />
      </div>

      {/* Desktop table — same column count and row height as the loaded
          table so the page height (and scrollbar) never jumps on swap. The
          card's top hairline is drawn by the header row (as it is in the
          loaded table, where it must travel with the sticky header), so the
          border is suppressed here too. */}
      <div className="hidden md:block rounded-lg border border-border border-t-0 shadow-xs overflow-hidden">
        <div className="bg-card border-b border-border shadow-[inset_0_1px_0_0_var(--color-border)]">
          <div className="flex">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-[38px] flex-1 px-4 flex items-center">
                <div className="h-3 bg-secondary rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
        {rows.map((_, i) => (
          <div
            key={i}
            className={`h-[57px] flex border-b border-border/50 ${i % 2 === 0 ? "bg-background" : "bg-muted/50"}`}
          >
            {Array.from({ length: 9 }).map((_, j) => (
              <div key={j} className="flex-1 px-4 flex items-center">
                {j === 0 ? (
                  /* Mirrors the two-line player name + team cell */
                  <div className="flex w-full flex-col gap-1.5">
                    <div className="h-4 bg-secondary rounded w-24" />
                    <div className="h-3 bg-secondary/60 rounded w-16" />
                  </div>
                ) : (
                  <div className="h-3 bg-secondary/60 rounded w-3/4" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Mobile card list — full page-worth of cards, matching card height */}
      <div className="md:hidden space-y-2">
        {rows.map((_, i) => (
          <div
            key={i}
            className="bg-card rounded-2xl border border-border/50 px-3.5 pt-3 pb-3"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="h-4 bg-secondary rounded w-28" />
              <div className="flex items-center gap-2">
                <div className="size-2 bg-secondary rounded-full" />
                <div className="h-5 w-12 bg-secondary rounded-full" />
                <div className="h-5 w-5 bg-secondary rounded-full" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 4 }).map((_, j) => (
                <div
                  key={j}
                  className="bg-foreground/[0.025] rounded-xl py-2 px-1 text-center"
                >
                  <div className="h-4 bg-secondary rounded w-3/4 mx-auto" />
                  <div className="h-2.5 bg-secondary/60 rounded w-1/2 mx-auto mt-1" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="h-4 bg-secondary rounded w-36" />
        <div className="flex gap-2">
          <div className="h-8 bg-secondary rounded w-20" />
          <div className="h-8 bg-secondary rounded w-16" />
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

  // Guarantee next_fixtures is populated on players even when reading from older cached payloads
  const teamMap = new Map((data.teams ?? []).map((t) => [t.id, t]));
  const fixtures = data.fixtures ?? [];
  const currentGw = data.currentGameweek ?? 1;

  const teamNextFixturesMap = new Map<number, PlayerFixturePreview[]>();
  for (const team of data.teams ?? []) {
    const upcoming = fixtures
      .filter(
        (f) =>
          !f.finished &&
          f.event !== null &&
          f.event >= currentGw &&
          (f.team_h === team.id || f.team_a === team.id),
      )
      .sort((a, b) => (a.event ?? 0) - (b.event ?? 0))
      .slice(0, 5)
      .map((f) => {
        const is_home = f.team_h === team.id;
        const oppId = is_home ? f.team_a : f.team_h;
        const oppTeam = teamMap.get(oppId);
        return {
          event: f.event,
          opponent_short: oppTeam?.short_name ?? "UNK",
          is_home,
          difficulty: is_home ? f.team_h_difficulty : f.team_a_difficulty,
        };
      });
    teamNextFixturesMap.set(team.id, upcoming);
  }

  const players = data.players.map((p) => {
    if (p.next_fixtures && p.next_fixtures.length > 0) return p;
    return {
      ...p,
      next_fixtures: teamNextFixturesMap.get(p.team) ?? [],
    };
  });

  return <PlayersTable players={players} />;
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<PlayersTableSkeleton />}>
      <PlayersTableLoader />
    </Suspense>
  );
}
