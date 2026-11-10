"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { ArrowUpDown } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { getFdrTheme } from "@/app/players/players-table";
import { cn } from "@/lib/utils";
import type { FPLTeam, FPLFixture } from "@/lib/fpl-types";
import { calculateFixtureMatrix, type TeamFixtureRow } from "@/lib/insights-utils";

interface FixtureTickerTabProps {
  teams: FPLTeam[];
  fixtures: FPLFixture[];
  currentGw: number;
}

function FixtureCell({
  fixture,
}: {
  fixture: { difficulty: number; event: number; opponentShort: string; isHome: boolean };
}) {
  const fdrTheme = getFdrTheme(fixture.difficulty);
  return (
    <div
      className="py-1 px-1.5 rounded-md text-xs font-bold shadow-xs flex flex-col items-center justify-center border border-black/10 dark:border-white/10"
      style={{ backgroundColor: fdrTheme.bg, color: fdrTheme.text }}
      title={`GW${fixture.event}: vs ${fixture.opponentShort} (${fixture.isHome ? "Home" : "Away"}) - Difficulty ${fixture.difficulty}`}
    >
      <span className="tracking-tight">{fixture.opponentShort}</span>
      <span className="text-[10px] opacity-75 font-normal">({fixture.isHome ? "H" : "A"})</span>
    </div>
  );
}

export function FixtureTickerTab({
  teams,
  fixtures,
  currentGw,
}: FixtureTickerTabProps) {
  const shouldReduce = useReducedMotion();
  const [horizon, setHorizon] = useState<number>(6);
  const [sortAscending, setSortAscending] = useState<boolean>(true);

  const rows: TeamFixtureRow[] = useMemo(() => {
    const raw = calculateFixtureMatrix(teams, fixtures, currentGw, horizon);
    return sortAscending
      ? [...raw].sort((a, b) => a.avgDifficulty - b.avgDifficulty)
      : [...raw].sort((a, b) => b.avgDifficulty - a.avgDifficulty);
  }, [teams, fixtures, currentGw, horizon, sortAscending]);

  const targetGws = Array.from({ length: horizon }, (_, i) => currentGw + i);


  return (
    <div className="space-y-4">
      {/* Controls and Legend — Apple Clean Controls Rail */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Horizon selector */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-full bg-muted/60 border border-border/50 backdrop-blur-md">
            {[4, 6, 8].map((h) => (
              <motion.button
                key={h}
                onClick={() => setHorizon(h)}
                whileTap={shouldReduce ? undefined : { scale: 0.95 }}
                className={cn(
                  "px-3.5 py-1 rounded-full text-xs font-medium transition-all",
                  horizon === h
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Next {h} GWs
              </motion.button>
            ))}
          </div>
        </div>

        {/* Sort Toggle */}
        <motion.button
          onClick={() => setSortAscending((prev) => !prev)}
          whileTap={shouldReduce ? undefined : { scale: 0.95 }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-muted/60 border border-border/50 text-xs font-medium text-foreground hover:bg-muted transition-colors self-start md:self-auto cursor-pointer"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
          <span>
            {sortAscending ? "Easiest Runs First" : "Hardest Runs First"}
          </span>
        </motion.button>

        {/* FDR Legend with official FPL colors */}
        <div className="flex items-center gap-1.5 text-[11px] self-start md:self-auto flex-wrap">
          <span className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground mr-1">FDR:</span>
          {[1, 2, 3, 4, 5].map((diff) => {
            const theme = getFdrTheme(diff);
            return (
              <span
                key={diff}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs"
                style={{ backgroundColor: theme.bg, color: theme.text }}
              >
                {diff === 1 ? "1 (Easy)" : diff === 5 ? "5 (Tough)" : diff}
              </span>
            );
          })}
        </div>
      </div>

      {/* Fixture Table Matrix */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)" }}>
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
                        <FixtureCell fixture={fixture} />
                      ) : (
                        <div className="py-1.5 px-1 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border/30">
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
