"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info, SlidersHorizontal, ClipboardList, X, ChevronUp } from "lucide-react";
import { applyIndexToPlayers } from "@/lib/index-calculator";
import { parseShortlist, type ShortlistMatch } from "@/lib/player-shortlist";
import { cn } from "@/lib/utils";
import type {
  EnrichedPlayer,
  WeightConfig,
  IndexedPlayer,
} from "@/lib/fpl-types";

const STAT_GROUPS: Array<{
  group: string;
  stats: Array<{ key: keyof WeightConfig; label: string; inverted?: boolean }>;
}> = [
  {
    group: "Core",
    stats: [
      { key: "total_points", label: "Total Points" },
      { key: "points_per_game", label: "Points Per Game" },
      { key: "form", label: "Form (Last 5)" },
      { key: "value", label: "Value for Money" },
    ],
  },
  {
    group: "ICT",
    stats: [
      { key: "ict_index", label: "ICT Index" },
      { key: "influence", label: "Influence" },
      { key: "creativity", label: "Creativity" },
      { key: "threat", label: "Threat" },
    ],
  },
  {
    group: "Expected Stats",
    stats: [
      { key: "xg", label: "xG" },
      { key: "xa", label: "xA" },
      { key: "xgi", label: "xGI" },
      { key: "xgc", label: "xGC", inverted: true },
    ],
  },
  {
    group: "Season Stats",
    stats: [
      { key: "goals_scored", label: "Goals" },
      { key: "assists", label: "Assists" },
      { key: "clean_sheets", label: "Clean Sheets" },
      { key: "goals_conceded", label: "Goals Conceded", inverted: true },
      { key: "bonus", label: "Bonus" },
      { key: "bps", label: "BPS" },
      { key: "minutes", label: "Minutes" },
    ],
  },
  {
    group: "Other",
    stats: [
      { key: "selected_by_percent", label: "Ownership %" },
      { key: "avg_fdr_next5", label: "Fixture Diff.", inverted: true },
    ],
  },
];

const ALL_STATS = STAT_GROUPS.flatMap((g) => g.stats);
const ALL_STAT_KEYS = ALL_STATS.map((s) => s.key);

const METRIC_TOOLTIPS: Partial<Record<keyof WeightConfig, string>> = {
  total_points: "Total FPL points scored this season",
  points_per_game: "Average FPL points per gameweek played",
  form: "Average points over the last 5 gameweeks",
  value: "Total points divided by FPL price — efficiency metric",
  ict_index: "Combined Influence, Creativity & Threat score",
  influence: "Player's direct impact on match result",
  creativity: "Chance creation and assist potential",
  threat: "Goal scoring threat score",
  xg: "Expected Goals — season total",
  xa: "Expected Assists — season total",
  xgi: "Expected Goal Involvements (xG + xA) — season total",
  xgc: "Expected Goals Conceded — lower is better, rewards solid defences",
  goals_scored: "Goals scored this season",
  assists: "Assists this season",
  clean_sheets: "Clean sheets this season",
  goals_conceded:
    "Goals conceded this season — lower is better, rewards tight defences",
  bonus: "Bonus points earned this season",
  bps: "Raw Bonus Points System score this season",
  minutes: "Minutes played this season — rewards consistent starters",
  selected_by_percent:
    "Owned by % of FPL managers — high ownership = popular/reliable pick",
  avg_fdr_next5:
    "Average Fixture Difficulty Rating over next 5 GWs — lower means easier run of fixtures",
};

// ─── Presets ──────────────────────────────────────────────────────────────────

type Preset = {
  label: string;
  pos: string;
  active: Array<keyof WeightConfig>;
  weights: Partial<Record<keyof WeightConfig, number>>;
};

const DEFAULT_PRESET: Preset = {
  label: "All",
  pos: "ALL",
  active: [
    "total_points",
    "form",
    "ict_index",
    "goals_scored",
    "assists",
    "clean_sheets",
    "bonus",
    "minutes",
    "xgi",
  ],
  weights: {
    total_points: 5,
    form: 5,
    ict_index: 5,
    goals_scored: 5,
    assists: 5,
    clean_sheets: 5,
    bonus: 5,
    minutes: 5,
    xgi: 5,
  },
};

const PRESETS: Preset[] = [
  DEFAULT_PRESET,
  {
    label: "GKP",
    pos: "GKP",
    active: [
      "total_points",
      "form",
      "clean_sheets",
      "goals_conceded",
      "bonus",
      "minutes",
      "xgc",
    ],
    weights: {
      total_points: 7,
      form: 6,
      clean_sheets: 9,
      goals_conceded: 8,
      bonus: 4,
      minutes: 5,
      xgc: 7,
    },
  },
  {
    label: "DEF",
    pos: "DEF",
    active: [
      "total_points",
      "form",
      "clean_sheets",
      "goals_conceded",
      "goals_scored",
      "assists",
      "bonus",
      "minutes",
      "xgi",
      "avg_fdr_next5",
    ],
    weights: {
      total_points: 7,
      form: 6,
      clean_sheets: 8,
      goals_conceded: 6,
      goals_scored: 5,
      assists: 5,
      bonus: 4,
      minutes: 5,
      xgi: 5,
      avg_fdr_next5: 5,
    },
  },
  {
    label: "MID",
    pos: "MID",
    active: [
      "total_points",
      "form",
      "ict_index",
      "goals_scored",
      "assists",
      "xgi",
      "creativity",
      "bonus",
      "minutes",
      "avg_fdr_next5",
    ],
    weights: {
      total_points: 7,
      form: 7,
      ict_index: 5,
      goals_scored: 7,
      assists: 7,
      xgi: 8,
      creativity: 6,
      bonus: 4,
      minutes: 5,
      avg_fdr_next5: 5,
    },
  },
  {
    label: "FWD",
    pos: "FWD",
    active: [
      "total_points",
      "form",
      "goals_scored",
      "assists",
      "xg",
      "xgi",
      "threat",
      "bonus",
      "minutes",
      "avg_fdr_next5",
    ],
    weights: {
      total_points: 7,
      form: 7,
      goals_scored: 9,
      assists: 6,
      xg: 8,
      xgi: 7,
      threat: 6,
      bonus: 4,
      minutes: 5,
      avg_fdr_next5: 5,
    },
  },
];

const DEFAULT_WEIGHTS: Record<keyof WeightConfig, number> = Object.fromEntries(
  ALL_STAT_KEYS.map((k) => [k, 1]),
) as Record<keyof WeightConfig, number>;

// ─── Spring presets ────────────────────────────────────────────────────────────
const SPRING_DEFAULT = { type: "spring" as const, damping: 28, stiffness: 380, mass: 0.8 };
const SPRING_DRAWER = { type: "spring" as const, damping: 32, stiffness: 320, mass: 0.9 };
// Apple §4: Critically damped (bounce: 0), snappy 0.26s response for reordering without lag
const SPRING_ROW = { type: "spring" as const, bounce: 0, duration: 0.26 };

function InfoTip({ text }: Readonly<{ text: string }>) {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const shouldReduce = useReducedMotion();

  return (
    <>
      <span
        ref={ref}
        role="img"
        aria-label="More information"
        className="inline-flex items-center"
        onMouseEnter={() => {
          const r = ref.current?.getBoundingClientRect();
          if (r) setCoords({ x: r.left + r.width / 2, y: r.top });
        }}
        onMouseLeave={() => setCoords(null)}
      >
        <Info className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-default shrink-0" />
      </span>
      {coords &&
        createPortal(
          <motion.div
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 4 }}
            animate={shouldReduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 4 }}
            transition={SPRING_DEFAULT}
            style={{
              position: "fixed",
              left: coords.x,
              top: coords.y - 8,
              transform: "translate(-50%, -100%)",
              zIndex: 9999,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
            className="w-52 rounded-lg bg-popover/90 backdrop-blur-xl border border-border/60 px-2.5 py-2 text-[11px] text-popover-foreground whitespace-normal text-center pointer-events-none"
          >
            {text}
          </motion.div>,
          document.body,
        )}
    </>
  );
}

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-400",
  DEF: "bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400",
  MID: "bg-blue-500/15 border border-blue-500/25 text-blue-700 dark:text-blue-400",
  FWD: "bg-red-500/15 border border-red-500/25 text-red-700 dark:text-red-400",
};

type ShortlistState = {
  /** Matched player ids — the ranking pool when a shortlist is active. */
  ids: Set<number>;
  /** Pasted entries that matched nothing, surfaced as a dismissible notice. */
  unmatched: string[];
  /** Raw text as it was applied, so reopening the dialog restores it. */
  raw: string;
};

export function IndexBuilderClient({
  players,
}: Readonly<{ players: EnrichedPlayer[] }>) {
  const shouldReduce = useReducedMotion();

  const [weights, setWeights] = useState<Record<keyof WeightConfig, number>>(
    () => ({
      ...DEFAULT_WEIGHTS,
      ...DEFAULT_PRESET.weights,
    }),
  );
  const [activeStats, setActiveStats] = useState<Set<keyof WeightConfig>>(
    new Set(DEFAULT_PRESET.active),
  );
  const [posFilter, setPosFilter] = useState("ALL");
  const [metricPickerOpen, setMetricPickerOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string>("All");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 10;
  const pickerRef = useRef<HTMLDivElement>(null);

  const [shortlistOpen, setShortlistOpen] = useState(false);
  const [shortlistDraft, setShortlistDraft] = useState("");
  const [shortlist, setShortlist] = useState<ShortlistState | null>(null);
  const [shortlistFeedback, setShortlistFeedback] =
    useState<ShortlistMatch | null>(null);

  const shortlistCount = shortlist?.ids.size ?? 0;
  const shortlistActive = shortlistCount > 0;

  // Close metric picker on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setMetricPickerOpen(false);
      }
    }
    if (metricPickerOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [metricPickerOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Build the WeightConfig passed to the scorer: inactive stats get 0
  const effectiveWeights = useMemo<WeightConfig>(() => {
    return Object.fromEntries(
      ALL_STAT_KEYS.map((k) => [k, activeStats.has(k) ? weights[k] : 0]),
    ) as unknown as WeightConfig;
  }, [weights, activeStats]);

  const ranked = useMemo<IndexedPlayer[]>(() => {
    const ids = shortlist?.ids;
    // A pasted shortlist takes precedence over the position filter: scores are
    // normalised across exactly the players that were pasted.
    const shortlistPool =
      ids && ids.size > 0 ? players.filter((p) => ids.has(p.id)) : null;
    const pool =
      shortlistPool ??
      (posFilter === "ALL"
        ? players
        : players.filter((p) => p.position === posFilter));
    const indexed = applyIndexToPlayers(pool, effectiveWeights);
    // The 50 cap keeps the default ranking tidy; a shortlist shows every match.
    return shortlistPool ? indexed : indexed.slice(0, 50);
  }, [players, effectiveWeights, posFilter, shortlist]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(ranked.length / PAGE_SIZE)),
    [ranked.length],
  );

  const displayed = useMemo(
    () => ranked.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE),
    [ranked, pageIndex],
  );

  // Reset to first page when the ranked list changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination when filtered data changes
    setPageIndex(0);
  }, [ranked.length]);

  function setWeight(key: keyof WeightConfig, val: number) {
    setWeights((prev) => ({ ...prev, [key]: val }));
  }

  function toggleStat(key: keyof WeightConfig) {
    setActiveStats((prev) => {
      if (prev.has(key) && prev.size <= 1) return prev;
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function applyPreset(preset: Preset) {
    setActivePreset(preset.label);
    setPosFilter(preset.pos);
    setActiveStats(new Set(preset.active));
    setWeights({ ...DEFAULT_WEIGHTS, ...preset.weights });
  }

  function resetAll() {
    applyPreset(DEFAULT_PRESET);
  }

  function openShortlist() {
    setShortlistDraft(shortlist?.raw ?? "");
    setShortlistFeedback(null);
    setShortlistOpen(true);
  }

  function applyShortlist() {
    const result = parseShortlist(shortlistDraft, players);
    if (result.ids.length === 0) {
      // Stay open so the unmatched entries are visible to the user.
      setShortlistFeedback(result);
      return;
    }
    setShortlist({
      ids: new Set(result.ids),
      unmatched: result.unmatched,
      raw: shortlistDraft,
    });
    setShortlistFeedback(null);
    setShortlistOpen(false);
    setPageIndex(0);
  }

  function clearShortlist() {
    setShortlist(null);
    setShortlistFeedback(null);
    setShortlistDraft("");
    setShortlistOpen(false);
    setPageIndex(0);
  }

  const sidebarContent = (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-foreground tracking-tight">Stat Weighting</h2>
        <motion.button
          onClick={resetAll}
          className="text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-primary/10 active:scale-95"
          whileTap={shouldReduce ? undefined : { scale: 0.95 }}
          transition={SPRING_DEFAULT}
        >
          Reset
        </motion.button>
      </div>

      {/* Presets */}
      <div className="mb-5">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2.5 font-medium">
          Presets
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {PRESETS.map((preset) => (
            <motion.button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              whileTap={shouldReduce ? undefined : { scale: 0.94 }}
              transition={SPRING_DEFAULT}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-all duration-150 font-medium",
                activePreset === preset.label
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border",
              )}
            >
              {preset.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Metric picker toggle */}
      <div ref={pickerRef} className="mb-5">
        <motion.button
          onClick={() => setMetricPickerOpen((o) => !o)}
          whileTap={shouldReduce ? undefined : { scale: 0.98 }}
          transition={SPRING_DEFAULT}
          className="w-full flex items-center justify-between text-xs border border-border/60 rounded-xl px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150"
        >
          <span>Metrics ({activeStats.size} active)</span>
          <motion.span
            animate={{ rotate: metricPickerOpen ? 180 : 0 }}
            transition={SPRING_DEFAULT}
            className="text-muted-foreground opacity-70"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </motion.span>
        </motion.button>

        <AnimatePresence>
          {metricPickerOpen && (
            <motion.div
              initial={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -6 }}
              animate={shouldReduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -6 }}
              transition={SPRING_DEFAULT}
              className="mt-2 border border-border/60 rounded-xl bg-card/80 backdrop-blur-sm p-3.5 shadow-lg"
              style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)" }}
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-0">
                {STAT_GROUPS.map(({ group, stats }) => (
                  <div key={group} className="mb-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 pb-0.5 border-b border-border/40 font-medium">
                      {group}
                    </div>
                    <div className="space-y-1.5">
                      {stats.map(({ key, label, inverted }) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 cursor-pointer text-xs text-foreground hover:text-primary transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="accent-primary shrink-0"
                            checked={activeStats.has(key)}
                            onChange={() => toggleStat(key)}
                          />
                          <span className="leading-tight flex items-center gap-1">
                            {label}
                            {inverted && (
                              <span className="text-[10px] text-muted-foreground">
                                ↓
                              </span>
                            )}
                            {METRIC_TOOLTIPS[key] && (
                              <InfoTip text={METRIC_TOOLTIPS[key]} />
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sliders — only for active stats */}
      <div className="space-y-5">
        {ALL_STATS.filter((s) => activeStats.has(s.key)).map(
          ({ key, label }) => (
            <div key={key}>
              <div className="flex justify-between mb-2">
                <span className="text-xs text-foreground flex items-center gap-1 tracking-tight">
                  {label}
                  {METRIC_TOOLTIPS[key] && (
                    <InfoTip text={METRIC_TOOLTIPS[key]} />
                  )}
                </span>
                <motion.span
                  key={weights[key]}
                  initial={shouldReduce ? undefined : { scale: 1.3, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={SPRING_DEFAULT}
                  className="text-xs font-mono text-primary font-semibold tabular-nums"
                >
                  {weights[key]}
                </motion.span>
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[weights[key]]}
                onValueChange={(v) =>
                  setWeight(key, typeof v === "number" ? v : (v[0] ?? 1))
                }
                className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_[role=slider]]:shadow-sm [&_[role=slider]]:transition-transform [&_[role=slider]]:active:scale-110"
              />
            </div>
          ),
        )}
      </div>
    </>
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 pb-14 lg:pb-6">
      {/* Page header */}
      <div className="mb-5 sm:mb-7">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          Index Builder
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
          Select metrics and adjust weights (1–10) to generate a custom
          performance index for auction valuation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 sm:gap-6">
        {/* Left: Weight sliders — desktop */}
        <aside className="hidden lg:block rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 h-fit shadow-sm"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.06)" }}
        >
          {sidebarContent}
        </aside>

        {/* Right: Rankings */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)" }}
        >
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-border/50 bg-muted/30">
            <h2 className="font-semibold text-sm sm:text-base text-foreground tracking-tight">
              Rankings
            </h2>
            <div className="flex items-center gap-2 sm:gap-3">
              <motion.div whileTap={shouldReduce ? undefined : { scale: 0.96 }} transition={SPRING_DEFAULT}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openShortlist}
                  className={cn(
                    "text-[11px] text-muted-foreground rounded-full border-border/60 transition-all duration-150",
                    shortlistActive &&
                      "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                  )}
                >
                  <ClipboardList className="size-3.5" />
                  {shortlistActive
                    ? `Shortlist · ${shortlistCount}`
                    : "Paste list"}
                </Button>
              </motion.div>
              <span className="text-[11px] sm:text-xs text-muted-foreground">
                {ranked.length} players
              </span>
              <span className="text-[11px] sm:text-xs text-primary font-mono font-semibold">
                Live
              </span>
            </div>
          </div>

          {/* Unmatched names from the active shortlist */}
          <AnimatePresence>
            {shortlist && shortlist.unmatched.length > 0 && (
              <motion.div
                initial={shouldReduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={shouldReduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={SPRING_DEFAULT}
                className="flex items-start gap-2 border-b border-border bg-amber-500/10 px-4 sm:px-5 py-2 text-[11px] text-amber-700 dark:text-amber-400"
              >
                <span className="flex-1 leading-relaxed break-words">
                  {shortlist.unmatched.length === 1
                    ? "1 pasted name matched nothing: "
                    : `${shortlist.unmatched.length} pasted names matched nothing: `}
                  <span className="font-mono">
                    {shortlist.unmatched.slice(0, 6).join(", ")}
                    {shortlist.unmatched.length > 6
                      ? ` +${shortlist.unmatched.length - 6} more`
                      : ""}
                  </span>
                </span>
                <motion.button
                  type="button"
                  aria-label="Dismiss unmatched names notice"
                  onClick={() =>
                    setShortlist((s) => (s ? { ...s, unmatched: [] } : s))
                  }
                  whileTap={shouldReduce ? undefined : { scale: 0.9 }}
                  transition={SPRING_DEFAULT}
                  className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
                >
                  <X className="size-3.5" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto overflow-y-clip">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-muted/60 text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest font-medium w-10">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest font-medium">
                    Player
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest font-medium w-14">
                    Pos
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest font-medium w-16">
                    Pts
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest font-medium">
                    Key Stats
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest font-medium w-20">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    layout={shouldReduce ? false : "position"}
                    initial={shouldReduce ? undefined : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={
                      shouldReduce
                        ? { duration: 0 }
                        : {
                            layout: SPRING_ROW,
                            opacity: { duration: 0.15 },
                          }
                    }
                    style={{ willChange: "transform" }}
                    className={cn(
                      "border-b border-border/30 transition-colors duration-100 transform-gpu",
                      i % 2 === 0 ? "bg-card" : "bg-muted/20",
                      "hover:bg-primary/5",
                    )}
                  >
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {String(pageIndex * PAGE_SIZE + i + 1).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground tracking-tight">
                        {p.web_name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.team_short}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn("text-[10px] rounded-full", POSITION_COLORS[p.position])}
                      >
                        {p.position}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground tabular-nums">
                      {p.total_points}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      xGI{" "}
                      {Number.parseFloat(
                        p.expected_goal_involvements,
                      ).toFixed(2)}{" "}
                      · PPG {p.points_per_game} · ICT{" "}
                      {Number.parseFloat(p.ict_index).toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-bold text-primary tabular-nums">
                        {(p.index_score * 100).toFixed(1)}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="lg:hidden">
            {displayed.map((p, i) => (
              <motion.div
                key={p.id}
                layout={shouldReduce ? false : "position"}
                initial={shouldReduce ? undefined : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={
                  shouldReduce
                    ? { duration: 0 }
                    : {
                        layout: SPRING_ROW,
                        opacity: { duration: 0.15 },
                      }
                }
                style={{ willChange: "transform" }}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-border/30 active:bg-primary/5 transform-gpu"
              >
                <span className="text-xs font-mono text-muted-foreground w-6 shrink-0 tabular-nums">
                  {String(pageIndex * PAGE_SIZE + i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground text-sm truncate tracking-tight">
                    {p.web_name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.team_short} · {p.total_points} pts
                  </div>
                </div>
                <Badge
                  className={cn("text-[10px] shrink-0 rounded-full", POSITION_COLORS[p.position])}
                >
                  {p.position}
                </Badge>
                <span className="font-mono font-bold text-primary text-sm tabular-nums w-14 text-right shrink-0">
                  {(p.index_score * 100).toFixed(1)}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 text-sm text-muted-foreground border-t border-border/50 bg-muted/20">
            <span className="text-xs sm:text-sm">
              Showing {pageIndex * PAGE_SIZE + 1}–
              {Math.min((pageIndex + 1) * PAGE_SIZE, ranked.length)} of{" "}
              {ranked.length}
            </span>
            <div className="flex gap-2">
              <motion.div whileTap={shouldReduce ? undefined : { scale: 0.95 }} transition={SPRING_DEFAULT}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border/60 text-foreground hover:bg-muted text-xs sm:text-sm rounded-full"
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex((p) => p - 1)}
                >
                  Previous
                </Button>
              </motion.div>
              <motion.div whileTap={shouldReduce ? undefined : { scale: 0.95 }} transition={SPRING_DEFAULT}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border/60 text-foreground hover:bg-muted text-xs sm:text-sm rounded-full"
                  disabled={pageIndex >= pageCount - 1}
                  onClick={() => setPageIndex((p) => p + 1)}
                >
                  Next
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Paste-a-list dialog */}
      <Dialog open={shortlistOpen} onOpenChange={setShortlistOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Paste player list</DialogTitle>
            <DialogDescription>
              One player per line, e.g. Acheampong (CHE). The club code in
              brackets is optional and only used to tell same-named players
              apart. Scores are then calculated across the pasted players only.
            </DialogDescription>
          </DialogHeader>

          <textarea
            value={shortlistDraft}
            onChange={(e) => {
              setShortlistDraft(e.target.value);
              setShortlistFeedback(null);
            }}
            aria-label="Player list, one player per line"
            spellCheck={false}
            placeholder={"Acheampong (CHE)\nAffengruber (FUL)\nAjer (BRE)"}
            className="h-56 w-full resize-y rounded-xl border border-input bg-transparent px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />

          <AnimatePresence>
            {shortlistFeedback && shortlistFeedback.ids.length === 0 && (
              <motion.div
                initial={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                transition={SPRING_DEFAULT}
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400"
              >
                <p className="font-medium">
                  Nothing matched — check the spelling or club code.
                </p>
                {shortlistFeedback.unmatched.length > 0 && (
                  <ul className="mt-1.5 max-h-32 list-disc overflow-y-auto pl-4 font-mono">
                    {shortlistFeedback.unmatched.map((entry, i) => (
                      <li key={`${i}-${entry}`}>{entry}</li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <DialogFooter>
            {shortlist && (
              <Button
                type="button"
                variant="destructive"
                onClick={clearShortlist}
              >
                Clear
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShortlistOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={applyShortlist}
              disabled={!shortlistDraft.trim()}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile weight sliders trigger */}
      <motion.button
        className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-card/90 backdrop-blur-xl border border-primary/50 rounded-full px-4 py-2.5 text-xs text-foreground hover:text-primary hover:border-primary shadow-lg transition-colors"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)" }}
        onClick={() => setDrawerOpen(true)}
        whileTap={shouldReduce ? undefined : { scale: 0.96 }}
        transition={SPRING_DEFAULT}
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
        <span>Sliders ({activeStats.size})</span>
        <motion.span
          animate={{ rotate: drawerOpen ? 180 : 0 }}
          transition={SPRING_DEFAULT}
          className="text-primary"
        >
          <ChevronUp className="w-3 h-3" />
        </motion.span>
      </motion.button>

      {/* Mobile weight sliders drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduce ? 0.1 : 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={shouldReduce ? { opacity: 0 } : { y: "100%" }}
              animate={shouldReduce ? { opacity: 1 } : { y: 0 }}
              exit={shouldReduce ? { opacity: 0 } : { y: "100%" }}
              transition={SPRING_DRAWER}
              className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/95 backdrop-blur-3xl rounded-t-2xl border-t border-x border-border/60 max-h-[80vh] overflow-y-auto overscroll-contain"
              style={{ boxShadow: "0 -8px 48px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.08)" }}
            >
              {/* Drawer handle + header */}
              <div className="sticky top-0 bg-card/80 backdrop-blur-xl z-10 rounded-t-2xl border-b border-border/40">
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-9 h-1 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="flex items-center justify-between px-4 pt-1 pb-3">
                  <h3 className="text-sm font-semibold text-foreground tracking-tight">
                    Stat Weighting
                  </h3>
                  <motion.button
                    onClick={() => setDrawerOpen(false)}
                    whileTap={shouldReduce ? undefined : { scale: 0.9 }}
                    transition={SPRING_DEFAULT}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/60 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
              <div className="p-4 pb-8">{sidebarContent}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
