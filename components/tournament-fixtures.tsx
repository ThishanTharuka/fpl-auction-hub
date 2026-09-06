"use client";

import { useState, useMemo, useCallback } from "react";
import { TeamAvatar } from "@/components/team-avatar";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import type { CompetitionFixtureRow, CompetitionTeamRow } from "@/lib/tournament/types";

interface TournamentFixturesProps {
  fixtures: CompetitionFixtureRow[];
  teams: CompetitionTeamRow[];
  liveGameweek?: number | null;
  onSelectGw?: (gw: number) => void;
  activeAdminGw?: number;
}

export function TournamentFixtures({
  fixtures,
  teams,
  liveGameweek = null,
  onSelectGw,
  activeAdminGw,
}: TournamentFixturesProps) {
  const [groupFilter, setGroupFilter] = useState<"all" | "A" | "B">("all");
  const [selectedGwFilter, setSelectedGwFilter] = useState<number | "all">("all");

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

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

  const availableGws = useMemo(() => {
    return [...new Set(fixtures.map((f) => f.gw as number))].sort((a, b) => a - b);
  }, [fixtures]);

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
      <div className="flex flex-col gap-3 rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Group Filter Tabs (if tournament has Group A & B) */}
          {hasGroups ? (
            <div className="flex items-center rounded-md border border-[#3b4b3d] bg-[#132030] p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setGroupFilter("all")}
                className={`rounded px-2.5 py-1 transition-colors ${
                  groupFilter === "all"
                    ? "bg-[#00e478] text-[#003919] font-semibold"
                    : "text-[#849585] hover:text-[#d6e4f9]"
                }`}
              >
                All Groups
              </button>
              <button
                type="button"
                onClick={() => setGroupFilter("A")}
                className={`rounded px-2.5 py-1 transition-colors ${
                  groupFilter === "A"
                    ? "bg-[#00e478] text-[#003919] font-semibold"
                    : "text-[#849585] hover:text-[#d6e4f9]"
                }`}
              >
                Group A
              </button>
              <button
                type="button"
                onClick={() => setGroupFilter("B")}
                className={`rounded px-2.5 py-1 transition-colors ${
                  groupFilter === "B"
                    ? "bg-[#00e478] text-[#003919] font-semibold"
                    : "text-[#849585] hover:text-[#d6e4f9]"
                }`}
              >
                Group B
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[#849585]">
              <Layers className="h-3.5 w-3.5 text-[#00e478]" />
              <span>Matchday Schedule</span>
            </div>
          )}

          {/* Expand/Collapse All when browsing all GWs */}
          {selectedGwFilter === "all" && availableGws.length > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={expandAll}
                className="text-[#849585] hover:text-[#00e478] transition-colors"
              >
                Expand all
              </button>
              <span className="text-[#3b4b3d]">|</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-[#849585] hover:text-[#00e478] transition-colors"
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
              onClick={() => setSelectedGwFilter("all")}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                selectedGwFilter === "all"
                  ? "bg-[#00e478] text-[#003919] font-semibold shadow-[0_0_10px_rgba(0,228,120,0.2)]"
                  : "bg-[#132030] text-[#849585] hover:text-[#d6e4f9] border border-[#3b4b3d]"
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
                    setSelectedGwFilter(gw);
                    if (onSelectGw) onSelectGw(gw);
                  }}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-[#00e478] text-[#003919] font-semibold shadow-[0_0_10px_rgba(0,228,120,0.2)]"
                      : isLive
                      ? "bg-[#00e478]/15 text-[#00e478] border border-[#00e478]/40 hover:bg-[#00e478]/25"
                      : "bg-[#132030] text-[#849585] hover:text-[#d6e4f9] border border-[#3b4b3d]"
                  }`}
                >
                  <span>GW {gw}</span>
                  {isLive && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isSelected
                          ? "bg-[#003919]"
                          : "bg-[#00e478] animate-pulse-slow shadow-[0_0_6px_rgba(0,228,120,0.8)]"
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
                  ? "border-[#00e478]/40 bg-[#0f1c2c] shadow-[0_0_20px_rgba(0,228,120,0.05)]"
                  : isAdminSelected
                  ? "border-[#00e478]/30 bg-[#0f1c2c]"
                  : "border-[#3b4b3d] bg-[#0f1c2c]"
              }`}
            >
              {/* Gameweek Accordion Header */}
              <button
                type="button"
                onClick={() => toggleGw(gw)}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition-colors hover:bg-[#132030]/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm sm:text-base font-bold text-[#d6e4f9]">
                    Gameweek {gw}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#132030] text-[#849585] border border-[#3b4b3d]">
                    {isLiveGw ? "In Progress" : isComplete ? "Finished" : `${scoredCount}/${totalCount} Scored`}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isLiveGw && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-[#00e478]/15 text-[#00e478] border border-[#00e478]/30 shadow-[0_0_10px_rgba(0,228,120,0.15)]">
                      <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#00e478] animate-pulse-slow shadow-[0_0_8px_rgba(0,228,120,0.8)]" />
                      Live
                    </span>
                  )}
                  {selectedGwFilter === "all" && (
                    <span className="text-[#849585]">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  )}
                </div>
              </button>

              {/* Fixtures Body Grid */}
              {isExpanded && (
                <div className="p-3 sm:p-4 pt-2 border-t border-[#3b4b3d]/40">
                  {rows.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[#849585]">
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

                      return (
                        <div
                          key={f.id}
                          className={`rounded-lg border transition-all duration-150 p-3 space-y-2.5 ${
                            isLiveGw
                              ? "border-[#3b4b3d] bg-[#132030]/90 hover:border-[#00e478]/40 hover:bg-[#132030]"
                              : "border-[#3b4b3d]/80 bg-[#132030]/60 hover:border-[#3b4b3d] hover:bg-[#132030]"
                          }`}
                        >
                          {/* Card Top Pill: Group/Phase and Match Status */}
                          <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                            <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-[#1e2b3b] text-[#b9cbb9] border border-[#3b4b3d]/60">
                              {fixtureGroupLabel(f)}
                            </span>
                            {isLiveGw ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold bg-[#00e478]/15 text-[#00e478] border border-[#00e478]/30">
                                <span className="h-1 w-1 rounded-full bg-[#00e478] animate-pulse-slow shadow-[0_0_6px_rgba(0,228,120,0.8)]" />
                                Live
                              </span>
                            ) : isScored ? (
                              <span className="font-semibold text-[#849585] uppercase tracking-wider">
                                Final
                              </span>
                            ) : (
                              <span className="text-[#849585] uppercase tracking-wider">
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
                                      ? "font-semibold text-[#d6e4f9]"
                                      : isScored && isAwayWinner
                                      ? "text-[#849585]"
                                      : "text-[#d6e4f9]"
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
                                      ? "text-[#00e478] bg-[#00e478]/10"
                                      : isDraw
                                      ? "text-[#d6e4f9] bg-[#1e2b3b]"
                                      : "text-[#849585]"
                                  }`}
                                >
                                  {f.home_points}
                                </span>
                              ) : (
                                <span className="text-xs text-[#849585] tabular-nums shrink-0 px-1">
                                  -
                                </span>
                              )}
                            </div>

                            {/* Subtle Hairline Divider */}
                            <div className="h-px bg-[#3b4b3d]/30" />

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
                                      ? "font-semibold text-[#d6e4f9]"
                                      : isScored && isHomeWinner
                                      ? "text-[#849585]"
                                      : "text-[#d6e4f9]"
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
                                      ? "text-[#00e478] bg-[#00e478]/10"
                                      : isDraw
                                      ? "text-[#d6e4f9] bg-[#1e2b3b]"
                                      : "text-[#849585]"
                                  }`}
                                >
                                  {f.away_points}
                                </span>
                              ) : (
                                <span className="text-xs text-[#849585] tabular-nums shrink-0 px-1">
                                  -
                                </span>
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
                              <div className="flex items-center justify-between px-1 pb-1.5 border-b border-[#3b4b3d]/60">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-2 w-2 rounded-full bg-[#00e478]" />
                                  <span className="text-xs font-bold text-[#d6e4f9] uppercase tracking-wider">
                                    Group A
                                  </span>
                                </div>
                                <span className="text-[11px] text-[#849585] font-medium">
                                  {groupAFixtures.filter((f) => f.status === "scored").length}/{groupAFixtures.length} Scored
                                </span>
                              </div>
                              <div className="space-y-2.5">
                                {groupAFixtures.map(renderCard)}
                              </div>
                            </div>

                            {/* Right Side: Group B */}
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between px-1 pb-1.5 border-b border-[#3b4b3d]/60">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-2 w-2 rounded-full bg-[#00e478]" />
                                  <span className="text-xs font-bold text-[#d6e4f9] uppercase tracking-wider">
                                    Group B
                                  </span>
                                </div>
                                <span className="text-[11px] text-[#849585] font-medium">
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
                            <div className="space-y-2.5 pt-2 border-t border-[#3b4b3d]/40">
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
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-8 text-center text-sm text-[#849585]">
            No fixtures found.
          </div>
        )}
      </div>
    </div>
  );
}
