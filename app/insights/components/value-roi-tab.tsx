"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Coins, Filter } from "lucide-react";
import type { ValuePlayer } from "@/lib/insights-utils";

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
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#0f1c2c] p-3.5 rounded-xl border border-[#3b4b3d]">
        {/* Position toggles */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          {["ALL", "GKP", "DEF", "MID", "FWD"].map((pos) => (
            <button
              key={pos}
              onClick={() => setPosition(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                position === pos
                  ? "bg-[#00e478] text-[#061423]"
                  : "bg-[#1e2b3b] text-[#869ab8] hover:text-[#d6e4f9]"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Tier and sort selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#869ab8]" />
            <select
              value={priceTier}
              onChange={(e) => setPriceTier(e.target.value)}
              className="bg-[#020f1e] border border-[#3b4b3d] text-xs text-[#d6e4f9] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00e478]"
            >
              <option value="ALL">All Price Tiers</option>
              <option value="BUDGET">Budget Gems (&le; £5.5m)</option>
              <option value="MID">Mid-Priced (£5.6m - £8.5m)</option>
              <option value="PREMIUM">Premiums (&gt; £8.5m)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-[#869ab8]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="bg-[#020f1e] border border-[#3b4b3d] text-xs text-[#d6e4f9] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00e478]"
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
      <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#020f1e] text-[#869ab8] text-xs uppercase border-b border-[#3b4b3d]">
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
            <tbody className="divide-y divide-[#3b4b3d]/40">
              {filtered.map(({ player, pointsPerMillion, formPerMillion, pointsPer90 }) => (
                <tr
                  key={player.id}
                  className="hover:bg-[#132030]/80 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#1e2b3b] border border-[#3b4b3d] shrink-0">
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
                        <div className="font-semibold text-[#d6e4f9]">
                          {player.web_name}
                        </div>
                        <div className="text-xs text-[#869ab8]">
                          {player.team_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1e2b3b] text-[#b9cbb9] border border-[#3b4b3d]">
                      {player.position}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-[#d6e4f9]">
                    £{player.price.toFixed(1)}m
                  </td>
                  <td className="py-3 px-3 font-bold text-[#d6e4f9]">
                    {player.total_points}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/15 text-[#00e478] border border-emerald-500/30">
                      {pointsPerMillion.toFixed(1)} pts/£m
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#d6e4f9]">
                    {player.form}
                  </td>
                  <td className="py-3 px-3 font-mono text-xs text-[#b9cbb9]">
                    {formPerMillion.toFixed(1)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-xs text-[#d6e4f9]">
                    {pointsPer90.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-[#3b4b3d]/40">
          {filtered.map(({ player, pointsPerMillion, formPerMillion, pointsPer90 }) => (
            <div key={player.id} className="p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#1e2b3b] border border-[#3b4b3d] shrink-0">
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
                    <div className="font-semibold text-sm text-[#d6e4f9]">
                      {player.web_name}
                    </div>
                    <div className="text-[11px] text-[#869ab8]">
                      {player.team_short} · {player.position} · £{player.price.toFixed(1)}m
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#869ab8]">Total Pts</div>
                  <div className="font-bold text-sm text-[#d6e4f9]">
                    {player.total_points}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs border-t border-[#3b4b3d]/30">
                <div>
                  <span className="font-bold text-[#00e478] bg-emerald-500/10 px-2 py-0.5 rounded">
                    {pointsPerMillion.toFixed(1)} pts/£m
                  </span>
                </div>
                <div className="text-[#869ab8]">
                  Form/£m: <strong className="text-[#d6e4f9]">{formPerMillion.toFixed(1)}</strong> · Pts/90: <strong className="text-[#d6e4f9]">{pointsPer90.toFixed(1)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
