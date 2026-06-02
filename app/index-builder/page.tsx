"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Info, SlidersHorizontal, X } from "lucide-react";
import { applyIndexToPlayers } from "@/lib/index-calculator";
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

function InfoTip({ text }: Readonly<{ text: string }>) {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

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
        <Info className="w-3 h-3 text-[#849585] hover:text-[#b9cbb9] cursor-default shrink-0" />
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
            className="w-52 rounded bg-[#1e2b3b] border border-[#3b4b3d] px-2 py-1.5 text-[11px] text-[#d6e4f9] whitespace-normal text-center shadow-lg pointer-events-none"
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-yellow-500/20 text-yellow-400",
  DEF: "bg-green-500/20 text-green-400",
  MID: "bg-blue-500/20 text-blue-400",
  FWD: "bg-red-500/20 text-red-400",
};

export default function IndexBuilderPage() {
  const [players, setPlayers] = useState<EnrichedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
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
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/fpl/bootstrap")
      .then((r) => r.json())
      .then((d) => {
        setPlayers(d.players ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
    const pool =
      posFilter === "ALL"
        ? players
        : players.filter((p) => p.position === posFilter);
    return applyIndexToPlayers(pool, effectiveWeights).slice(0, 50);
  }, [players, effectiveWeights, posFilter]);

  function setWeight(key: keyof WeightConfig, val: number) {
    setActivePreset("");
    setWeights((prev) => ({ ...prev, [key]: val }));
  }

  function toggleStat(key: keyof WeightConfig) {
    setActivePreset("");
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

  const sidebarContent = (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-[#d6e4f9]">Stat Weighting</h2>
        <button
          onClick={resetAll}
          className="text-xs text-[#849585] hover:text-[#00e478] transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Presets */}
      <div className="mb-4">
        <div className="text-[10px] text-[#849585] uppercase tracking-wider mb-2">
          Presets
        </div>
        <div className="flex gap-1 flex-wrap">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                activePreset === preset.label
                  ? "bg-[#00e478] text-[#003919] border-[#00e478]"
                  : "border-[#3b4b3d] text-[#b9cbb9] hover:text-[#d6e4f9] hover:bg-[#1e2b3b]"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric picker toggle */}
      <div ref={pickerRef} className="mb-4">
        <button
          onClick={() => setMetricPickerOpen((o) => !o)}
          className="w-full flex items-center justify-between text-xs border border-[#3b4b3d] rounded px-3 py-2 text-[#b9cbb9] hover:text-[#d6e4f9] hover:bg-[#1e2b3b] transition-colors"
        >
          <span>Metrics ({activeStats.size} active)</span>
          <span className="text-[#849585]">{metricPickerOpen ? "▴" : "▾"}</span>
        </button>

        {metricPickerOpen && (
          <div className="mt-2 border border-[#3b4b3d] rounded-lg bg-[#0a1828] p-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-0">
              {STAT_GROUPS.map(({ group, stats }) => (
                <div key={group} className="mb-3">
                  <div className="text-[10px] text-[#849585] uppercase tracking-wider mb-1.5 pb-0.5 border-b border-[#3b4b3d]">
                    {group}
                  </div>
                  <div className="space-y-1">
                    {stats.map(({ key, label, inverted }) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 cursor-pointer text-xs text-[#d6e4f9] hover:text-[#00e478]"
                      >
                        <input
                          type="checkbox"
                          className="accent-[#00e478] shrink-0"
                          checked={activeStats.has(key)}
                          onChange={() => toggleStat(key)}
                        />
                        <span className="leading-tight flex items-center gap-1">
                          {label}
                          {inverted && (
                            <span className="text-[10px] text-[#849585]">
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
          </div>
        )}
      </div>

      {/* Sliders — only for active stats */}
      <div className="space-y-5">
        {ALL_STATS.filter((s) => activeStats.has(s.key)).map(
          ({ key, label }) => (
            <div key={key}>
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-[#b9cbb9] flex items-center gap-1">
                  {label}
                  {METRIC_TOOLTIPS[key] && (
                    <InfoTip text={METRIC_TOOLTIPS[key]} />
                  )}
                </span>
                <span className="text-xs font-mono text-[#00e478]">
                  {weights[key]}
                </span>
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[weights[key]]}
                onValueChange={(v) =>
                  setWeight(key, typeof v === "number" ? v : (v[0] ?? 1))
                }
                className="[&_[role=slider]]:bg-[#00e478] [&_[role=slider]]:border-[#00e478]"
              />
            </div>
          ),
        )}
      </div>
    </>
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 pb-14 lg:pb-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[#d6e4f9]">
          Index Builder
        </h1>
        <p className="text-xs sm:text-sm text-[#849585] mt-1">
          Select metrics and adjust weights (1–10) to generate a custom
          performance index for auction valuation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 sm:gap-6">
        {/* Left: Weight sliders — desktop */}
        <aside className="hidden lg:block rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4 sm:p-5 h-fit">
          {sidebarContent}
        </aside>

        {/* Right: Rankings */}
        <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-[#3b4b3d]">
            <h2 className="font-semibold text-sm sm:text-base text-[#d6e4f9]">
              Rankings
            </h2>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[11px] sm:text-xs text-[#849585]">
                {loading ? "—" : `${ranked.length} players`}
              </span>
              <span className="text-[11px] sm:text-xs text-[#00e478] font-mono">
                Live
              </span>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-[#0a1828]">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[10px] text-[#849585] uppercase w-10">
                    #
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] text-[#849585] uppercase">
                    Player
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] text-[#849585] uppercase w-14">
                    Pos
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] text-[#849585] uppercase w-16">
                    Pts
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] text-[#849585] uppercase">
                    Key Stats
                  </th>
                  <th className="px-4 py-2.5 text-right text-[10px] text-[#849585] uppercase w-20">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 25 }).map((_, i) => (
                      <tr
                        key={`skel-${i}`}
                        className={`border-b border-[#3b4b3d]/40 ${i % 2 === 0 ? "" : "bg-[#0a1828]/50"}`}
                      >
                        <td className="px-4 py-3">
                          <div className="h-4 bg-[#1e2b3b] rounded animate-pulse w-6" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 bg-[#1e2b3b] rounded animate-pulse w-24 mb-1" />
                          <div className="h-3 bg-[#1e2b3b] rounded animate-pulse w-16" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 bg-[#1e2b3b] rounded animate-pulse w-10" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 bg-[#1e2b3b] rounded animate-pulse w-14" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 bg-[#1e2b3b] rounded animate-pulse w-48" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 bg-[#1e2b3b] rounded animate-pulse w-12 ml-auto" />
                        </td>
                      </tr>
                    ))
                  : ranked.map((p, i) => (
                      <tr
                        key={p.id}
                        className={`border-b border-[#3b4b3d]/40 hover:bg-[#132030] transition-colors ${i % 2 === 0 ? "" : "bg-[#0a1828]/50"}`}
                      >
                        <td className="px-4 py-3 text-xs font-mono text-[#849585]">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#d6e4f9]">
                            {p.web_name}
                          </div>
                          <div className="text-[11px] text-[#849585]">
                            {p.team_short}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={`text-[10px] ${POSITION_COLORS[p.position]}`}
                          >
                            {p.position}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#d6e4f9]">
                          {p.total_points}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#849585]">
                          xGI:{" "}
                          {Number.parseFloat(
                            p.expected_goal_involvements,
                          ).toFixed(2)}{" "}
                          · PPG: {p.points_per_game} · ICT:{" "}
                          {Number.parseFloat(p.ict_index).toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono font-bold text-[#00e478] tabular-nums">
                            {(p.index_score * 100).toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="lg:hidden">
            {loading
              ? Array.from({ length: 15 }).map((_, i) => (
                  <div
                    key={`skel-card-${i}`}
                    className="flex items-center gap-3 px-4 py-3 border-b border-[#3b4b3d]/40 animate-pulse"
                  >
                    <div className="h-4 bg-[#1e2b3b] rounded w-6" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 bg-[#1e2b3b] rounded w-32" />
                      <div className="h-3 bg-[#1e2b3b] rounded w-20" />
                    </div>
                    <div className="h-5 bg-[#1e2b3b] rounded w-12" />
                    <div className="h-4 bg-[#1e2b3b] rounded w-10" />
                  </div>
                ))
              : ranked.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-[#3b4b3d]/40"
                  >
                    <span className="text-xs font-mono text-[#849585] w-6 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[#d6e4f9] text-sm truncate">
                        {p.web_name}
                      </div>
                      <div className="text-[11px] text-[#b9cbb9]">
                        {p.team_short} · {p.total_points} pts
                      </div>
                    </div>
                    <Badge
                      className={`text-[10px] shrink-0 ${POSITION_COLORS[p.position]}`}
                    >
                      {p.position}
                    </Badge>
                    <span className="font-mono font-bold text-[#00e478] text-sm tabular-nums w-14 text-right shrink-0">
                      {(p.index_score * 100).toFixed(1)}
                    </span>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* Mobile weight sliders trigger */}
      <button
        className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[#0f1c2c] border border-[#00e478]/60 rounded-full px-4 py-2.5 text-xs text-[#d6e4f9] hover:text-[#00e478] hover:border-[#00e478] shadow-[0_0_12px_rgba(0,228,120,0.25)] transition-all"
        onClick={() => setDrawerOpen(true)}
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-[#00e478]" />
        <span>Sliders ({activeStats.size})</span>
        <span className="text-[#00e478]">▴</span>
      </button>

      {/* Mobile weight sliders drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50 lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#0f1c2c] rounded-t-xl border border-[#3b4b3d] max-h-[75vh] overflow-y-auto overscroll-contain shadow-2xl">
            <div className="sticky top-0 bg-[#0f1c2c] z-10 rounded-t-xl">
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#3b4b3d]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 rounded-full bg-[#3b4b3d] mx-auto" />
                  <h3 className="text-sm font-semibold text-[#d6e4f9]">
                    Stat Weighting
                  </h3>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 text-[#849585] hover:text-[#d6e4f9]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4">{sidebarContent}</div>
          </div>
        </>
      )}
    </div>
  );
}
