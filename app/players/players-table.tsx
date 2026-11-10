"use client";
/* eslint-disable @next/next/no-img-element -- dynamic crests with onError fallback, next/image incompatible */

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Info,
  Columns2,
  ChevronDown,
  SearchX,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { EnrichedPlayer, PlayerFixturePreview } from "@/lib/fpl-types";
import { GoogleSheetsProvider } from "@/lib/google-sheets-context";
import { ExportSheetsButton } from "@/components/export-sheets-button";
import { RefreshFplDataButton } from "@/components/refresh-fpl-data-button";
import Counter from "@/components/counter";
import { cn } from "@/lib/utils";
import { PLAYERS_PAGE_SIZE } from "./constants";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-amber-500/15 text-amber-800 dark:text-yellow-400 border-amber-500/30",
  DEF: "bg-emerald-500/15 text-emerald-800 dark:text-green-400 border-emerald-500/30",
  MID: "bg-blue-500/15 text-blue-800 dark:text-blue-400 border-blue-500/30",
  FWD: "bg-rose-500/15 text-rose-800 dark:text-red-400 border-rose-500/30",
};

const POSITION_LABELS: Record<string, string> = {
  GKP: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

const COLUMN_TOOLTIPS: Record<string, string> = {
  price: "Price (£m)",
  total_points: "Total Points this season",
  points_per_game: "Points Per Game — season average",
  selected_by_percent: "Ownership — selected by % of FPL managers",
  status: "Availability / chance of playing next GW",
  form: "Form — average points over last 4 gameweeks",
  ict_index: "ICT Index — combined Influence, Creativity & Threat score",
  influence: "Influence — player's impact on the match result",
  creativity: "Creativity — chance creation and assist potential",
  threat: "Threat — goal scoring threat score",
  xg: "Expected Goals (xG) — season total",
  xa: "Expected Assists (xA) — season total",
  xgi: "Expected Goal Involvements (xG + xA) — season total",
  xgc: "Expected Goals Conceded (xGC) — season total",
  goals_scored: "Goals Scored this season",
  assists: "Assists this season",
  clean_sheets: "Clean Sheets this season",
  minutes: "Minutes Played this season",
  bonus: "Bonus Points this season",
  bps: "Bonus Points System score — raw BPS this season",
  yellow_cards: "Yellow Cards this season",
  red_cards: "Red Cards this season",
  transfers_in_event: "Transfers In this Gameweek",
  transfers_out_event: "Transfers Out this Gameweek",
  avg_fdr_next5:
    "Average Fixture Difficulty Rating over next 5 Gameweeks (1=easy, 5=hard)",
};

export const FDR_CONFIG: Record<
  number,
  { bg: string; text: string; label: string; border: string }
> = {
  1: { bg: "#375523", text: "#ffffff", label: "Very Easy", border: "border-[#4a7230]" },
  2: { bg: "#01fc7a", text: "#111827", label: "Easy", border: "border-[#00d865]" },
  3: { bg: "#e7e7e7", text: "#111827", label: "Medium", border: "border-[#d0d0d0]" },
  4: { bg: "#ff1751", text: "#ffffff", label: "Hard", border: "border-[#e0003b]" },
  5: { bg: "#80072d", text: "#ffffff", label: "Very Hard", border: "border-[#62001e]" },
};

export function getFdrRating(diff: number): 1 | 2 | 3 | 4 | 5 {
  const rounded = Math.round(diff);
  if (rounded <= 1) return 1;
  if (rounded === 2) return 2;
  if (rounded === 3) return 3;
  if (rounded === 4) return 4;
  return 5;
}

export const DEFAULT_FDR_THEME = {
  bg: "#e7e7e7",
  text: "#111827",
  label: "Medium",
  border: "border-[#d0d0d0]",
};

export function getFdrTheme(diff: number) {
  const rating = getFdrRating(diff);
  return FDR_CONFIG[rating] ?? DEFAULT_FDR_THEME;
}

// Apple §4: Critically damped (bounce: 0), snappy 0.26s response for reordering without lag
const ROW_SPRING = { type: "spring" as const, bounce: 0, duration: 0.26 };

const COLUMN_GROUPS = [
  {
    group: "Core",
    columns: [
      { id: "price", label: "Price" },
      { id: "total_points", label: "Pts" },
      { id: "points_per_game", label: "PPG" },
      { id: "selected_by_percent", label: "Own %" },
      { id: "status", label: "Status" },
    ],
  },
  {
    group: "Form & Index",
    columns: [
      { id: "form", label: "Form" },
      { id: "ict_index", label: "ICT" },
      { id: "influence", label: "Influence" },
      { id: "creativity", label: "Creativity" },
      { id: "threat", label: "Threat" },
    ],
  },
  {
    group: "Expected Stats",
    columns: [
      { id: "xg", label: "xG" },
      { id: "xa", label: "xA" },
      { id: "xgi", label: "xGI" },
      { id: "xgc", label: "xGC" },
    ],
  },
  {
    group: "Season Stats",
    columns: [
      { id: "goals_scored", label: "Goals" },
      { id: "assists", label: "Assists" },
      { id: "clean_sheets", label: "CS" },
      { id: "minutes", label: "Mins" },
      { id: "bonus", label: "Bonus" },
      { id: "bps", label: "BPS" },
      { id: "yellow_cards", label: "YC" },
      { id: "red_cards", label: "RC" },
    ],
  },
  {
    group: "Transfers",
    columns: [
      { id: "transfers_in_event", label: "GW In" },
      { id: "transfers_out_event", label: "GW Out" },
    ],
  },
  {
    group: "Fixtures",
    columns: [{ id: "avg_fdr_next5", label: "FDR ×5" }],
  },
];

const DEFAULT_VISIBLE: VisibilityState = {
  price: true,
  total_points: true,
  points_per_game: false,
  selected_by_percent: false,
  status: true,
  form: true,
  ict_index: true,
  influence: false,
  creativity: false,
  threat: false,
  xg: false,
  xa: false,
  xgi: true,
  xgc: false,
  goals_scored: false,
  assists: false,
  clean_sheets: false,
  minutes: false,
  bonus: false,
  bps: false,
  yellow_cards: false,
  red_cards: false,
  transfers_in_event: false,
  transfers_out_event: false,
  avg_fdr_next5: true,
};

const MOBILE_STAT_OPTIONS = [
  { key: "pts", label: "Pts", get: (p: EnrichedPlayer) => p.total_points },
  { key: "form", label: "Form", get: (p: EnrichedPlayer) => parseFloat(p.form).toFixed(1) },
  { key: "ppg", label: "PPG", get: (p: EnrichedPlayer) => parseFloat(p.points_per_game).toFixed(1) },
  { key: "ict", label: "ICT", get: (p: EnrichedPlayer) => parseFloat(p.ict_index).toFixed(1) },
  { key: "value", label: "Price", get: (p: EnrichedPlayer) => `\u00a3${p.price.toFixed(1)}m` },
  { key: "xg", label: "xG", get: (p: EnrichedPlayer) => parseFloat(p.expected_goals).toFixed(2) },
  { key: "xa", label: "xA", get: (p: EnrichedPlayer) => parseFloat(p.expected_assists).toFixed(2) },
  { key: "xgi", label: "xGI", get: (p: EnrichedPlayer) => (parseFloat(p.expected_goals) + parseFloat(p.expected_assists)).toFixed(2) },
  { key: "cs", label: "CS", get: (p: EnrichedPlayer) => p.clean_sheets },
  { key: "goals", label: "Goals", get: (p: EnrichedPlayer) => p.goals_scored },
  { key: "assists", label: "Assists", get: (p: EnrichedPlayer) => p.assists },
  { key: "own", label: "Own %", get: (p: EnrichedPlayer) => `${parseFloat(p.selected_by_percent).toFixed(1)}%` },
  { key: "fdr", label: "FDR5", get: (p: EnrichedPlayer) => p.avg_fdr_next5.toFixed(1) },
  { key: "bonus", label: "Bonus", get: (p: EnrichedPlayer) => p.bonus },
  { key: "bps", label: "BPS", get: (p: EnrichedPlayer) => p.bps },
  { key: "mins", label: "Mins", get: (p: EnrichedPlayer) => p.minutes },
];

const DEFAULT_MOBILE_STATS = ["pts", "form", "ict", "ppg"];

const MOBILE_SORT_OPTIONS = [
  { id: "total_points", label: "Total Points", defaultDesc: true },
  { id: "price", label: "Price (£m)", defaultDesc: true },
  { id: "form", label: "Form", defaultDesc: true },
  { id: "points_per_game", label: "Points / Game", defaultDesc: true },
  { id: "selected_by_percent", label: "Ownership %", defaultDesc: true },
  { id: "ict_index", label: "ICT Index", defaultDesc: true },
  { id: "xg", label: "Expected Goals (xG)", defaultDesc: true },
  { id: "xa", label: "Expected Assists (xA)", defaultDesc: true },
  { id: "xgi", label: "xGI (xG + xA)", defaultDesc: true },
  { id: "goals_scored", label: "Goals Scored", defaultDesc: true },
  { id: "assists", label: "Assists", defaultDesc: true },
  { id: "clean_sheets", label: "Clean Sheets", defaultDesc: true },
  { id: "bps", label: "BPS (Bonus System)", defaultDesc: true },
  { id: "minutes", label: "Minutes Played", defaultDesc: true },
  { id: "avg_fdr_next5", label: "FDR Next 5 (Easiest)", defaultDesc: false },
] as const;

function InfoTip({ text }: Readonly<{ text: string }>) {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  return (
    <>
      <span
        ref={ref}
        className="inline-flex items-center"
        onMouseEnter={() => {
          const r = ref.current?.getBoundingClientRect();
          if (r) setCoords({ x: r.left + r.width / 2, y: r.top });
        }}
        onMouseLeave={() => setCoords(null)}
      >
        <Info className="w-3 h-3 text-foreground-dim hover:text-muted-foreground cursor-default shrink-0" />
      </span>
      {coords &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: coords.x,
              top: coords.y - 8,
              transform: "translate(-50%, -100%)",
              zIndex: 9999,
            }}
            className="w-48 rounded bg-secondary border border-border px-2 py-1.5 text-[0.6875rem] text-foreground whitespace-normal text-center shadow-lg pointer-events-none animate-in fade-in-0 blur-in-2 duration-150"
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}

function FdrCell({
  avgFdr,
  nextFixtures,
}: Readonly<{
  avgFdr: number;
  nextFixtures?: PlayerFixturePreview[];
}>) {
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const theme = getFdrTheme(avgFdr);
  const fixtures = (nextFixtures ?? []).slice(0, 3);
  const hasFixtures = fixtures.length > 0;

  return (
    <div
      className="relative flex items-center h-8 cursor-pointer select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      role="region"
      aria-label={`Average FDR: ${avgFdr.toFixed(1)}${
        hasFixtures
          ? `, next 3 fixtures: ${fixtures
              .map((f) => `${f.opponent_short} (${f.is_home ? "H" : "A"}) FDR ${f.difficulty}`)
              .join(", ")}`
          : ""
      }`}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {!isHovered || !hasFixtures ? (
          <motion.div
            key="avg-pill"
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.92, filter: "blur(1px)" }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, filter: "blur(0px)" }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.92, filter: "blur(1px)" }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0.1 }
                : { type: "spring", damping: 28, stiffness: 360, mass: 0.8 }
            }
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center min-w-[42px] h-[28px] px-2.5 rounded-[8px] border border-black/15 dark:border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_1px_2px_rgba(0,0,0,0.1)] select-none font-mono font-bold text-xs tracking-tight tabular-nums transition-transform"
            style={{
              backgroundColor: theme.bg,
              color: theme.text,
            }}
            title={`Avg FDR: ${avgFdr.toFixed(1)} (${theme.label}) - Hover to reveal next 3 fixtures`}
          >
            {avgFdr.toFixed(1)}
          </motion.div>
        ) : (
          <motion.div
            key="fixtures-expanded"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="flex items-center gap-1.5"
          >
            {fixtures.map((fix, idx) => {
              const fixTheme = getFdrTheme(fix.difficulty);
              return (
                <motion.div
                  key={`${fix.event ?? idx}-${fix.opponent_short}`}
                  initial={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          scale: 0.85,
                          x: idx === 0 ? 0 : -10 * idx,
                        }
                  }
                  animate={
                    prefersReducedMotion
                      ? { opacity: 1 }
                      : {
                          opacity: 1,
                          scale: 1,
                          x: 0,
                        }
                  }
                  transition={
                    prefersReducedMotion
                      ? { duration: 0.08 }
                      : {
                          type: "spring",
                          damping: 26,
                          stiffness: 380,
                          mass: 0.8,
                          delay: idx * 0.025,
                        }
                  }
                  whileHover={
                    prefersReducedMotion
                      ? undefined
                      : {
                          y: -1.5,
                          scale: 1.06,
                          boxShadow:
                            "inset 0 1px 0 0 rgba(255,255,255,0.32), 0 3px 6px -1px rgba(0,0,0,0.2)",
                        }
                  }
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center justify-center w-[36px] h-[28px] rounded-[8px] border border-black/15 dark:border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.1)] select-none transition-all duration-100 ease-out cursor-default"
                  style={{
                    backgroundColor: fixTheme.bg,
                    color: fixTheme.text,
                  }}
                  title={`GW${fix.event ?? "?"}: vs ${fix.opponent_short} (${fix.is_home ? "Home" : "Away"}) · FDR ${fix.difficulty} (${fixTheme.label})`}
                >
                  <span className="text-[9.5px] font-bold tracking-tight leading-none">
                    {fix.opponent_short}
                  </span>
                  <span className="text-[7.5px] font-bold tracking-wider opacity-90 leading-none mt-0.5 uppercase">
                    {fix.is_home ? "H" : "A"}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; chip: string }> = {
  a: { label: "Available", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-green-400", chip: "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-green-400" },
  d: { label: "Doubt", dot: "bg-amber-500", text: "text-amber-700 dark:text-orange-400", chip: "bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-orange-400" },
  i: { label: "Injured", dot: "bg-red-500", text: "text-red-700 dark:text-red-400", chip: "bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400" },
  s: { label: "Suspended", dot: "bg-red-500", text: "text-red-700 dark:text-red-400", chip: "bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400" },
  n: { label: "Intl", dot: "bg-muted-foreground", text: "text-muted-foreground", chip: "bg-muted border-border text-muted-foreground" },
  u: { label: "Out", dot: "bg-red-500", text: "text-red-700 dark:text-red-400", chip: "bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400" },
};

function getStatusInfo(status: string, chance: number | null) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["a"]!;
  if (status === "d" && chance !== null) {
    return { ...cfg, label: `Doubt ${chance}%` };
  }
  return cfg;
}

function StatusChip({
  status,
  chance,
}: {
  status: string;
  chance: number | null;
}) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["a"]!;
  const label = status === "d" && chance !== null ? `Doubt ${chance}%` : cfg.label;
  return (
    <span className={`inline-flex items-center justify-center rounded-full border w-20 sm:w-24 py-0.5 text-[0.625rem] sm:text-[0.6875rem] font-medium ${cfg.chip}`}>
      {label}
    </span>
  );
}

function ColumnPickerContent({
  colVisibility,
  setColVisibility,
}: {
  colVisibility: VisibilityState;
  setColVisibility: (
    v: VisibilityState | ((prev: VisibilityState) => VisibilityState),
  ) => void;
}) {
  return (
    <div data-frost="card" className="bg-card/90 backdrop-blur-xl border border-border rounded-lg shadow-xl p-4 overflow-y-auto w-72 max-h-[min(90vh,680px)]">
      <div className="eyebrow text-foreground-dim mb-3">
        Toggle Columns
      </div>
      {COLUMN_GROUPS.map(({ group, columns: cols }) => (
        <div key={group} className="mb-4">
          <div className="eyebrow-xs text-foreground-dim mb-1.5 border-b border-border pb-1">
            {group}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {cols.map(({ id, label }) => (
              <label
                key={id}
                className="flex items-center gap-2 cursor-pointer text-xs text-foreground hover:text-primary py-0.5"
              >
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={colVisibility[id] !== false}
                  onChange={(e) =>
                    setColVisibility((v) => ({
                      ...v,
                      [id]: e.target.checked,
                    }))
                  }
                />
                {label}
                {COLUMN_TOOLTIPS[id] && <InfoTip text={COLUMN_TOOLTIPS[id]!} />}
              </label>
            ))}
          </div>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        className="w-full mt-1 border-border text-foreground-dim text-xs hover:bg-secondary press"
        onClick={() => setColVisibility(DEFAULT_VISIBLE)}
      >
        Reset to default
      </Button>
    </div>
  );
}

function PlayerCard({
  player,
  onSelect,
  visibleStats,
  remainingStats,
}: {
  player: EnrichedPlayer;
  onSelect: () => void;
  visibleStats: readonly { key: string; label: string; get: (p: EnrichedPlayer) => string | number }[];
  remainingStats: readonly { key: string; label: string; get: (p: EnrichedPlayer) => string | number }[];
}) {
  const statusInfo = getStatusInfo(player.status, player.chance_of_playing_next_round);

  return (
    <div className="group rounded-2xl border border-border/50 dark:border-white/[0.08] bg-card/85 dark:bg-[#0c1827]/85 backdrop-blur-xl shadow-xs transition-all duration-150 active:scale-[0.99] overflow-hidden">
      <Accordion type="single" collapsible>
        <AccordionItem value="more" className="border-0">
          <div className="flex items-center justify-between gap-3 px-3.5 pt-3 pb-2.5">
            {/* Name + Team (clickable to open profile) */}
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={onSelect}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect();
                }
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground text-sm tracking-tight truncate">
                  {player.web_name}
                </span>
                <span className="text-xs text-muted-foreground/80 shrink-0 font-normal">
                  ({player.team_short})
                </span>
              </div>
            </div>

            {/* Blinking Status Dot + Position Badge & Accordion Chevron */}
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="relative flex size-2 shrink-0 items-center justify-center"
                title={statusInfo.label}
                aria-label={statusInfo.label}
              >
                <span
                  className={cn(
                    "absolute inline-flex size-3 rounded-full opacity-35 animate-pulse",
                    statusInfo.dot,
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex size-2 rounded-full",
                    statusInfo.dot,
                  )}
                />
              </span>
              <Badge
                variant="outline"
                className={`text-[0.625rem] font-bold px-2.5 py-0.5 h-5 rounded-full ${POSITION_COLORS[player.position]}`}
              >
                {player.position}
              </Badge>
              <AccordionTrigger className="p-1 hover:no-underline rounded-full hover:bg-muted/60 transition-colors" />
            </div>
          </div>

          <div className="px-3.5 pb-3">
            <div className="grid grid-cols-4 gap-1.5">
              {visibleStats.map((stat) => (
                <div
                  key={stat.key}
                  className="bg-foreground/[0.025] dark:bg-white/[0.035] border border-border/30 dark:border-white/[0.04] rounded-xl py-2 px-1 text-center"
                >
                  <div
                    className={cn(
                      "text-xs font-semibold tabular-nums tracking-tight",
                      stat.key === "value" ? "text-primary font-bold" : "text-foreground",
                    )}
                  >
                    {stat.get(player)}
                  </div>
                  <div className="text-[9.5px] uppercase font-medium text-muted-foreground/75 tracking-wider mt-0.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {remainingStats.length > 0 && (
              <AccordionContent className="pb-0">
                <div className="grid grid-cols-4 gap-1.5 pt-2 mt-2 border-t border-border/40 dark:border-white/[0.05]">
                  {remainingStats.map((stat) => (
                    <div
                      key={stat.key}
                      className="bg-foreground/[0.025] dark:bg-white/[0.035] border border-border/30 dark:border-white/[0.04] rounded-xl py-2 px-1 text-center"
                    >
                      <div
                        className={cn(
                          "text-xs font-semibold tabular-nums tracking-tight flex items-center justify-center",
                          stat.key === "value" ? "text-primary font-bold" : "text-foreground",
                        )}
                      >
                        {stat.key === "fdr" ? (
                          <span
                            className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-xs border border-black/10 dark:border-white/10"
                            style={{
                              backgroundColor: getFdrTheme(player.avg_fdr_next5).bg,
                              color: getFdrTheme(player.avg_fdr_next5).text,
                            }}
                          >
                            {stat.get(player)}
                          </span>
                        ) : (
                          stat.get(player)
                        )}
                      </div>
                      <div className="text-[9.5px] uppercase font-medium text-muted-foreground/75 tracking-wider mt-0.5">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSelect}
                  className="w-full mt-2 h-7.5 rounded-full text-xs font-medium border-border/50 bg-foreground/[0.02] dark:bg-white/[0.03] hover:bg-muted/70 active:scale-[0.98] transition-all"
                >
                  View Player Profile
                </Button>
              </AccordionContent>
            )}
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: Readonly<{ label: string; value: string | number; highlight?: boolean }>) {
  return (
    <div className="bg-muted rounded p-2 sm:p-3">
      <div className="eyebrow-xs text-foreground-dim mb-1 sm:mb-1.5">
        {label}
      </div>
      <div
        className={`font-mono font-semibold text-sm sm:text-lg ${highlight ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}

export function PlayersTable({ players }: Readonly<{ players: EnrichedPlayer[] }>) {
  "use no memo";

  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<string>("ALL");
  const [availFilter, setAvailFilter] = useState<"all" | "available">("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "total_points", desc: true },
  ]);
  const [selected, setSelected] = useState<EnrichedPlayer | null>(null);
  const lastSelected = useRef(selected);
  if (selected) lastSelected.current = selected;
  const displayPlayer = selected ?? lastSelected.current;
  const [dialogImgLoaded, setDialogImgLoaded] = useState(false);
  const [dialogImgError, setDialogImgError] = useState(false);
  const [dialogCrestLoaded, setDialogCrestLoaded] = useState(false);
  const [dialogCrestError, setDialogCrestError] = useState(false);
  const [colVisibility, setColVisibility] =
    useState<VisibilityState>(DEFAULT_VISIBLE);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [visibleMobileStats, setVisibleMobileStats] = useState<string[]>(DEFAULT_MOBILE_STATS);
  const [mobileStatsDrawerOpen, setMobileStatsDrawerOpen] = useState(false);
  const [mobileSortFilterDrawerOpen, setMobileSortFilterDrawerOpen] = useState(false);

  const currentSortId = sorting[0]?.id ?? "total_points";
  const currentSortDesc = sorting[0]?.desc ?? true;
  const currentSortLabel =
    MOBILE_SORT_OPTIONS.find((s) => s.id === currentSortId)?.label ?? "Points";
  const isFiltered = Boolean(minPrice || maxPrice || availFilter === "available");
  const reduceMotion = useReducedMotion();

  /* Sticky chrome stack. The nav is h-14 (56px) and hosts the filter bar at
     top-14; the bar wraps to several rows on narrow desktops, so its height
     is measured instead of assumed. The header docks flush to the bar's
     bottom edge — no gap, or a slice of the row scrolling underneath would
     show through between the two chrome layers (the bar drops its
     scroll-edge fade on md+ for the same reason).
     The initial value matches the one-row desktop bar for first paint. */
  const barRef = useRef<HTMLDivElement>(null);
  const [headerTop, setHeaderTop] = useState(120);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const sync = () => {
      setHeaderTop(bar.getBoundingClientRect().height + 56);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  const filtered = useMemo(() => {
    const minP = minPrice ? parseFloat(minPrice) : null;
    const maxP = maxPrice ? parseFloat(maxPrice) : null;
    return players.filter((p) => {
      if (posFilter !== "ALL" && p.position !== posFilter) return false;
      if (
        availFilter === "available" &&
        p.chance_of_playing_next_round !== null &&
        p.chance_of_playing_next_round < 75
      )
        return false;
      if (minP !== null && p.price < minP) return false;
      if (maxP !== null && p.price > maxP) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.web_name.toLowerCase().includes(q) &&
          !p.team_short.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [players, posFilter, availFilter, search, minPrice, maxPrice]);

  const resolvedMobileStats = useMemo(
    () => MOBILE_STAT_OPTIONS.filter((s) => visibleMobileStats.includes(s.key)),
    [visibleMobileStats],
  );

  const mobileRemainingStats = useMemo(
    () => MOBILE_STAT_OPTIONS.filter((s) => !visibleMobileStats.includes(s.key)),
    [visibleMobileStats],
  );

  const columns = useMemo<ColumnDef<EnrichedPlayer>[]>(
    () => [
      {
        id: "name",
        header: "Player",
        accessorFn: (r) => r.web_name,
        enableHiding: false,
        cell: ({ row }) => (
          <button
            className="text-left hover:text-primary transition-colors underline-offset-2 hover:underline cursor-pointer"
            onClick={() => setSelected(row.original)}
          >
            <div className="font-medium text-foreground">
              {row.original.web_name}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.team_short}
            </div>
          </button>
        ),
      },
      {
        id: "position",
        header: "Position",
        accessorFn: (r) => r.position,
        enableHiding: false,
        cell: ({ getValue }) => (
          <Badge
            variant="outline"
            className={`text-[0.625rem] font-bold ${POSITION_COLORS[getValue() as string]}`}
          >
            {getValue() as string}
          </Badge>
        ),
      },
      {
        id: "price",
        header: "Price",
        accessorFn: (r) => r.price,
        cell: ({ getValue }) => (
          <span className="font-mono text-muted-foreground">
            £{(getValue() as number).toFixed(1)}m
          </span>
        ),
      },
      {
        id: "total_points",
        header: "Pts",
        accessorFn: (r) => r.total_points,
        cell: ({ getValue }) => (
          <span className="font-mono font-semibold">
            {getValue() as number}
          </span>
        ),
      },
      {
        id: "points_per_game",
        header: "PPG",
        accessorFn: (r) => parseFloat(r.points_per_game),
        cell: ({ getValue }) => (
          <span className="font-mono">{(getValue() as number).toFixed(1)}</span>
        ),
      },
      {
        id: "selected_by_percent",
        header: "Own %",
        accessorFn: (r) => parseFloat(r.selected_by_percent),
        cell: ({ getValue }) => (
          <span className="font-mono text-muted-foreground">
            {(getValue() as number).toFixed(1)}%
          </span>
        ),
      },
      {
        id: "form",
        header: "Form",
        accessorFn: (r) => parseFloat(r.form),
        cell: ({ getValue }) => (
          <span className="font-mono font-semibold text-emerald-700 dark:text-[#00e478]">
            {(getValue() as number).toFixed(1)}
          </span>
        ),
      },
      {
        id: "ict_index",
        header: "ICT",
        accessorFn: (r) => parseFloat(r.ict_index),
        cell: ({ getValue }) => (
          <span className="font-mono">{(getValue() as number).toFixed(1)}</span>
        ),
      },
      {
        id: "influence",
        header: "Inf",
        accessorFn: (r) => parseFloat(r.influence),
        cell: ({ getValue }) => (
          <span className="font-mono">{(getValue() as number).toFixed(1)}</span>
        ),
      },
      {
        id: "creativity",
        header: "Cre",
        accessorFn: (r) => parseFloat(r.creativity),
        cell: ({ getValue }) => (
          <span className="font-mono">{(getValue() as number).toFixed(1)}</span>
        ),
      },
      {
        id: "threat",
        header: "Thr",
        accessorFn: (r) => parseFloat(r.threat),
        cell: ({ getValue }) => (
          <span className="font-mono">{(getValue() as number).toFixed(1)}</span>
        ),
      },
      {
        id: "xg",
        header: "xG",
        accessorFn: (r) => parseFloat(r.expected_goals),
        cell: ({ getValue }) => (
          <span className="font-mono font-medium text-sky-700 dark:text-sky-400">
            {(getValue() as number).toFixed(2)}
          </span>
        ),
      },
      {
        id: "xa",
        header: "xA",
        accessorFn: (r) => parseFloat(r.expected_assists),
        cell: ({ getValue }) => (
          <span className="font-mono font-medium text-sky-700 dark:text-sky-400">
            {(getValue() as number).toFixed(2)}
          </span>
        ),
      },
      {
        id: "xgi",
        header: "xGI",
        accessorFn: (r) => parseFloat(r.expected_goal_involvements),
        cell: ({ getValue }) => (
          <span className="font-mono font-medium text-sky-700 dark:text-sky-400">
            {(getValue() as number).toFixed(2)}
          </span>
        ),
      },
      {
        id: "xgc",
        header: "xGC",
        accessorFn: (r) => parseFloat(r.expected_goals_conceded),
        cell: ({ getValue }) => (
          <span className="font-mono font-medium text-sky-700 dark:text-sky-400">
            {(getValue() as number).toFixed(2)}
          </span>
        ),
      },
      {
        id: "goals_scored",
        header: "G",
        accessorFn: (r) => r.goals_scored,
        cell: ({ getValue }) => (
          <span className="font-mono">{getValue() as number}</span>
        ),
      },
      {
        id: "assists",
        header: "A",
        accessorFn: (r) => r.assists,
        cell: ({ getValue }) => (
          <span className="font-mono">{getValue() as number}</span>
        ),
      },
      {
        id: "clean_sheets",
        header: "CS",
        accessorFn: (r) => r.clean_sheets,
        cell: ({ getValue }) => (
          <span className="font-mono">{getValue() as number}</span>
        ),
      },
      {
        id: "minutes",
        header: "Mins",
        accessorFn: (r) => r.minutes,
        cell: ({ getValue }) => (
          <span className="font-mono text-muted-foreground">
            {getValue() as number}
          </span>
        ),
      },
      {
        id: "bonus",
        header: "Bon",
        accessorFn: (r) => r.bonus,
        cell: ({ getValue }) => (
          <span className="font-mono">{getValue() as number}</span>
        ),
      },
      {
        id: "bps",
        header: "BPS",
        accessorFn: (r) => r.bps,
        cell: ({ getValue }) => (
          <span className="font-mono">{getValue() as number}</span>
        ),
      },
      {
        id: "yellow_cards",
        header: "YC",
        accessorFn: (r) => r.yellow_cards,
        cell: ({ getValue }) => (
          <span className="font-mono text-amber-700 dark:text-yellow-400">
            {getValue() as number}
          </span>
        ),
      },
      {
        id: "red_cards",
        header: "RC",
        accessorFn: (r) => r.red_cards,
        cell: ({ getValue }) => (
          <span className="font-mono text-rose-700 dark:text-red-400">{getValue() as number}</span>
        ),
      },
      {
        id: "transfers_in_event",
        header: "GW In",
        accessorFn: (r) => r.transfers_in_event,
        cell: ({ getValue }) => (
          <span className="font-mono text-emerald-700 dark:text-emerald-400">
            +{(getValue() as number).toLocaleString()}
          </span>
        ),
      },
      {
        id: "transfers_out_event",
        header: "GW Out",
        accessorFn: (r) => r.transfers_out_event,
        cell: ({ getValue }) => (
          <span className="font-mono text-rose-700 dark:text-rose-400">
            -{(getValue() as number).toLocaleString()}
          </span>
        ),
      },
      {
        id: "avg_fdr_next5",
        header: "FDR ×5",
        accessorFn: (r) => r.avg_fdr_next5,
        cell: ({ row }) => (
          <FdrCell
            avgFdr={row.original.avg_fdr_next5}
            nextFixtures={row.original.next_fixtures}
          />
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (r) => r.status,
        cell: ({ row }) => {
          return (
            <StatusChip
              status={row.original.status}
              chance={row.original.chance_of_playing_next_round}
            />
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnVisibility: colVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => String(row.id),
    initialState: {
      pagination: { pageSize: PLAYERS_PAGE_SIZE },
    },
  });



  return (
    <GoogleSheetsProvider>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 pb-6">
        {/* Page header — tight tracking on the headline against a tracked
            micro-caps eyebrow for optical contrast */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-4 sm:pt-6 pb-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Players
          </h1>
          <span className="eyebrow-xs text-foreground-dim">
            {players.length} in database
          </span>
        </div>

        {/* Sticky glass filter bar — content blurs beneath it on scroll.
            On mobile the gradient scroll-edge (not a hard border) fades cards
            into the floating chrome. From md up the table's own sticky header
            docks flush to this bar and becomes that edge, so the fade is
            switched off — otherwise it would tint the header's top band. */}
        <div
          ref={barRef}
          data-frost="background"
          className="sticky top-14 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 mb-4 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65 after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-gradient-to-b after:from-background/70 after:to-transparent after:pointer-events-none md:after:hidden flex flex-wrap items-start sm:items-center gap-2 sm:gap-3"
        >
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search player or team…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-8 rounded-full bg-muted/60 border-border/50 text-foreground placeholder:text-muted-foreground/70 text-xs sm:text-sm focus-visible:ring-primary/25"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="-mx-1.5 flex gap-1 items-center overflow-x-auto overflow-y-hidden w-[calc(100%_+_12px)] sm:w-auto px-1.5 py-1 scrollbar-none">
            {["ALL", "GKP", "DEF", "MID", "FWD"].map((pos) => (
              <Button
                key={pos}
                size="sm"
                variant={posFilter === pos ? "default" : "outline"}
                aria-pressed={posFilter === pos}
                className={cn(
                  "press shrink-0 h-8 rounded-full px-3 text-xs font-medium hit-y transition-all",
                  posFilter === pos
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "border-border/60 bg-background/50 text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
                onClick={() => setPosFilter(pos)}
              >
                {pos}
              </Button>
            ))}
            <div className="sm:hidden flex items-center gap-1 ml-auto">
              <Button
                size="sm"
                variant={availFilter === "available" ? "default" : "outline"}
                aria-pressed={availFilter === "available"}
                className={cn(
                  "press shrink-0 h-8 rounded-full px-3 text-xs font-medium hit-y transition-all",
                  availFilter === "available"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "border-border/60 bg-background/50 text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
                onClick={() =>
                  setAvailFilter((v) => (v === "all" ? "available" : "all"))
                }
              >
                Available
              </Button>
            </div>
          </div>

          <div className="hidden sm:flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              size="sm"
              variant={availFilter === "available" ? "default" : "outline"}
              aria-pressed={availFilter === "available"}
              className={cn(
                "press shrink-0 h-8 hit-y",
                availFilter === "available"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
              onClick={() =>
                setAvailFilter((v) => (v === "all" ? "available" : "all"))
              }
            >
              Available only
            </Button>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-foreground-dim">£</span>
              <Input
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-14 sm:w-16 h-8 bg-muted border-border text-foreground placeholder:text-foreground-dim text-xs"
              />
              <span className="text-xs text-foreground-dim">–</span>
              <Input
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-14 sm:w-16 h-8 bg-muted border-border text-foreground placeholder:text-foreground-dim text-xs"
              />
              <span className="text-xs text-foreground-dim">m</span>
            </div>
          </div>

          <div
            ref={pickerRef}
            className="relative hidden sm:flex items-center gap-3 ml-auto"
          >
            <span className="text-xs text-foreground-dim font-medium min-w-[10ch] inline-flex items-center justify-end gap-1">
              {reduceMotion ? (
                <span className="font-semibold tabular-nums">
                  {filtered.length}
                </span>
              ) : (
                <Counter
                  value={filtered.length}
                  fontSize={13}
                  fontWeight={600}
                  gap={0}
                  horizontalPadding={0}
                  gradientHeight={4}
                  gradientFrom="transparent"
                  places={String(filtered.length)
                    .split("")
                    .map((_, i, a) => 10 ** (a.length - i - 1))}
                />
              )}
              players
            </span>
            <RefreshFplDataButton />
            <ExportSheetsButton
              players={filtered}
              colVisibility={colVisibility}
              posFilter={posFilter}
            />
            <Button
              size="sm"
              variant="outline"
              className="press border-border text-muted-foreground hover:text-foreground hover:bg-secondary h-8"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((o) => !o)}
            >
              Columns{" "}
              <ChevronDown
                className={cn(
                  "w-3 h-3 inline transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  pickerOpen && "rotate-180",
                )}
              />
            </Button>
            <AnimatePresence>
              {pickerOpen && (
                <motion.div
                  className="absolute right-0 top-full mt-1 z-50 origin-top-right"
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, scale: 0.96, filter: "blur(4px)" }
                  }
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, scale: 0.97, filter: "blur(4px)" }
                  }
                  transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                >
                  <ColumnPickerContent
                    colVisibility={colVisibility}
                    setColVisibility={setColVisibility}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="sm:hidden flex items-center justify-between gap-2 mb-3">
          <span className="text-xs text-foreground-dim font-medium whitespace-nowrap">
            {filtered.length} players
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {/* Mobile Quick Sort Button */}
            <Button
              size="sm"
              variant="outline"
              className="press h-7.5 px-2.5 rounded-full border-border/60 text-xs font-medium bg-background/50 hover:bg-muted/80 backdrop-blur-xs flex items-center gap-1 shrink-0"
              onClick={() => setMobileSortFilterDrawerOpen(true)}
            >
              <ArrowUpDown className="w-3 h-3 text-primary" />
              <span className="truncate max-w-[85px]">{currentSortLabel}</span>
              <span className="text-[10px] text-muted-foreground">{currentSortDesc ? "↓" : "↑"}</span>
            </Button>

            {/* Mobile Filter Button */}
            <Button
              size="sm"
              variant={isFiltered ? "default" : "outline"}
              className={cn(
                "press h-7.5 px-2.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1",
                isFiltered
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "border-border/60 bg-background/50 hover:bg-muted/80 backdrop-blur-xs text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setMobileSortFilterDrawerOpen(true)}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Filter</span>
              {isFiltered && <span className="size-1.5 rounded-full bg-white ml-0.5" />}
            </Button>

            {/* Visible Stats Button */}
            <Button
              size="icon"
              variant="outline"
              className="press h-7.5 w-7.5 rounded-full border-border/60 bg-background/50 hover:bg-muted/80 backdrop-blur-xs text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setMobileStatsDrawerOpen(true)}
              title="Customize visible stats"
            >
              <Columns2 className="w-3.5 h-3.5" />
            </Button>

            {/* Export */}
            <ExportSheetsButton
              players={filtered}
              colVisibility={colVisibility}
              posFilter={posFilter}
              direction="bottom"
            />
          </div>
        </div>

        {/* Desktop table. The card clips for its rounded corners (and contains
            the .rise entrance's 8px translate) with overflow-clip rather than
            overflow-hidden: hidden/auto would make this a scroll container,
            and the sticky header would then be pinned to a box that never
            scrolls instead of to the page.

            The card has no top border: the header cells carry the frame's top
            hairline themselves (inset shadow, so it travels with them when
            stuck). A card border-top would stay behind with the scrolled page
            and the frame would read open above the floating header; keeping
            both would double the line at rest. */}
        <div className="hidden md:block rounded-lg border border-border border-t-0 shadow-xs overflow-clip">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-card">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ top: headerTop }}
                      className={cn(
                        "sticky z-20 bg-card eyebrow group px-4 py-3 text-left text-foreground-dim cursor-pointer select-none whitespace-nowrap transition-colors duration-150 hover:text-foreground press shadow-[inset_0_1px_0_0_var(--color-border),inset_0_-1px_0_0_var(--color-border)]",
                        header.column.id === "avg_fdr_next5" ? "min-w-[155px] w-[160px]" : header.column.id === "status" ? "min-w-[125px] w-[130px]" : undefined,
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() === "asc" ? (
                          <ArrowUp className="w-3 h-3 text-primary" />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ArrowDown className="w-3 h-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-0 transition-opacity duration-150 group-hover:opacity-50" />
                        )}
                        {header.column.id in COLUMN_TOOLTIPS && (
                          <InfoTip
                            text={COLUMN_TOOLTIPS[header.column.id]!}
                          />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.getVisibleLeafColumns().length}
                    className="px-4 py-12 text-center"
                  >
                    <div className="inline-flex flex-col items-center gap-2 text-foreground-dim animate-in fade-in-0 duration-300">
                      <SearchX className="w-5 h-5 opacity-70" />
                      <span className="text-sm">
                        No players match your filters
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                table
                  .getRowModel()
                  .rows.map((row, i) => (
                    <motion.tr
                      key={row.id}
                      layout={reduceMotion ? false : "position"}
                      initial={reduceMotion ? undefined : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : {
                              layout: ROW_SPRING,
                              opacity: { duration: 0.15 },
                            }
                      }
                      style={{ willChange: "transform" }}
                      className={cn(
                        "border-b border-border/50 transition-colors duration-150 hover:bg-primary/[0.06] transform-gpu",
                        i % 2 === 0 ? "bg-background" : "bg-muted/50",
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            "px-4 py-2.5 whitespace-nowrap",
                            cell.column.id === "avg_fdr_next5" ? "min-w-[155px] w-[160px]" : cell.column.id === "status" ? "min-w-[125px] w-[130px]" : undefined,
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </motion.tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Sort & Filter Drawer */}
        <Drawer
          direction="bottom"
          open={mobileSortFilterDrawerOpen}
          onOpenChange={setMobileSortFilterDrawerOpen}
        >
          <DrawerContent
            data-frost="card"
            className="bg-card/90 dark:bg-[#0c1827]/95 backdrop-blur-3xl border-t border-border/40 dark:border-white/[0.08] text-foreground shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-base font-semibold text-foreground tracking-tight">
                Sort & Filter Players
              </DrawerTitle>
              <DrawerDescription className="text-xs text-foreground-dim">
                Sort by key metrics and filter by price range and availability.
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-5 pb-6 space-y-5">
              {/* Sort Metric Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Sort By
                  </span>
                  {/* Direction toggle */}
                  <div className="flex items-center rounded-full bg-muted/60 p-0.5 border border-border/50 text-[11px]">
                    <button
                      type="button"
                      className={cn(
                        "px-2.5 py-0.5 rounded-full font-medium transition-all",
                        currentSortDesc
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => {
                        setSorting([{ id: currentSortId, desc: true }]);
                      }}
                    >
                      High to Low ↓
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "px-2.5 py-0.5 rounded-full font-medium transition-all",
                        !currentSortDesc
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => {
                        setSorting([{ id: currentSortId, desc: false }]);
                      }}
                    >
                      Low to High ↑
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {MOBILE_SORT_OPTIONS.map((opt) => {
                    const isSelected = currentSortId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSorting([{ id: opt.id, desc: isSelected ? !currentSortDesc : opt.defaultDesc }]);
                        }}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left",
                          isSelected
                            ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                            : "bg-foreground/[0.025] dark:bg-white/[0.035] border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/50",
                        )}
                      >
                        <span>{opt.label}</span>
                        {isSelected && (
                          <span className="text-xs">{currentSortDesc ? "↓" : "↑"}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range Section */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  Price Range (£m)
                </span>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">£</span>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="pl-6 h-9 rounded-xl bg-muted/60 border-border/50 text-xs text-foreground"
                    />
                  </div>
                  <span className="text-muted-foreground text-xs">–</span>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">£</span>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="pl-6 h-9 rounded-xl bg-muted/60 border-border/50 text-xs text-foreground"
                    />
                  </div>
                </div>
                {/* Quick price presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    { label: "All Prices", min: "", max: "" },
                    { label: "≤ £5.0m", min: "", max: "5.0" },
                    { label: "£5.5–£8.0m", min: "5.5", max: "8.0" },
                    { label: "≥ £8.5m", min: "8.5", max: "" },
                  ].map((preset) => {
                    const isMatch = minPrice === preset.min && maxPrice === preset.max;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setMinPrice(preset.min);
                          setMaxPrice(preset.max);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                          isMatch
                            ? "bg-secondary text-primary font-semibold border-border"
                            : "border-border/50 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Availability Section */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  Availability
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAvailFilter("all")}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-medium border transition-all text-center",
                      availFilter === "all"
                        ? "bg-secondary text-primary font-semibold border-border"
                        : "border-border/50 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    All Players
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvailFilter("available")}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-medium border transition-all text-center",
                      availFilter === "available"
                        ? "bg-secondary text-primary font-semibold border-border"
                        : "border-border/50 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Available Only (≥75%)
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-border/40">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full text-xs font-medium border-border/60 hover:bg-muted"
                  onClick={() => {
                    setMinPrice("");
                    setMaxPrice("");
                    setAvailFilter("all");
                    setSorting([{ id: "total_points", desc: true }]);
                  }}
                >
                  Reset Filters
                </Button>
                <DrawerClose asChild>
                  <Button
                    className="flex-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Done
                  </Button>
                </DrawerClose>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Mobile stats drawer */}
        <Drawer
          direction="bottom"
          open={mobileStatsDrawerOpen}
          onOpenChange={setMobileStatsDrawerOpen}
        >
          <DrawerContent
            data-frost="card"
            className="bg-card/90 dark:bg-[#0c1827]/95 backdrop-blur-3xl border-t border-border/40 dark:border-white/[0.08] text-foreground shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <DrawerHeader>
              <DrawerTitle className="text-base font-semibold text-foreground tracking-tight">
                Visible Stats on Cards
              </DrawerTitle>
              <DrawerDescription className="text-xs text-foreground-dim">
                Choose up to 4 primary stats to show on each player card. Tap any card to reveal remaining stats.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-5 pb-6 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {MOBILE_STAT_OPTIONS.map((stat) => {
                  const isActive = visibleMobileStats.includes(stat.key);
                  const atMax = visibleMobileStats.length >= 4 && !isActive;
                  return (
                    <label
                      key={stat.key}
                      htmlFor={`mobile-stat-${stat.key}`}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all",
                        isActive
                          ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                          : atMax
                            ? "opacity-35 bg-foreground/[0.01] border-border/30 cursor-not-allowed text-muted-foreground"
                            : "bg-foreground/[0.025] dark:bg-white/[0.035] border-border/40 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span className="text-xs">{stat.label}</span>
                      <input
                        id={`mobile-stat-${stat.key}`}
                        type="checkbox"
                        className="accent-primary size-4 rounded"
                        checked={isActive}
                        disabled={atMax}
                        onChange={(e) => {
                          setVisibleMobileStats((prev) =>
                            e.target.checked
                              ? [...prev, stat.key]
                              : prev.filter((k) => k !== stat.key),
                          );
                        }}
                      />
                    </label>
                  );
                })}
              </div>
              <div className="pt-2">
                <DrawerClose asChild>
                  <Button
                    className="w-full rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Done ({visibleMobileStats.length}/4 selected)
                  </Button>
                </DrawerClose>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Mobile card list */}
        <div className="md:hidden space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-foreground-dim text-sm inline-flex w-full flex-col items-center gap-2 animate-in fade-in-0 duration-300">
              <SearchX className="w-5 h-5 opacity-70" />
              No players match your filters
            </div>
          ) : (
            table
              .getRowModel()
              .rows.map((row) => (
                <motion.div
                  key={row.id}
                  layout={reduceMotion ? false : "position"}
                  initial={reduceMotion ? undefined : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : {
                          layout: ROW_SPRING,
                          opacity: { duration: 0.15 },
                        }
                  }
                  style={{ willChange: "transform" }}
                  className="transform-gpu"
                >
                  <PlayerCard
                    player={row.original}
                    onSelect={() => setSelected(row.original)}
                    visibleStats={resolvedMobileStats}
                    remainingStats={mobileRemainingStats}
                  />
                </motion.div>
              ))
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-foreground-dim">
          <span className="text-xs sm:text-sm">
            Showing{" "}
            {table.getState().pagination.pageIndex * PLAYERS_PAGE_SIZE + 1}–
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                PLAYERS_PAGE_SIZE,
              filtered.length,
            )}{" "}
            of {filtered.length}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="press h-8 hit-y border-border text-muted-foreground hover:bg-secondary text-xs sm:text-sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="press h-8 hit-y border-border text-muted-foreground hover:bg-secondary text-xs sm:text-sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </Button>
          </div>
        </div>

        {/* Player detail modal */}
        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent data-frost="card" className="bg-card/85 backdrop-blur-xl border-border text-foreground shadow-2xl duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-open:blur-in-3 data-closed:blur-out-3 w-[calc(100%-2rem)] max-w-3xl mx-auto">
            {displayPlayer && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-10 sm:h-14 sm:w-12 shrink-0">
                      {!dialogImgLoaded && !dialogImgError && (
                        <div className="absolute inset-0 rounded bg-muted animate-pulse" />
                      )}
                      {dialogImgError ? (
                        <img
                          src="/player-fallback.png"
                          alt={displayPlayer.web_name}
                          width={1024}
                          height={1024}
                          className="h-full w-full rounded object-cover bg-muted"
                        />
                      ) : (
                        <img
                          src={displayPlayer.image_url}
                          alt={displayPlayer.web_name}
                          width={110}
                          height={140}
                          className={`h-full w-full rounded object-cover bg-muted ${dialogImgLoaded ? "" : "opacity-0 absolute inset-0"}`}
                          loading="lazy"
                          onLoad={() => {
                            setDialogImgLoaded(true);
                            setDialogImgError(false);
                          }}
                          onError={() => {
                            setDialogImgLoaded(false);
                            setDialogImgError(true);
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-lg sm:text-xl font-bold truncate">
                        {displayPlayer.web_name}
                      </DialogTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {POSITION_LABELS[displayPlayer.position] ??
                          displayPlayer.position}
                        {" · "}
                        {displayPlayer.team_name}
                        {" · "}
                        <span className="text-primary">
                          £{displayPlayer.price.toFixed(1)}m
                        </span>
                      </p>
                    </div>
                    {displayPlayer.team_crest_url &&
                      (dialogCrestError ? (
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded bg-muted flex items-center justify-center mr-4 sm:mr-8 shrink-0">
                          <span className="text-[0.625rem] sm:text-xs font-bold text-muted-foreground">
                            {displayPlayer.team_short?.charAt(0) ?? "?"}
                          </span>
                        </div>
                      ) : (
                        <img
                          src={displayPlayer.team_crest_url}
                          alt={displayPlayer.team_name}
                          className={`h-6 w-6 sm:h-8 sm:w-8 object-contain mr-4 sm:mr-8 shrink-0 ${dialogCrestLoaded ? "" : "opacity-0 absolute"}`}
                          loading="lazy"
                          onLoad={() => {
                            setDialogCrestLoaded(true);
                            setDialogCrestError(false);
                          }}
                          onError={() => {
                            setDialogCrestLoaded(true);
                            setDialogCrestError(true);
                          }}
                        />
                      ))}
                    {!dialogCrestLoaded &&
                      !dialogCrestError &&
                      displayPlayer.team_crest_url && (
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded bg-muted animate-pulse mr-4 sm:mr-8 shrink-0" />
                      )}
                  </div>
                </DialogHeader>

                <div className="stagger grid grid-cols-2 sm:grid-cols-4 gap-2 py-4">
                  <Stat
                    label="Price"
                    value={`£${displayPlayer.price.toFixed(1)}m`}
                  />
                  <Stat
                    label="Total Points"
                    value={displayPlayer.total_points}
                  />
                  <Stat label="PPG" value={displayPlayer.points_per_game} />
                  <Stat label="Form" value={displayPlayer.form} highlight />
                  <Stat label="ICT Index" value={displayPlayer.ict_index} />
                  <Stat
                    label="xGI"
                    value={parseFloat(
                      displayPlayer.expected_goal_involvements,
                    ).toFixed(2)}
                  />
                  <Stat label="Goals" value={displayPlayer.goals_scored} />
                  <Stat label="Assists" value={displayPlayer.assists} />
                  <Stat
                    label="Clean Sheets"
                    value={displayPlayer.clean_sheets}
                  />
                  <Stat label="Minutes" value={displayPlayer.minutes} />
                  <Stat label="Bonus" value={displayPlayer.bonus} />
                  <Stat label="Starts" value={displayPlayer.starts} />
                  <Stat
                    label="Influence"
                    value={parseFloat(displayPlayer.influence).toFixed(1)}
                  />
                  <Stat
                    label="Creativity"
                    value={parseFloat(displayPlayer.creativity).toFixed(1)}
                  />
                  <Stat
                    label="Threat"
                    value={parseFloat(displayPlayer.threat).toFixed(1)}
                  />
                  <Stat
                    label="xG"
                    value={parseFloat(displayPlayer.expected_goals).toFixed(2)}
                  />
                  <Stat
                    label="xA"
                    value={parseFloat(displayPlayer.expected_assists).toFixed(
                      2,
                    )}
                  />
                  <Stat
                    label="xGC"
                    value={parseFloat(
                      displayPlayer.expected_goals_conceded,
                    ).toFixed(2)}
                  />
                  <Stat label="BPS" value={displayPlayer.bps} />
                  <Stat
                    label="Avg FDR ×5"
                    value={displayPlayer.avg_fdr_next5.toFixed(1)}
                  />
                </div>

                {displayPlayer.next_fixtures && displayPlayer.next_fixtures.length > 0 && (
                  <div className="bg-muted/70 rounded-xl p-3 mb-3 border border-border/40">
                    <div className="eyebrow-xs text-foreground-dim mb-2">
                      Upcoming 5 Fixtures
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {displayPlayer.next_fixtures.slice(0, 5).map((fix, idx) => {
                        const fixTheme = getFdrTheme(fix.difficulty);
                        return (
                          <div
                            key={`${fix.event ?? idx}-${fix.opponent_short}`}
                            className="flex flex-col items-center justify-center py-1.5 rounded-lg border border-black/10 dark:border-white/10 shadow-xs select-none"
                            style={{
                              backgroundColor: fixTheme.bg,
                              color: fixTheme.text,
                            }}
                            title={`GW${fix.event ?? "?"}: vs ${fix.opponent_short} (${fix.is_home ? "Home" : "Away"}) · Difficulty ${fix.difficulty}`}
                          >
                            <span className="text-[10px] font-bold tracking-tight">
                              {fix.opponent_short}
                            </span>
                            <span className="text-[8px] font-semibold opacity-90 mt-0.5">
                              {fix.is_home ? "H" : "A"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {displayPlayer.news && (
                  <p className="text-xs text-orange-400 bg-orange-950/30 rounded p-2 mb-2">
                    {displayPlayer.news}
                  </p>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </GoogleSheetsProvider>
  );
}
