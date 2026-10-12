"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Coins, Filter } from "lucide-react";
import type { ValuePlayer } from "@/lib/insights-utils";

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

interface ValueRoiTabProps {
  players: ValuePlayer[];
}

type SortField = "pointsPerMillion" | "formPerMillion" | "pointsPer90" | "totalPoints";

export function ValueRoiTab({ players }: ValueRoiTabProps) {
  const [position, setPosition] = useState<string>("ALL");
  const [priceTier, setPriceTier] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortField>("pointsPerMillion");

  const filtered = useMemo(() => {
    return players
      .filter((p) => {
        if (position !== "ALL" && p.player.position !== position) return false;
        if (priceTier === "BUDGET" && p.player.price > 5.5) return false;
        if (
          priceTier === "MID" &&
          (p.player.price <= 5.5 || p.player.price > 8.5)
        )
          return false;
        if (priceTier === "PREMIUM" && p.player.price <= 8.5) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "pointsPerMillion") return b.pointsPerMillion - a.pointsPerMillion;
        if (sortBy === "formPerMillion") return b.formPerMillion - a.formPerMillion;
        if (sortBy === "pointsPer90") return b.pointsPer90 - a.pointsPer90;
        return (b.player.total_points || 0) - (a.player.total_points || 0);
      })
      .slice(0, 30);
  }, [players, position, priceTier, sortBy]);

  return (
    <div className="space-y-4">
      {/* Filter and Control Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border">
        {/* Position toggles */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {["ALL", "GKP", "DEF", "MID", "FWD"].map((pos) => (
            <button
              key={pos}
              onClick={() => setPosition(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                position === pos
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground border border-border/60"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Tier and sort selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={priceTier}
              onChange={(e) => setPriceTier(e.target.value)}
              className="bg-card border border-border text-xs text-foreground rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Price Tiers</option>
              <option value="BUDGET">Budget Gems (&le; £5.5m)</option>
              <option value="MID">Mid-Priced (£5.6m - £8.5m)</option>
              <option value="PREMIUM">Premiums (&gt; £8.5m)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="bg-muted border border-border text-xs text-foreground rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary"
            >
              <option value="pointsPerMillion">Sort: Points / £m (ROI)</option>
              <option value="formPerMillion">Sort: Form / £m</option>
              <option value="pointsPer90">Sort: Points / 90 mins</option>
              <option value="totalPoints">Sort: Total Points</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase border-b border-border">
              <tr>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-3">Pos</th>
                <th className="py-3 px-3">Price</th>
                <th className="py-3 px-3">Total Pts</th>
                <th className="py-3 px-3">Points / £m</th>
                <th className="py-3 px-3">Form</th>
                <th className="py-3 px-3">Form / £m</th>
                <th className="py-3 px-4 text-right">Points / 90</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map(({ player, pointsPerMillion, formPerMillion, pointsPer90 }) => (
                <tr
                  key={player.id}
                  className="hover:bg-muted/80 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                        {player.image_url ? (
                          <Image
                            src={player.image_url}
                            alt={player.web_name}
                            fill
                            sizes="32px"
                            className="object-cover object-top"
                          />
                        ) : null}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {player.web_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {player.team_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getPositionBadgeClass(player.position)}`}>
                      {player.position}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-foreground">
                    £{player.price.toFixed(1)}m
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-foreground">
                    {player.total_points}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/15 text-primary border border-emerald-500/30">
                      {pointsPerMillion.toFixed(1)} pts/£m
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-foreground">
                    {player.form}
                  </td>
                  <td className="py-3 px-3 font-mono text-xs text-muted-foreground">
                    {formPerMillion.toFixed(1)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-xs text-foreground">
                    {pointsPer90.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-border/40">
          {filtered.map(({ player, pointsPerMillion, formPerMillion, pointsPer90 }) => (
            <div key={player.id} className="p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                    {player.image_url ? (
                      <Image
                        src={player.image_url}
                        alt={player.web_name}
                        fill
                        sizes="32px"
                        className="object-cover object-top"
                      />
                    ) : null}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">
                      {player.web_name}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span>{player.team_short}</span>
                      <span>·</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getPositionBadgeClass(player.position)}`}>
                        {player.position}
                      </span>
                      <span>·</span>
                      <span className="font-mono">£{player.price.toFixed(1)}m</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Total Pts</div>
                  <div className="font-mono font-bold text-sm text-foreground">
                    {player.total_points}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs border-t border-border/30">
                <div>
                  <span className="font-bold text-primary bg-emerald-500/10 px-2 py-0.5 rounded">
                    {pointsPerMillion.toFixed(1)} pts/£m
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Form/£m: <strong className="text-foreground">{formPerMillion.toFixed(1)}</strong> · Pts/90: <strong className="text-foreground">{pointsPer90.toFixed(1)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
