"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Compass, Sparkles, Filter } from "lucide-react";
import type { DifferentialPlayer } from "@/lib/insights-utils";

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

interface DifferentialsTabProps {
  differentials: DifferentialPlayer[];
}

type SortOption = "form" | "totalPoints" | "xgi" | "fdr";

export function DifferentialsTab({ differentials }: DifferentialsTabProps) {
  const [threshold, setThreshold] = useState<number>(10);
  const [position, setPosition] = useState<string>("ALL");
  const [sort, setSort] = useState<SortOption>("form");

  const filtered = useMemo(() => {
    return differentials
      .filter((d) => {
        if (d.ownership > threshold) return false;
        if (position !== "ALL" && d.player.position !== position) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "form") return b.form - a.form || b.totalPoints - a.totalPoints;
        if (sort === "totalPoints") return b.totalPoints - a.totalPoints;
        if (sort === "xgi") return b.xgi - a.xgi;
        if (sort === "fdr") return (a.player.avg_fdr_next5 || 3) - (b.player.avg_fdr_next5 || 3);
        return 0;
      })
      .slice(0, 30);
  }, [differentials, threshold, position, sort]);

  return (
    <div className="space-y-4">
      {/* Control Strip */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border">
        {/* Ownership Threshold Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-primary" />
            Cap:
          </span>
          <div className="flex bg-muted p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setThreshold(10)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                threshold === 10
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              &lt; 10% Owned
            </button>
            <button
              onClick={() => setThreshold(5)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                threshold === 5
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              &lt; 5% Ultra-Diff
            </button>
          </div>
        </div>

        {/* Position filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {["ALL", "GKP", "DEF", "MID", "FWD"].map((pos) => (
            <button
              key={pos}
              onClick={() => setPosition(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                position === pos
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Sorting */}
        <div className="flex items-center gap-1.5 self-end lg:self-auto">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="bg-card border border-border text-xs text-foreground rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary"
          >
            <option value="form">Sort: Recent Form</option>
            <option value="totalPoints">Sort: Total Points</option>
            <option value="xgi">Sort: Expected Goal Involvement (xGI)</option>
            <option value="fdr">Sort: Best Fixtures (Next 5 FDR)</option>
          </select>
        </div>
      </div>

      {/* Narrative hint */}
      <div className="bg-card border border-border rounded-xl p-3.5 text-xs text-muted-foreground flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <span>
            <strong>Differential Strategy:</strong> Owning in-form players with &lt; 10% global ownership allows you to gain maximum rank on the field whenever they return points.
          </span>
        </div>
      </div>

      {/* Grid of Differential Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(({ player, ownership, form, totalPoints, xgi }) => (
          <div
            key={player.id}
            className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between hover:border-primary/60 transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-muted border border-border shrink-0 group-hover:border-primary/50 transition-colors">
                  {player.image_url ? (
                    <Image
                      src={player.image_url}
                      alt={player.web_name}
                      fill
                      sizes="48px"
                      className="object-cover object-top"
                    />
                  ) : null}
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                    {player.web_name}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <span>{player.team_name}</span>
                    <span>·</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getPositionBadgeClass(player.position)}`}>
                      {player.position}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-semibold text-foreground mt-1">
                    £{player.price.toFixed(1)}m
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30">
                  {ownership.toFixed(1)}% owned
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-border/40 text-center text-xs">
              <div className="bg-muted rounded-lg p-1.5">
                <div className="text-[10px] text-muted-foreground">Form</div>
                <div className="font-bold text-emerald-700 dark:text-primary">{form.toFixed(1)}</div>
              </div>
              <div className="bg-muted rounded-lg p-1.5">
                <div className="text-[10px] text-muted-foreground">Total Pts</div>
                <div className="font-mono font-bold text-foreground">{totalPoints}</div>
              </div>
              <div className="bg-muted rounded-lg p-1.5">
                <div className="text-[10px] text-muted-foreground">xGI</div>
                <div className="font-bold text-amber-700 dark:text-amber-400">{xgi.toFixed(2)}</div>
              </div>
              <div className="bg-muted rounded-lg p-1.5">
                <div className="text-[10px] text-muted-foreground">Next 5 FDR</div>
                <div
                  className={`font-mono font-bold ${
                    player.avg_fdr_next5 <= 2.5
                      ? "text-emerald-700 dark:text-primary"
                      : player.avg_fdr_next5 >= 3.5
                        ? "text-rose-700 dark:text-rose-400"
                        : "text-foreground"
                  }`}
                >
                  {player.avg_fdr_next5?.toFixed(1) ?? "3.0"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
