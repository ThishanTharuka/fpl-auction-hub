"use client";

import { useEffect, useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { applyIndexToPlayers, DEFAULT_WEIGHTS } from "@/lib/index-calculator";
import type {
  EnrichedPlayer,
  WeightConfig,
  IndexedPlayer,
} from "@/lib/fpl-types";

const STAT_LABELS: Record<keyof WeightConfig, string> = {
  total_points: "PPG (Points Per Game)",
  form: "Form (Last 5)",
  ict_index: "ICT Index",
  goals_scored: "Goals Scored",
  assists: "Assists",
  clean_sheets: "Clean Sheets",
  bonus: "Bonus Points",
  minutes: "Minutes Played",
  xgi: "xGI (Expected Goal Involvements)",
  value: "Value for Money",
};

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-yellow-500/20 text-yellow-400",
  DEF: "bg-green-500/20 text-green-400",
  MID: "bg-blue-500/20 text-blue-400",
  FWD: "bg-red-500/20 text-red-400",
};

export default function IndexBuilderPage() {
  const [players, setPlayers] = useState<EnrichedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [weights, setWeights] = useState<WeightConfig>({ ...DEFAULT_WEIGHTS });
  const [posFilter, setPosFilter] = useState("ALL");

  useEffect(() => {
    fetch("/api/fpl/bootstrap")
      .then((r) => r.json())
      .then((d) => {
        setPlayers(d.players ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalWeight = useMemo(
    () => Object.values(weights).reduce((s, v) => s + v, 0),
    [weights],
  );

  const modelStrength = Math.min(100, Math.round(totalWeight * 100));

  const ranked = useMemo<IndexedPlayer[]>(() => {
    const pool =
      posFilter === "ALL"
        ? players
        : players.filter((p) => p.position === posFilter);
    return applyIndexToPlayers(pool, weights).slice(0, 50);
  }, [players, weights, posFilter]);

  function setWeight(key: keyof WeightConfig, pct: number) {
    setWeights((prev) => ({ ...prev, [key]: pct / 100 }));
  }

  function resetWeights() {
    setWeights({ ...DEFAULT_WEIGHTS });
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#d6e4f9]">Index Builder</h1>
        <p className="text-sm text-[#849585] mt-1">
          Configure weights to generate a custom performance index for auction
          valuation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Left: Weight sliders */}
        <aside className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5 h-fit">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-[#d6e4f9]">Stat Weighting</h2>
            <button
              onClick={resetWeights}
              className="text-xs text-[#849585] hover:text-[#00e478] transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Position filter */}
          <div className="flex gap-1 mb-5 flex-wrap">
            {["ALL", "GKP", "DEF", "MID", "FWD"].map((pos) => (
              <Button
                key={pos}
                size="sm"
                variant={posFilter === pos ? "default" : "outline"}
                className={
                  posFilter === pos
                    ? "bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 text-xs"
                    : "border-[#3b4b3d] text-[#b9cbb9] hover:text-[#d6e4f9] hover:bg-[#1e2b3b] text-xs"
                }
                onClick={() => setPosFilter(pos)}
              >
                {pos}
              </Button>
            ))}
          </div>

          <div className="space-y-5">
            {(Object.keys(weights) as Array<keyof WeightConfig>).map((key) => {
              const pct = Math.round(weights[key] * 100);
              return (
                <div key={key}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-[#b9cbb9]">
                      {STAT_LABELS[key]}
                    </span>
                    <span className="text-xs font-mono text-[#00e478]">
                      {pct}
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[pct]}
                    onValueChange={(v) =>
                      setWeight(key, typeof v === "number" ? v : (v[0] ?? 0))
                    }
                    className="[&_[role=slider]]:bg-[#00e478] [&_[role=slider]]:border-[#00e478]"
                  />
                </div>
              );
            })}
          </div>

          {/* Model strength */}
          <div className="mt-6 rounded bg-[#132030] p-3">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-[#849585]">TOTAL MODEL STRENGTH</span>
              <span className="font-mono font-bold text-[#00e478]">
                {modelStrength}%
              </span>
            </div>
            <div className="h-1.5 bg-[#283646] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00e478] rounded-full transition-all"
                style={{ width: `${Math.min(100, modelStrength)}%` }}
              />
            </div>
          </div>
        </aside>

        {/* Right: Rankings */}
        <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#3b4b3d]">
            <h2 className="font-semibold text-[#d6e4f9]">
              Computed Index Rankings
            </h2>
            <div className="flex items-center gap-3">
              {loading ? (
                <span className="text-xs text-[#849585]">Loading…</span>
              ) : (
                <span className="text-xs text-[#849585]">
                  Showing {ranked.length} players
                </span>
              )}
              <span className="text-xs text-[#00e478] font-mono">
                Live Updates
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0a1828]">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[10px] text-[#849585] uppercase w-10">
                    #
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] text-[#849585] uppercase">
                    Player
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] text-[#849585] uppercase">
                    Pos
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] text-[#849585] uppercase">
                    Price
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] text-[#849585] uppercase">
                    Key Stats
                  </th>
                  <th className="px-4 py-2.5 text-right text-[10px] text-[#849585] uppercase">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((p, i) => (
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
                    <td className="px-4 py-3 font-mono text-xs text-[#b9cbb9]">
                      £{p.price.toFixed(1)}m
                    </td>
                    <td className="px-4 py-3 text-xs text-[#849585]">
                      xGI:{" "}
                      {Number.parseFloat(p.expected_goal_involvements).toFixed(
                        2,
                      )}{" "}
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
        </div>
      </div>
    </div>
  );
}
