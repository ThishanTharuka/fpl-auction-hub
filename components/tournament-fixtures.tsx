"use client";

import { useState, useMemo, useCallback } from "react";
import { TeamAvatar } from "@/components/team-avatar";
import { ChevronDown, ChevronUp, Layers, Users } from "lucide-react";
import { FixtureBreakdownModal } from "@/components/fixture-breakdown-modal";
import type { CompetitionFixtureRow, CompetitionTeamRow } from "@/lib/tournament/types";

interface TournamentFixturesProps {
  fixtures: CompetitionFixtureRow[];
  teams: CompetitionTeamRow[];
  liveGameweek?: number | null;
  currentGameweek?: number | null;
  onSelectGw?: (gw: number) => void;
  activeAdminGw?: number;
}

export function TournamentFixtures({
  fixtures,
  teams,
  liveGameweek = null,
  currentGameweek = null,
  onSelectGw,
  activeAdminGw,
}: TournamentFixturesProps) {
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const availableGws = useMemo(() => {
    return [...new Set(fixtures.map((f) => f.gw as number))].sort((a, b) => a - b);
  }, [fixtures]);

  const defaultGw = useMemo(() => {
    const target = liveGameweek ?? currentGameweek ?? activeAdminGw;
    if (typeof target === "number" && availableGws.length > 0) {
      if (availableGws.includes(target)) {
        return target;
      }
      if (target < availableGws[0]!) {
        return availableGws[0]!;
      }
      return availableGws[availableGws.length - 1]!;
    }
    return availableGws[0] ?? "all";
  }, [liveGameweek, currentGameweek, activeAdminGw, availableGws]);

  const [groupFilter, setGroupFilter] = useState<"all" | "A" | "B">("all");
  const [userSelectedGwFilter, setUserSelectedGwFilter] = useState<number | "all" | null>(null);
  const selectedGwFilter = userSelectedGwFilter ?? defaultGw;
  const [selectedModalFixture, setSelectedModalFixture] = useState<CompetitionFixtureRow | null>(null);

  const fixtureGroupLabel = useCallback(
    (f: CompetitionFixtureRow) => {
      if (f.stage === "group") {
        const hGroup = f.home_team_id ? teamById.get(f.home_team_id)?.group_label : null;
        const aGroup = f.away_team_id ? teamById.get(f.away_team_id)?.group_label : null;
        if (hGroup && aGroup) {
          return hGroup === aGroup ? `Group ${hGroup}` : "Group A vs B";
        }
        if (hGroup) return `Group ${hGroup}`;
        if (aGroup) return `Group ${aGroup}`;
        return "Group";
      }
      if (f.phase) {
        return f.leg && f.leg > 1 ? `${f.phase} · Leg ${f.leg}` : f.phase;
      }
      return "Knockout";
    },
    [teamById],
  );

  // Initial expanded state: expand live GW or the latest played GW, collapse older ones if > 3 GWs
  const [expandedGws, setExpandedGws] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    if (availableGws.length <= 4) {
      availableGws.forEach((g) => {
        initial[g] = true;
      });
    } else {
      const activeGw = liveGameweek ?? availableGws[availableGws.length - 1] ?? 1;
      availableGws.forEach((g) => {
        // Expand the live/active gameweek and adjacent gameweeks by default
        initial[g] = Math.abs(g - activeGw) <= 1;
      });
    }
    return initial;
  });

  const toggleGw = (gw: number) => {
    setExpandedGws((prev) => ({ ...prev, [gw]: !prev[gw] }));
    if (onSelectGw) onSelectGw(gw);
  };

  const expandAll = () => {
    const all: Record<number, boolean> = {};
    availableGws.forEach((g) => {
      all[g] = true;
    });
    setExpandedGws(all);
  };

  const collapseAll = () => {
    setExpandedGws({});
  };

  const hasGroups = useMemo(() => {
    return teams.some((t) => t.group_label === "A") && teams.some((t) => t.group_label === "B");
  }, [teams]);

  // Group fixtures by Gameweek
  const fixturesByGw = useMemo(() => {
    const map = new Map<number, CompetitionFixtureRow[]>();
    for (const f of fixtures) {
      const gw = f.gw as number;
      if (!map.has(gw)) map.set(gw, []);
      map.get(gw)!.push(f);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [fixtures]);

  // Filtered gameweeks
  const displayedGws = useMemo(() => {
    if (selectedGwFilter === "all") return fixturesByGw;
    return fixturesByGw.filter(([gw]) => gw === selectedGwFilter);
  }, [fixturesByGw, selectedGwFilter]);

  return (
    <div className="space-y-4">
      {/* Control bar: Gameweek Quick Switcher & Group Filters */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Group Filter Tabs (if tournament has Group A & B) */}
          {hasGroups ? (
            <div className="flex items-center rounded-md border border-border bg-muted p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setGroupFilter("all")}
                className={`rounded px-2.5 py-1 transition-colors ${
                  groupFilter === "all"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Groups
              </button>
              <button
                type="button"
                onClick={() => setGroupFilter("A")}
                className={`rounded px-2.5 py-1 transition-colors ${
                  groupFilter === "A"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Group A
              </button>
              <button
                type="button"
                onClick={() => setGroupFilter("B")}
                className={`rounded px-2.5 py-1 transition-colors ${
                  groupFilter === "B"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Group B
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Matchday Schedule</span>
            </div>
          )}

          {/* Expand/Collapse All when browsing all GWs */}
          {selectedGwFilter === "all" && availableGws.length > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={expandAll}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Expand all
              </button>
              <span className="text-border">|</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Collapse all
              </button>
            </div>
          )}
        </div>

        {/* Horizontal Quick Gameweek Pill Switcher */}
        {availableGws.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setUserSelectedGwFilter("all")}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                selectedGwFilter === "all"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              All GWs
            </button>
            {availableGws.map((gw) => {
              const isLive = gw === liveGameweek;
              const isSelected = selectedGwFilter === gw;
              return (
                <button
                  key={gw}
                  type="button"
                  onClick={() => {
                    setUserSelectedGwFilter(gw);
                    if (onSelectGw) onSelectGw(gw);
                  }}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : isLive
                      ? "bg-primary/15 text-primary border border-primary/40 hover:bg-primary/25"
                      : "bg-muted text-muted-foreground hover:text-foreground border border-border"
                  }`}
                >
                  <span>GW {gw}</span>
                  {isLive && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isSelected
                          ? "bg-primary-foreground"
                          : "bg-primary animate-pulse-slow shadow-[0_0_6px_rgba(0,228,120,0.8)]"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Gameweek Cards Stack */}
      <div className="space-y-4">
        {displayedGws.map(([gw, rawRows]) => {
          const isLiveGw = gw === liveGameweek;
          const isExpanded = selectedGwFilter !== "all" || Boolean(expandedGws[gw]);

          // Filter rows by group if requested
          const rows = rawRows.filter((f) => {
            if (groupFilter === "all") return true;
            if (f.stage !== "group") return true;
            const hTeam = f.home_team_id ? teamById.get(f.home_team_id) : null;
            const aTeam = f.away_team_id ? teamById.get(f.away_team_id) : null;
            return hTeam?.group_label === groupFilter || aTeam?.group_label === groupFilter;
          });

          const scoredCount = rawRows.filter((f) => f.status === "scored").length;
          const totalCount = rawRows.length;
          const isComplete = totalCount > 0 && scoredCount === totalCount;
          const isAdminSelected = activeAdminGw === gw;

          return (
            <div
              key={gw}
              className={`rounded-lg border transition-all duration-200 overflow-hidden ${
                isLiveGw
                  ? "border-primary/40 bg-card shadow-[0_0_20px_rgba(0,122,67,0.08)] dark:shadow-[0_0_20px_rgba(0,228,120,0.05)]"
                  : isAdminSelected
                  ? "border-primary/30 bg-card"
                  : "border-border bg-card"
              }`}
            >
              {/* Gameweek Accordion Header */}
              <button
                type="button"
                onClick={() => toggleGw(gw)}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm sm:text-base font-bold text-foreground">
                    Gameweek {gw}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                    {isLiveGw ? "In Progress" : isComplete ? "Finished" : `${scoredCount}/${totalCount} Scored`}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isLiveGw && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-primary/15 text-primary border border-primary/30 shadow-[0_0_10px_rgba(0,228,120,0.15)]">
                      <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary animate-pulse-slow shadow-[0_0_8px_rgba(0,228,120,0.8)]" />
                      Live
                    </span>
                  )}
                  {selectedGwFilter === "all" && (
                    <span className="text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  )}
                </div>
              </button>

              {/* Fixtures Body Grid */}
              {isExpanded && (
                <div className="p-3 sm:p-4 pt-2 border-t border-border/40">
                  {rows.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      No fixtures matching this filter in Gameweek {gw}.
                    </p>
                  ) : (() => {
                    const groupAFixtures = rows.filter((f) => {
                      if (f.stage !== "group") return false;
                      const hGroup = f.home_team_id ? teamById.get(f.home_team_id)?.group_label : null;
                      const aGroup = f.away_team_id ? teamById.get(f.away_team_id)?.group_label : null;
                      return hGroup === "A" && aGroup === "A";
                    });

                    const groupBFixtures = rows.filter((f) => {
                      if (f.stage !== "group") return false;
                      const hGroup = f.home_team_id ? teamById.get(f.home_team_id)?.group_label : null;
                      const aGroup = f.away_team_id ? teamById.get(f.away_team_id)?.group_label : null;
                      return hGroup === "B" && aGroup === "B";
                    });

                    const otherFixtures = rows.filter((f) => {
                      return !groupAFixtures.includes(f) && !groupBFixtures.includes(f);
                    });

                    const isTwoGroupSplit =
                      groupFilter === "all" &&
                      groupAFixtures.length > 0 &&
                      groupBFixtures.length > 0;

                    const renderCard = (f: CompetitionFixtureRow) => {
                      const hTeam = f.home_team_id ? teamById.get(f.home_team_id) : null;
                      const aTeam = f.away_team_id ? teamById.get(f.away_team_id) : null;
                      const homeName = hTeam?.name ?? "TBD";
                      const awayName = aTeam?.name ?? "TBD";
                      const isScored = f.status === "scored";

                      const hPts = f.home_points ?? 0;
                      const aPts = f.away_points ?? 0;
                      const isHomeWinner = isScored && hPts > aPts;
                      const isAwayWinner = isScored && aPts > hPts;
                      const isDraw = isScored && hPts === aPts;
                      const isFutureGw =
                        typeof (liveGameweek ?? currentGameweek) === "number" &&
                        (f.gw as number) > (liveGameweek ?? currentGameweek)!;

                      return (
                        <div
                          key={f.id}
                          className={`rounded-lg border transition-all duration-150 p-3 space-y-2.5 shadow-xs ${
                            isLiveGw
                              ? "border-primary/40 bg-card hover:border-primary/60 hover:bg-muted/20"
                              : "border-border bg-card hover:border-primary/30 hover:bg-muted/15"
                          }`}
                        >
                          {/* Card Top Pill: Group/Phase and Match Status */}
                          <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                            <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-muted text-muted-foreground border border-border">
                              {fixtureGroupLabel(f)}
                            </span>
                            {isLiveGw ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold bg-primary/15 text-primary border border-primary/30">
                                <span className="h-1 w-1 rounded-full bg-primary animate-pulse-slow shadow-[0_0_6px_rgba(0,228,120,0.8)]" />
                                Live
                              </span>
                            ) : isScored ? (
                              <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                                Final
                              </span>
                            ) : (
                              <span className="text-muted-foreground uppercase tracking-wider">
                                Scheduled
                              </span>
                            )}
                          </div>

                          {/* Matchup Rows */}
                          <div className="space-y-1.5">
                            {/* Home Team */}
                            <div className="flex items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <TeamAvatar
                                  name={homeName}
                                  src={hTeam?.avatar_url ?? null}
                                  color={hTeam?.color ?? null}
                                  size="sm"
                                />
                                <span
                                  className={`text-xs sm:text-sm truncate ${
                                    isScored && isHomeWinner
                                      ? "font-semibold text-foreground"
                                      : isScored && isAwayWinner
                                      ? "text-muted-foreground"
                                      : "text-foreground"
                                  }`}
                                  title={homeName}
                                >
                                  {homeName}
                                </span>
                              </div>
                              {isScored ? (
                                <span
                                  className={`text-xs sm:text-sm font-bold tabular-nums shrink-0 px-2 py-0.5 rounded ${
                                    isHomeWinner
                                      ? "text-primary bg-primary/10"
                                      : isDraw
                                      ? "text-foreground bg-muted"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {f.home_points}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground tabular-nums shrink-0 px-1">
                                  -
                                </span>
                              )}
                            </div>

                            {/* Subtle Hairline Divider */}
                            <div className="h-px bg-border/40" />

                            {/* Away Team */}
                            <div className="flex items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <TeamAvatar
                                  name={awayName}
                                  src={aTeam?.avatar_url ?? null}
                                  color={aTeam?.color ?? null}
                                  size="sm"
                                />
                                <span
                                  className={`text-xs sm:text-sm truncate ${
                                    isScored && isAwayWinner
                                      ? "font-semibold text-foreground"
                                      : isScored && isHomeWinner
                                      ? "text-muted-foreground"
                                      : "text-foreground"
                                  }`}
                                  title={awayName}
                                >
                                  {awayName}
                                </span>
                              </div>
                              {isScored ? (
                                <span
                                  className={`text-xs sm:text-sm font-bold tabular-nums shrink-0 px-2 py-0.5 rounded ${
                                    isAwayWinner
                                      ? "text-primary bg-primary/10"
                                      : isDraw
                                      ? "text-foreground bg-muted"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {f.away_points}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground tabular-nums shrink-0 px-1">
                                  -
                                </span>
                              )}
                            </div>

                            {/* Fixture Card Footer: Subtle Breakdown Trigger */}
                            <div className="pt-2 flex items-center justify-between border-t border-border/40 text-[11px]">
                              {isFutureGw && !isScored ? (
                                <span className="text-[10px] text-muted-foreground/70 italic">
                                  Lineups revealed at deadline
                                </span>
                              ) : (
                                <>
                                  <span className="text-[10px] text-muted-foreground/70">
                                    {isScored ? "Final match points" : "Live match details"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedModalFixture(f)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-foreground bg-muted border border-border hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all duration-150 active:scale-[0.98] shadow-xs cursor-pointer"
                                  >
                                    <Users className="h-3 w-3 text-primary" />
                                    <span>Breakdown</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    };

                    if (isTwoGroupSplit) {
                      return (
                        <div className="space-y-4 pt-1">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Left Side: Group A */}
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between px-1 pb-1.5 border-b border-border/60">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                    Group A
                                  </span>
                                </div>
                                <span className="text-[11px] text-muted-foreground font-medium">
                                  {groupAFixtures.filter((f) => f.status === "scored").length}/{groupAFixtures.length} Scored
                                </span>
                              </div>
                              <div className="space-y-2.5">
                                {groupAFixtures.map(renderCard)}
                              </div>
                            </div>

                            {/* Right Side: Group B */}
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between px-1 pb-1.5 border-b border-border/60">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                    Group B
                                  </span>
                                </div>
                                <span className="text-[11px] text-muted-foreground font-medium">
                                  {groupBFixtures.filter((f) => f.status === "scored").length}/{groupBFixtures.length} Scored
                                </span>
                              </div>
                              <div className="space-y-2.5">
                                {groupBFixtures.map(renderCard)}
                              </div>
                            </div>
                          </div>

                          {/* Additional / Knockout fixtures if any */}
                          {otherFixtures.length > 0 && (
                            <div className="space-y-2.5 pt-2 border-t border-border/40">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {otherFixtures.map(renderCard)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {rows.map(renderCard)}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}

        {displayedGws.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No fixtures found.
          </div>
        )}
      </div>

      {/* Match Breakdown Modal with Player Breakdown and Stats Comparison */}
      <FixtureBreakdownModal
        open={Boolean(selectedModalFixture)}
        onOpenChange={(open) => {
          if (!open) setSelectedModalFixture(null);
        }}
        fixtureId={selectedModalFixture?.id ?? null}
        gw={(selectedModalFixture?.gw as number) ?? 1}
        homeTeamName={
          selectedModalFixture?.home_team_id
            ? teamById.get(selectedModalFixture.home_team_id)?.name
            : "Home"
        }
        awayTeamName={
          selectedModalFixture?.away_team_id
            ? teamById.get(selectedModalFixture.away_team_id)?.name
            : "Away"
        }
        homeScore={selectedModalFixture?.home_points}
        awayScore={selectedModalFixture?.away_points}
        isScored={selectedModalFixture?.status === "scored"}
      />
    </div>
  );
}
