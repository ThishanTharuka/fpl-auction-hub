"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Compass, Sparkles, Filter } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const SORT_LABELS: Record<SortOption, string> = {
  form: "Sort: Recent Form",
  totalPoints: "Sort: Total Points",
  xgi: "Sort: Expected Goal Involvement (xGI)",
  fdr: "Sort: Best Fixtures (Next 5 FDR)",
};

export function DifferentialsTab({ differentials }: DifferentialsTabProps) {
  const shouldReduce = useReducedMotion();
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
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_auto_1fr] items-stretch lg:items-center gap-3">
        {/* Ownership Threshold Toggle */}
        <div className="flex items-center gap-2 justify-start">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-primary" />
            Cap:
          </span>
          <div className="flex bg-muted/60 p-0.5 rounded-full border border-border/50">
            <motion.button
              onClick={() => setThreshold(10)}
              whileTap={shouldReduce ? undefined : { scale: 0.95 }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                threshold === 10
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              &lt; 10% Owned
            </motion.button>
            <motion.button
              onClick={() => setThreshold(5)}
              whileTap={shouldReduce ? undefined : { scale: 0.95 }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                threshold === 5
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              &lt; 5% Ultra-Diff
            </motion.button>
          </div>
        </div>

        {/* Position filters */}
        <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {["ALL", "GKP", "DEF", "MID", "FWD"].map((pos) => (
            <motion.button
              key={pos}
              onClick={() => setPosition(pos)}
              whileTap={shouldReduce ? undefined : { scale: 0.94 }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0",
                position === pos
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-card/70 text-muted-foreground hover:text-foreground border border-border/60 hover:bg-muted"
              )}
            >
              {pos}
            </motion.button>
          ))}
        </div>

        {/* Sorting */}
        <div className="flex items-center justify-end">
          <Select
            value={sort}
            onValueChange={(val) => {
              if (val) setSort(val as SortOption);
            }}
          >
            <SelectTrigger className="h-8 rounded-full bg-card/80 dark:bg-card/60 border border-border/70 text-xs px-3.5 py-1 text-foreground hover:bg-muted/80 hover:border-foreground/40 transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary gap-2 shrink-0">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <SelectValue>
                {(val: string | null) =>
                  val && val in SORT_LABELS
                    ? SORT_LABELS[val as SortOption]
                    : SORT_LABELS.form
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              side="bottom"
              align="end"
              sideOffset={6}
              className="w-max min-w-[250px] max-w-[340px] rounded-2xl border border-border/70 bg-card/95 dark:bg-[#0f1c2c]/95 backdrop-blur-xl shadow-2xl p-1.5 text-xs text-foreground z-50"
            >
              <SelectGroup>
                <SelectItem value="form" className="text-xs rounded-xl py-2 px-3 cursor-pointer focus:bg-primary/15 focus:text-primary transition-colors">
                  Sort: Recent Form
                </SelectItem>
                <SelectItem value="totalPoints" className="text-xs rounded-xl py-2 px-3 cursor-pointer focus:bg-primary/15 focus:text-primary transition-colors">
                  Sort: Total Points
                </SelectItem>
                <SelectItem value="xgi" className="text-xs rounded-xl py-2 px-3 cursor-pointer focus:bg-primary/15 focus:text-primary transition-colors">
                  Sort: Expected Goal Involvement (xGI)
                </SelectItem>
                <SelectItem value="fdr" className="text-xs rounded-xl py-2 px-3 cursor-pointer focus:bg-primary/15 focus:text-primary transition-colors">
                  Sort: Best Fixtures (Next 5 FDR)
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Narrative hint */}
      <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-2xl p-4 text-xs text-muted-foreground flex items-center justify-between shadow-xs" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
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
          <motion.div
            key={player.id}
            initial={shouldReduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.06)" }}
            className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 flex flex-col justify-between hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
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
          </motion.div>
        ))}
      </div>
    </div>
  );
}
