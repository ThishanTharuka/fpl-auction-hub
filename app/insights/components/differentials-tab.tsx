"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Compass, Sparkles, Filter } from "lucide-react";
import type { DifferentialPlayer } from "@/lib/insights-utils";

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
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#0f1c2c] p-3.5 rounded-xl border border-[#3b4b3d]">
        {/* Ownership Threshold Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#869ab8] flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-[#00e478]" />
            Cap:
          </span>
          <div className="flex bg-[#020f1e] p-0.5 rounded-lg border border-[#3b4b3d]">
            <button
              onClick={() => setThreshold(10)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                threshold === 10
                  ? "bg-[#00e478] text-[#061423]"
                  : "text-[#869ab8] hover:text-[#d6e4f9]"
              }`}
            >
              &lt; 10% Owned
            </button>
            <button
              onClick={() => setThreshold(5)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                threshold === 5
                  ? "bg-[#00e478] text-[#061423]"
                  : "text-[#869ab8] hover:text-[#d6e4f9]"
              }`}
            >
              &lt; 5% Ultra-Diff
            </button>
          </div>
        </div>

        {/* Position filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          {["ALL", "GKP", "DEF", "MID", "FWD"].map((pos) => (
            <button
              key={pos}
              onClick={() => setPosition(pos)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                position === pos
                  ? "bg-[#1e2b3b] text-[#00e478] border border-[#00e478]/40"
                  : "bg-[#020f1e] text-[#869ab8] hover:text-[#d6e4f9] border border-[#3b4b3d]"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Sorting */}
        <div className="flex items-center gap-1.5 self-end lg:self-auto">
          <Filter className="w-3.5 h-3.5 text-[#869ab8]" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="bg-[#020f1e] border border-[#3b4b3d] text-xs text-[#d6e4f9] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00e478]"
          >
            <option value="form">Sort: Recent Form</option>
            <option value="totalPoints">Sort: Total Points</option>
            <option value="xgi">Sort: Expected Goal Involvement (xGI)</option>
            <option value="fdr">Sort: Best Fixtures (Next 5 FDR)</option>
          </select>
        </div>
      </div>

      {/* Narrative hint */}
      <div className="bg-[#0f1c2c] border border-[#3b4b3d] rounded-xl p-3.5 text-xs text-[#b9cbb9] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#00e478] shrink-0" />
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
            className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] p-4 flex flex-col justify-between hover:border-[#00e478]/60 transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#1e2b3b] border border-[#3b4b3d] shrink-0 group-hover:border-[#00e478]/50 transition-colors">
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
                  <div className="font-bold text-sm text-[#d6e4f9] group-hover:text-[#00e478] transition-colors">
                    {player.web_name}
                  </div>
                  <div className="text-xs text-[#869ab8]">
                    {player.team_name} · {player.position}
                  </div>
                  <div className="text-xs font-semibold text-[#d6e4f9] mt-0.5">
                    £{player.price.toFixed(1)}m
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-[#1e2b3b] text-sky-400 border border-sky-500/30">
                  {ownership.toFixed(1)}% owned
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-[#3b4b3d]/40 text-center text-xs">
              <div className="bg-[#020f1e] rounded-lg p-1.5">
                <div className="text-[10px] text-[#869ab8]">Form</div>
                <div className="font-bold text-[#00e478]">{form.toFixed(1)}</div>
              </div>
              <div className="bg-[#020f1e] rounded-lg p-1.5">
                <div className="text-[10px] text-[#869ab8]">Total Pts</div>
                <div className="font-bold text-[#d6e4f9]">{totalPoints}</div>
              </div>
              <div className="bg-[#020f1e] rounded-lg p-1.5">
                <div className="text-[10px] text-[#869ab8]">xGI</div>
                <div className="font-bold text-amber-400">{xgi.toFixed(2)}</div>
              </div>
              <div className="bg-[#020f1e] rounded-lg p-1.5">
                <div className="text-[10px] text-[#869ab8]">Next 5 FDR</div>
                <div
                  className={`font-bold ${
                    player.avg_fdr_next5 <= 2.5
                      ? "text-[#00e478]"
                      : player.avg_fdr_next5 >= 3.5
                        ? "text-rose-400"
                        : "text-[#d6e4f9]"
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
