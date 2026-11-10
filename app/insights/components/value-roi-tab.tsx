"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Coins, Filter } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";
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

const PRICE_TIER_LABELS: Record<string, string> = {
  ALL: "All Price Tiers",
  BUDGET: "Budget Gems (≤ £5.5m)",
  MID: "Mid-Priced (£5.6m - £8.5m)",
  PREMIUM: "Premiums (> £8.5m)",
};

const ROI_SORT_LABELS: Record<SortField, string> = {
  pointsPerMillion: "Sort: Points / £m (ROI)",
  formPerMillion: "Sort: Form / £m",
  pointsPer90: "Sort: Points / 90 mins",
  totalPoints: "Sort: Total Points",
};

export function ValueRoiTab({ players }: ValueRoiTabProps) {
  const shouldReduce = useReducedMotion();
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
      {/* Filter and Control Bar — Clean Apple Control Rail */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Position toggles */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {["ALL", "GKP", "DEF", "MID", "FWD"].map((pos) => (
            <motion.button
              key={pos}
              onClick={() => setPosition(pos)}
              whileTap={shouldReduce ? undefined : { scale: 0.94 }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0",
                position === pos
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground border border-border/60 hover:bg-muted"
              )}
            >
              {pos}
            </motion.button>
          ))}
        </div>

        {/* Tier and sort selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center">
            <Select
              value={priceTier}
              onValueChange={(val) => {
                if (val) setPriceTier(val);
              }}
            >
              <SelectTrigger className="h-8 rounded-full bg-muted/60 border border-border/50 text-xs px-3.5 py-1 text-foreground hover:bg-muted/80 transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 gap-2 shrink-0">
                <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>{PRICE_TIER_LABELS[priceTier] ?? priceTier}</span>
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                side="bottom"
                align="end"
                sideOffset={6}
                className="w-max min-w-[220px] max-w-[320px] rounded-2xl border border-border/70 bg-card/95 dark:bg-[#0f1c2c]/95 backdrop-blur-xl shadow-2xl p-1.5 text-xs text-foreground z-50"
              >
                <SelectGroup>
                  <SelectItem value="ALL" className="text-xs rounded-xl py-2 px-3 cursor-pointer focus:bg-primary/15 focus:text-primary transition-colors">
                    All Price Tiers
                  </SelectItem>
                  <SelectItem value="BUDGET" className="text-xs rounded-xl py-2 px-3 cursor-pointer focus:bg-primary/15 focus:text-primary transition-colors">
                    Budget Gems (≤ £5.5m)
                  </SelectItem>
                  <SelectItem value="MID" className="text-xs rounded-xl py-2 px-3 cursor-pointer focus:bg-primary/15 focus:text-primary transition-colors">
                    Mid-Priced (£5.6m - £8.5m)
                  </SelectItem>
                  <SelectItem value="PREMIUM" className="text-xs rounded-xl py-2 px-3 cursor-pointer focus:bg-primary/15 focus:text-primary transition-colors">
                    Premiums (&gt; £8.5m)
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center">
            <Select
              value={sortBy}
              onValueChange={(val) => {
                if (val) setSortBy(val as SortField);
              }}
            >
              <SelectTrigger className="h-8 rounded-full bg-muted/60 border border-border/50 text-xs px-3.5 py-1 text-foreground hover:bg-muted/80 transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 gap-2 shrink-0">
                <Coins className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>{ROI_SORT_LABELS[sortBy] ?? sortBy}</span>
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                side="bottom"
                align="end"
                sideOffset={6}
                className="w-max min-w-[230px] max-w-[320px] rounded-2xl border border-border/70 bg-card/95 dark:bg-[#0f1c2c]/95 backdrop-blur-xl shadow-2xl p-1.5 text-xs text-foreground z-50"
              >
                <SelectGroup>
                  <SelectItem value="pointsPerMillion" className="text-xs rounded-xl py-2 px-3 cursor-pointer focus:bg-primary/15 focus:text-primary transition-colors">
                    Sort: Points / £m (ROI)
                  </SelectItem>
                  <SelectItem value="formPerMillion" className="text-xs rounded-xl py-2 px-3 cursor-pointer focus:bg-primary/15 focus:text-primary transition-colors">
                    Sort: Form / £m
                  </SelectItem>
                  <SelectItem value="pointsPer90" className="text-xs rounded-xl py-2 px-3 cursor-pointer focus:bg-primary/15 focus:text-primary transition-colors">
                    Sort: Points / 90 mins
                  </SelectItem>
                  <SelectItem value="totalPoints" className="text-xs rounded-xl py-2 px-3 cursor-pointer focus:bg-primary/15 focus:text-primary transition-colors">
                    Sort: Total Points
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)" }}>
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
