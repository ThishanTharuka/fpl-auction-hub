"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { AlertTriangle, ShieldAlert, HeartPulse, Search, X } from "lucide-react";
import type { StatusWatchItem } from "@/lib/insights-utils";

function getPositionBadgeClass(pos: string): string {
  switch (pos) {
    case "GKP":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "DEF":
      return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "MID":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "FWD":
      return "bg-rose-500/15 text-rose-400 border-rose-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

interface StatusWatchTabProps {
  flaggedPlayers: StatusWatchItem[];
  yellowCardAlerts: StatusWatchItem[];
}

type StatusViewFilter = "allFlagged" | "injured" | "doubtful" | "suspended" | "yellowCards";

export function StatusWatchTab({
  flaggedPlayers,
  yellowCardAlerts,
}: StatusWatchTabProps) {
  const [filter, setFilter] = useState<StatusViewFilter>("allFlagged");
  const [search, setSearch] = useState("");

  const filteredList: StatusWatchItem[] = useMemo(() => {
    let list: StatusWatchItem[] = [];
    if (filter === "yellowCards") {
      list = yellowCardAlerts;
    } else if (filter === "injured") {
      list = flaggedPlayers.filter((p) => p.status === "i");
    } else if (filter === "doubtful") {
      list = flaggedPlayers.filter((p) => p.status === "d");
    } else if (filter === "suspended") {
      list = flaggedPlayers.filter((p) => p.status === "s");
    } else {
      list = flaggedPlayers;
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (item) =>
        item.player.web_name.toLowerCase().includes(q) ||
        item.player.full_name.toLowerCase().includes(q) ||
        item.player.team_name.toLowerCase().includes(q),
    );
  }, [filter, flaggedPlayers, yellowCardAlerts, search]);

  const getChanceBadge = (chance: number | null) => {
    if (chance === null) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-muted text-muted-foreground">
          Unknown
        </span>
      );
    }
    if (chance === 0) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          0% Ruled Out
        </span>
      );
    }
    if (chance === 25) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
          25% Major Doubt
        </span>
      );
    }
    if (chance === 50) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
          50% Touch & Go
        </span>
      );
    }
    if (chance === 75) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-primary border border-emerald-500/30">
          75% Likely Available
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-primary">
        {chance}%
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top filter cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilter("allFlagged")}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            filter === "allFlagged"
              ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
              : "border-border bg-card hover:bg-muted"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              All Flagged
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-400">
            {flaggedPlayers.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Injuries, doubts, suspensions</p>
        </button>

        <button
          onClick={() => setFilter("injured")}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            filter === "injured"
              ? "border-rose-500 bg-rose-500/10 ring-1 ring-rose-500"
              : "border-border bg-card hover:bg-muted"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Injured
            </span>
            <HeartPulse className="w-4 h-4 text-rose-700 dark:text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-400">
            {flaggedPlayers.filter((p) => p.status === "i").length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Ruled out with injuries</p>
        </button>

        <button
          onClick={() => setFilter("doubtful")}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            filter === "doubtful"
              ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
              : "border-border bg-card hover:bg-muted"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Doubtful
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-400">
            {flaggedPlayers.filter((p) => p.status === "d").length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">25% - 75% playing chance</p>
        </button>

        <button
          onClick={() => setFilter("yellowCards")}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            filter === "yellowCards"
              ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
              : "border-border bg-card hover:bg-muted"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Yellow Card Alert
            </span>
            <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-yellow-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700 dark:text-yellow-400">
            {yellowCardAlerts.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">1 card away from 1-match ban</p>
        </button>
      </div>

      {/* Search and count */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search flagged players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-muted border border-border rounded-lg text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs text-muted-foreground self-center sm:self-auto">
          Showing <span className="font-mono font-semibold text-foreground">{filteredList.length}</span> player{filteredList.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Flagged Cards Grid */}
      {filteredList.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
          <p className="text-sm">No players matching the selected status filter.</p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary-foreground bg-primary hover:bg-primary transition-colors"
            >
              Clear search query
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredList.map(({ player, news, chanceThisRound, chanceNextRound, yellowCards, isYellowCardRisk }) => (
            <div
              key={player.id}
              className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between hover:border-primary/40 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-muted border border-border shrink-0">
                      {player.image_url ? (
                        <Image
                          src={player.image_url}
                          alt={player.web_name}
                          fill
                          sizes="40px"
                          className="object-cover object-top"
                        />
                      ) : null}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground">
                        {player.web_name}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <span>{player.team_name}</span>
                        <span>·</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getPositionBadgeClass(player.position)}`}>
                          {player.position}
                        </span>
                        <span>·</span>
                        <span className="font-mono">£{player.price.toFixed(1)}m</span>
                      </div>
                    </div>
                  </div>

                  <div>{getChanceBadge(chanceThisRound ?? chanceNextRound)}</div>
                </div>

                {/* News / Medical Notes */}
                <div className="mt-3 p-2.5 rounded-lg bg-muted border border-border/60 text-xs text-muted-foreground leading-relaxed">
                  {news || "Status flagged by FPL medical update."}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/40 text-xs">
                <div className="text-muted-foreground">
                  Total Pts: <strong className="text-foreground">{player.total_points}</strong> · Owned:{" "}
                  <strong className="text-foreground">{player.selected_by_percent}%</strong>
                </div>
                {isYellowCardRisk && (
                  <div className="flex items-center gap-1 font-semibold text-amber-700 dark:text-yellow-400 bg-amber-500/10 px-2 py-0.5 rounded text-[11px] border border-amber-500/20">
                    <ShieldAlert className="w-3 h-3" />
                    {yellowCards} Yellows (Risk)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
