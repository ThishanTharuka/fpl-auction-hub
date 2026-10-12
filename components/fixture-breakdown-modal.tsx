"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users,
  BarChart3,
  AlertCircle,
  ArrowRightLeft,
} from "lucide-react";
import type {
  FixtureBreakdownResult,
  PlayerBreakdown,
  TeamBreakdown,
} from "@/lib/tournament/fixture-breakdown";

interface FixtureBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixtureId: string | null;
  gw: number;
  homeTeamName?: string;
  awayTeamName?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  isScored?: boolean;
}

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-sky-500/15 text-sky-800 dark:text-sky-400 border-sky-500/30",
  DEF: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/30",
  MID: "bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30",
  FWD: "bg-rose-500/15 text-rose-800 dark:text-rose-400 border-rose-500/30",
};

export function FixtureBreakdownModal({
  open,
  onOpenChange,
  fixtureId,
  gw,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  isScored,
}: FixtureBreakdownModalProps) {
  const [activeTab, setActiveTab] = useState<"players" | "stats">("players");
  const [cache, setCache] = useState<{ id: string; result: FixtureBreakdownResult } | null>(null);
  const [errorCache, setErrorCache] = useState<{ id: string; message: string } | null>(null);

  const activeData = cache?.id === fixtureId ? cache.result : null;
  const activeError = errorCache?.id === fixtureId ? errorCache.message : null;
  const loading = open && Boolean(fixtureId) && !activeData && !activeError;

  useEffect(() => {
    if (!open || !fixtureId) {
      return;
    }

    let isMounted = true;

    fetch(`/api/tournaments/any/fixtures/${fixtureId}/breakdown`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error ?? "Failed to load breakdown.");
        }
        return res.json();
      })
      .then((resData: FixtureBreakdownResult) => {
        if (isMounted) {
          setCache({ id: fixtureId, result: resData });
        }
      })
      .catch((err: Error) => {
        if (isMounted) {
          setErrorCache({ id: fixtureId, message: err.message || "Failed to load breakdown." });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, fixtureId]);

  const renderPlayerRow = (p: PlayerBreakdown, isBench = false) => {
    const isCaptain = p.isCaptain;
    const isTripleCaptain = p.multiplier === 3;
    const isVice = p.isViceCaptain;

    // Display points: for bench, show their raw scored points; for playing 11, show with multiplier
    const displayPoints = isBench ? p.rawPoints : p.totalPoints;

    return (
      <div
        key={`${p.id}-${p.elementPosition}`}
        className={`flex items-center justify-between gap-2 py-1 px-2.5 rounded transition-colors text-xs ${
          isBench ? "hover:bg-muted/70 opacity-90" : "hover:bg-muted/60 bg-muted/30"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Position Pill */}
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${
              POSITION_COLORS[p.position] ?? "bg-zinc-800 text-zinc-300 border-zinc-700"
            }`}
          >
            {p.position}
          </span>

          {/* Player Name and Badges */}
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="font-semibold text-foreground text-xs truncate max-w-[130px] sm:max-w-[170px]">
              {p.webName}
            </span>

            {/* Captaincy Flags */}
            {!isBench && isTripleCaptain && (
              <span className="px-1 py-0.2 rounded text-[8px] font-extrabold bg-primary text-primary-foreground">
                TC
              </span>
            )}
            {!isBench && isCaptain && !isTripleCaptain && (
              <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-primary/20 text-primary border border-primary/40">
                C
              </span>
            )}
            {!isBench && isVice && (
              <span className="px-1 py-0.2 rounded text-[8px] font-medium bg-muted text-muted-foreground border border-border">
                VC
              </span>
            )}

            {/* Substituted In */}
            {p.subbedIn && (
              <span
                className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30"
                title="Substituted in for a non-playing starter"
              >
                <ArrowRightLeft className="h-2 w-2" />
                <span>Sub</span>
              </span>
            )}
          </div>
        </div>

        {/* Key Stats & Points */}
        <div className="flex items-center gap-2 shrink-0">
          {p.keyStats.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {p.keyStats.map((stat, i) => (
                <span
                  key={i}
                  className="px-1 py-0.2 rounded text-[9px] font-medium bg-muted text-muted-foreground border border-border"
                >
                  {stat}
                </span>
              ))}
            </div>
          )}

          <div className="text-right min-w-[36px]">
            {!isBench && p.multiplier > 1 ? (
              <span className="font-bold text-primary tabular-nums text-xs sm:text-sm">
                {p.totalPoints}
                <span className="text-[9px] text-muted-foreground ml-0.5 font-normal">
                  ({p.rawPoints}x{p.multiplier})
                </span>
              </span>
            ) : (
              <span
                className={`font-bold tabular-nums text-xs sm:text-sm ${
                  displayPoints > 0 ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {displayPoints}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTeamRoster = (team: TeamBreakdown | null, side: "Home" | "Away") => {
    if (!team) {
      return (
        <div className="p-6 text-center text-xs text-muted-foreground bg-muted/40 rounded-lg border border-border">
          Team data not available.
        </div>
      );
    }

    if (!team.managerId) {
      return (
        <div className="p-6 rounded-lg border border-border bg-muted/40 text-center space-y-1.5">
          <p className="text-sm font-bold text-foreground">{team.teamName}</p>
          <p className="text-xs text-muted-foreground">No FPL Manager ID linked for this team.</p>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-border bg-card p-3 space-y-2.5 shadow-xs">
        {/* Team Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
              {side}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-foreground truncate">{team.teamName}</h3>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {team.chip && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary border border-primary/30">
                {team.chip}
              </span>
            )}
            {team.transferCost > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                -{team.transferCost} Hit
              </span>
            )}
          </div>
        </div>

        {/* Starting 11 Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground px-1 pb-0.5">
            <span>Playing 11 ({team.statsSummary.formation})</span>
            <span>Pts</span>
          </div>
          <div className="space-y-0.5">{team.playing11.map((p) => renderPlayerRow(p, false))}</div>
        </div>

        {/* Bench Section: Readable 2-Column Grid */}
        {team.bench.length > 0 && (
          <div className="space-y-1.5 border-t border-border/50 pt-2">
            <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground px-1">
              <span>Bench ({team.benchPoints} pts)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {team.bench.map((p) => (
                <div
                  key={`${p.id}-${p.elementPosition}`}
                  className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded bg-muted/60 border border-border/40 text-xs hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${
                        POSITION_COLORS[p.position] ?? "bg-zinc-800 text-zinc-300 border-zinc-700"
                      }`}
                    >
                      {p.position}
                    </span>
                    <span
                      className="text-foreground font-medium text-xs truncate"
                      title={p.fullName || p.webName}
                    >
                      {p.webName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.keyStats.length > 0 && (
                      <span className="px-1 py-0.2 rounded text-[9px] font-medium bg-muted text-muted-foreground border border-border">
                        {p.keyStats[0]}
                      </span>
                    )}
                    <span className="text-xs font-bold text-muted-foreground tabular-nums min-w-[14px] text-right">
                      {p.rawPoints}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Total Footer */}
        <div className="border-t border-border pt-2 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground block">Match Total</span>
            {team.transferCost > 0 && (
              <span className="text-[10px] text-muted-foreground">
                Gross: {team.grossPoints} pts · Hits: -{team.transferCost}
              </span>
            )}
          </div>
          <span className="text-base font-bold text-primary tabular-nums">
            {team.netPoints} pts
          </span>
        </div>
      </div>
    );
  };

  const renderStatsComparison = (home: TeamBreakdown | null, away: TeamBreakdown | null) => {
    if (!home || !away) {
      return (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Stats comparison unavailable.
        </div>
      );
    }

    const hStats = home.statsSummary;
    const aStats = away.statsSummary;

    const statsList: Array<{
      label: string;
      homeVal: string | number;
      awayVal: string | number;
      highlightHigher?: boolean;
      highlightLower?: boolean;
    }> = [
      { label: "Formation", homeVal: hStats.formation, awayVal: aStats.formation },
      { label: "Total Match Points", homeVal: `${home.netPoints} pts`, awayVal: `${away.netPoints} pts`, highlightHigher: true },
      { label: "Captain", homeVal: `${hStats.captainName} (${hStats.captainPoints} pts)`, awayVal: `${aStats.captainName} (${aStats.captainPoints} pts)` },
      { label: "Goals Scored", homeVal: hStats.goals, awayVal: aStats.goals, highlightHigher: true },
      { label: "Assists", homeVal: hStats.assists, awayVal: aStats.assists, highlightHigher: true },
      { label: "Clean Sheets", homeVal: hStats.cleanSheets, awayVal: aStats.cleanSheets, highlightHigher: true },
      { label: "Goals Conceded (Def)", homeVal: hStats.goalsConceded ?? 0, awayVal: aStats.goalsConceded ?? 0, highlightLower: true },
      { label: "Goalkeeper Saves", homeVal: hStats.saves, awayVal: aStats.saves, highlightHigher: true },
      { label: "Bonus Points", homeVal: hStats.bonus, awayVal: aStats.bonus, highlightHigher: true },
      { label: "Yellow Cards", homeVal: hStats.yellowCards, awayVal: aStats.yellowCards },
      { label: "Red Cards", homeVal: hStats.redCards, awayVal: aStats.redCards },
      { label: "Own Goals", homeVal: hStats.ownGoals, awayVal: aStats.ownGoals },
      { label: "Penalties Saved", homeVal: hStats.penaltiesSaved, awayVal: aStats.penaltiesSaved, highlightHigher: true },
      { label: "Transfer Hits Deducted", homeVal: home.transferCost > 0 ? `-${home.transferCost} pts` : "0", awayVal: away.transferCost > 0 ? `-${away.transferCost} pts` : "0" },
      { label: "Bench Points", homeVal: `${home.benchPoints} pts`, awayVal: `${away.benchPoints} pts` },
      { label: "Active Chip", homeVal: home.chip ?? "None", awayVal: away.chip ?? "None" },
    ];

    return (
      <div className="rounded-lg border border-border bg-card p-3 sm:p-4 space-y-3 shadow-xs">
        {/* Teams Header Row */}
        <div className="grid grid-cols-3 items-center text-center pb-2.5 border-b border-border">
          <div className="text-left space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Home</span>
            <p className="text-xs sm:text-sm font-bold text-foreground truncate">{home.teamName}</p>
            <span className="text-base sm:text-lg font-extrabold text-primary">{home.netPoints}</span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">VS</span>
            <div className="text-[10px] text-muted-foreground">GW {gw}</div>
          </div>

          <div className="text-right space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Away</span>
            <p className="text-xs sm:text-sm font-bold text-foreground truncate">{away.teamName}</p>
            <span className="text-base sm:text-lg font-extrabold text-primary">{away.netPoints}</span>
          </div>
        </div>

        {/* Stats Table */}
        <div className="divide-y divide-border/40">
          {statsList.map((s, idx) => {
            const hNum = typeof s.homeVal === "number" ? s.homeVal : null;
            const aNum = typeof s.awayVal === "number" ? s.awayVal : null;
            const isHomeHigher = Boolean(s.highlightHigher && hNum !== null && aNum !== null && hNum > aNum);
            const isAwayHigher = Boolean(s.highlightHigher && hNum !== null && aNum !== null && aNum > hNum);
            const isHomeLower = Boolean(s.highlightLower && hNum !== null && aNum !== null && hNum < aNum);
            const isAwayLower = Boolean(s.highlightLower && hNum !== null && aNum !== null && aNum < hNum);
            const isHomeBest = isHomeHigher || isHomeLower;
            const isAwayBest = isAwayHigher || isAwayLower;

            return (
              <div
                key={idx}
                className="grid grid-cols-3 items-center py-1.5 px-2 hover:bg-muted/40 rounded transition-colors text-xs"
              >
                <div
                  className={`text-left font-semibold truncate ${
                    isHomeBest ? "text-primary font-bold" : "text-foreground"
                  }`}
                >
                  {s.homeVal}
                </div>

                <div className="text-center text-[11px] text-muted-foreground font-medium">
                  {s.label}
                </div>

                <div
                  className={`text-right font-semibold truncate ${
                    isAwayBest ? "text-primary font-bold" : "text-foreground"
                  }`}
                >
                  {s.awayVal}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSkeleton = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((sideIdx) => (
          <div
            key={sideIdx}
            className="rounded-lg border border-border bg-card p-3 space-y-2.5"
          >
            {/* Team Header Skeleton */}
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
              <div className="space-y-1">
                <div className="h-2.5 w-12 rounded bg-muted animate-pulse" />
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            </div>

            {/* Starting 11 Skeleton */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1 pb-0.5">
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3 w-6 rounded bg-muted animate-pulse" />
              </div>
              <div className="space-y-1">
                {Array.from({ length: 11 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 py-1 px-2.5 rounded bg-muted/40 border border-transparent"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-7 rounded bg-muted animate-pulse shrink-0" />
                      <div
                        className="h-3.5 rounded bg-muted animate-pulse"
                        style={{ width: `${65 + ((idx * 19) % 45)}px` }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {idx % 3 === 0 && (
                        <div className="h-3.5 w-8 rounded bg-muted animate-pulse" />
                      )}
                      <div className="h-3.5 w-5 rounded bg-muted animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bench Skeleton */}
            <div className="space-y-1.5 border-t border-border/50 pt-2">
              <div className="h-3 w-20 rounded bg-muted animate-pulse px-1" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded bg-muted/60 border border-border/40"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="h-3.5 w-6 rounded bg-muted animate-pulse shrink-0" />
                      <div
                        className="h-3 rounded bg-muted animate-pulse"
                        style={{ width: `${55 + ((idx * 13) % 35)}px` }}
                      />
                    </div>
                    <div className="h-3 w-4 rounded bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Total Footer Skeleton */}
            <div className="border-t border-border pt-2 flex items-center justify-between">
              <div className="h-3.5 w-20 rounded bg-muted animate-pulse" />
              <div className="h-5 w-16 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto bg-card border border-border text-foreground p-3 sm:p-4">
        <DialogHeader className="border-b border-border pb-2.5 space-y-2">
          <div className="flex items-center justify-between gap-3 pr-8">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                {homeTeamName ?? "Home"} vs {awayTeamName ?? "Away"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Gameweek {gw} Match Breakdown · Official FPL Data
              </DialogDescription>
            </div>

            {isScored && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-muted border border-border shrink-0">
                <span className="text-sm sm:text-base font-extrabold text-primary tabular-nums">
                  {homeScore ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">-</span>
                <span className="text-sm sm:text-base font-extrabold text-primary tabular-nums">
                  {awayScore ?? 0}
                </span>
              </div>
            )}
          </div>

          {/* Modal Tabs Switcher */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("players")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                activeTab === "players"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-muted text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Player Breakdown</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("stats")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                activeTab === "stats"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-muted text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Stats Comparison</span>
            </button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="pt-3">
          {loading ? (
            renderSkeleton()
          ) : activeError || !activeData ? (
            <div className="flex items-center gap-3 rounded-lg bg-muted p-4 text-xs text-amber-600 dark:text-amber-400 border border-amber-500/30 my-6">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{activeError ?? "Match breakdown is not available for this gameweek."}</span>
            </div>
          ) : activeTab === "players" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderTeamRoster(activeData.homeTeam, "Home")}
              {renderTeamRoster(activeData.awayTeam, "Away")}
            </div>
          ) : (
            renderStatsComparison(activeData.homeTeam, activeData.awayTeam)
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
