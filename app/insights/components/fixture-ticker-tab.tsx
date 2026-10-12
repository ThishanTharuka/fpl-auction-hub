"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Calendar, ArrowUpDown } from "lucide-react";
import type { FPLTeam, FPLFixture } from "@/lib/fpl-types";
import { calculateFixtureMatrix, type TeamFixtureRow } from "@/lib/insights-utils";

interface FixtureTickerTabProps {
  teams: FPLTeam[];
  fixtures: FPLFixture[];
  currentGw: number;
}

export function FixtureTickerTab({
  teams,
  fixtures,
  currentGw,
}: FixtureTickerTabProps) {
  const [horizon, setHorizon] = useState<number>(6);
  const [sortAscending, setSortAscending] = useState<boolean>(true);

  const rows: TeamFixtureRow[] = useMemo(() => {
    const raw = calculateFixtureMatrix(teams, fixtures, currentGw, horizon);
    return sortAscending
      ? [...raw].sort((a, b) => a.avgDifficulty - b.avgDifficulty)
      : [...raw].sort((a, b) => b.avgDifficulty - a.avgDifficulty);
  }, [teams, fixtures, currentGw, horizon, sortAscending]);

  const targetGws = Array.from({ length: horizon }, (_, i) => currentGw + i);

  const getFdrStyle = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-primary dark:border-emerald-700/50";
      case 2:
        return "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-600/40";
      case 3:
        return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600/40";
      case 4:
        return "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-400 dark:border-amber-600/50";
      case 5:
        return "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-600/50";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls and Legend */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border">
        {/* Horizon selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            Gameweeks:
          </span>
          <div className="flex bg-muted p-0.5 rounded-lg border border-border">
            {[4, 6, 8].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  horizon === h
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Next {h} GWs
              </button>
            ))}
          </div>
        </div>

        {/* Sort Toggle */}
        <button
          onClick={() => setSortAscending((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs font-medium text-foreground hover:border-primary/50 transition-colors self-start md:self-auto cursor-pointer"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
          <span>
            {sortAscending ? "Easiest Runs First" : "Hardest Runs First"}
          </span>
        </button>

        {/* FDR Legend */}
        <div className="flex items-center gap-1.5 text-[11px] self-start md:self-auto flex-wrap">
          <span className="text-muted-foreground mr-1">FDR:</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-300 dark:bg-emerald-950 dark:text-primary dark:border-emerald-700/50">
            1 (Easy)
          </span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-600/40">
            2
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600/40">
            3
          </span>
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300 dark:bg-amber-950/80 dark:text-amber-400 dark:border-amber-600/50">
            4
          </span>
          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 font-bold border border-rose-300 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-600/50">
            5 (Tough)
          </span>
        </div>
      </div>

      {/* Fixture Table Matrix */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-muted text-muted-foreground text-xs uppercase border-b border-border">
              <tr>
                <th className="py-3 px-4 min-w-[160px]">Team</th>
                <th className="py-3 px-3 text-center w-20">Avg FDR</th>
                {targetGws.map((gw) => (
                  <th
                    key={gw}
                    className="py-3 px-2 text-center min-w-[70px] font-semibold"
                  >
                    GW {gw}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rows.map(({ team, fixtures: teamFixtures, avgDifficulty }) => (
                <tr
                  key={team.id}
                  className="hover:bg-muted/80 transition-colors"
                >
                  <td className="py-2.5 px-4 font-semibold text-foreground">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-6 h-6 shrink-0">
                        <Image
                          src={`https://resources.premierleague.com/premierleague/badges/70/t${team.code}.png`}
                          alt={team.name}
                          fill
                          sizes="24px"
                          className="object-contain"
                        />
                      </div>
                      <span className="truncate">{team.name}</span>
                    </div>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        avgDifficulty <= 2.5
                          ? "bg-emerald-500/15 text-primary border border-emerald-500/30"
                          : avgDifficulty >= 3.6
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            : "bg-muted text-foreground"
                      }`}
                    >
                      {avgDifficulty.toFixed(1)}
                    </span>
                  </td>

                  {teamFixtures.map((fixture, idx) => (
                    <td key={idx} className="py-2.5 px-2 text-center">
                      {fixture ? (
                        <div
                          className={`py-1 px-1.5 rounded text-xs font-semibold border flex flex-col items-center justify-center ${getFdrStyle(
                            fixture.difficulty,
                          )}`}
                          title={`GW${fixture.event}: vs ${fixture.opponentShort} (${fixture.isHome ? "Home" : "Away"}) - Difficulty ${fixture.difficulty}`}
                        >
                          <span className="tracking-tight">
                            {fixture.opponentShort}
                          </span>
                          <span className="text-[10px] opacity-75 font-normal">
                            ({fixture.isHome ? "H" : "A"})
                          </span>
                        </div>
                      ) : (
                        <div className="py-1.5 px-1 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border/30">
                          BLANK
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
