"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles, Flame, Snowflake, ShieldCheck } from "lucide-react";
import type { ExpectedStatsData, ExpectedStatsPlayer } from "@/lib/insights-utils";

interface ExpectedStatsTabProps {
  data: ExpectedStatsData;
}

type ExpectedViewMode = "xgi" | "unlucky" | "clinical" | "defensive";

export function ExpectedStatsTab({ data }: ExpectedStatsTabProps) {
  const [mode, setMode] = useState<ExpectedViewMode>("xgi");

  const currentList: ExpectedStatsPlayer[] = (() => {
    switch (mode) {
      case "xgi":
        return data.topXgi;
      case "unlucky":
        return data.unluckyFinishers;
      case "clinical":
        return data.clinicalFinishers;
      case "defensive":
        return data.topXgcSolidDefenders;
    }
  })();

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setMode("xgi")}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            mode === "xgi"
              ? "border-[#00e478] bg-[#00e478]/10 ring-1 ring-[#00e478]"
              : "border-[#3b4b3d] bg-[#0f1c2c] hover:bg-[#132030]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8]">
              xGI Leaders
            </span>
            <Sparkles className="w-4 h-4 text-[#00e478]" />
          </div>
          <div className="mt-2 text-2xl font-black text-[#d6e4f9]">
            {data.topXgi.length}
          </div>
          <p className="text-[11px] text-[#869ab8] mt-0.5">Top threat creators</p>
        </button>

        <button
          onClick={() => setMode("unlucky")}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            mode === "unlucky"
              ? "border-sky-400 bg-sky-500/10 ring-1 ring-sky-400"
              : "border-[#3b4b3d] bg-[#0f1c2c] hover:bg-[#132030]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8]">
              Unlucky Radar
            </span>
            <Snowflake className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-sky-400">
            {data.unluckyFinishers.length}
          </div>
          <p className="text-[11px] text-[#869ab8] mt-0.5">Due for goal hauls (xG &gt; Goals)</p>
        </button>

        <button
          onClick={() => setMode("clinical")}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            mode === "clinical"
              ? "border-amber-400 bg-amber-500/10 ring-1 ring-amber-400"
              : "border-[#3b4b3d] bg-[#0f1c2c] hover:bg-[#132030]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8]">
              Overperformers
            </span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-400">
            {data.clinicalFinishers.length}
          </div>
          <p className="text-[11px] text-[#869ab8] mt-0.5">Clinical / Regression alert</p>
        </button>

        <button
          onClick={() => setMode("defensive")}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            mode === "defensive"
              ? "border-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-400"
              : "border-[#3b4b3d] bg-[#0f1c2c] hover:bg-[#132030]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8]">
              Clean xGC Defense
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-[#00e478]">
            {data.topXgcSolidDefenders.length}
          </div>
          <p className="text-[11px] text-[#869ab8] mt-0.5">Lowest goals conceded expected</p>
        </button>
      </div>

      {/* Narrative Guide Box */}
      <div className="bg-[#0f1c2c] border border-[#3b4b3d] rounded-xl p-3.5 text-xs text-[#b9cbb9] flex items-center justify-between">
        <div>
          {mode === "xgi" && (
            <span>
              <strong>Expected Goal Involvement (xGI)</strong> measures the underlying quality of chances a player takes and creates. High xGI assets are the most consistent long-term fantasy scorers.
            </span>
          )}
          {mode === "unlucky" && (
            <span>
              <strong>Unlucky Finishers Radar:</strong> Players generating high expected goals (xG) whose actual goal count lags behind. In FPL history, players in this group reliably experience positive regression toward the mean.
            </span>
          )}
          {mode === "clinical" && (
            <span>
              <strong>Overperforming Finishers:</strong> Players scoring substantially more goals than their xG suggests. Unless world-class finishers (like Son or Haaland), their scoring rate typically regresses over a full season.
            </span>
          )}
          {mode === "defensive" && (
            <span>
              <strong>Defensive Solidity:</strong> Goalkeepers and defenders playing for teams with the lowest Expected Goals Conceded (xGC), maximizing clean sheet probabilities.
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#020f1e] text-[#869ab8] text-xs uppercase border-b border-[#3b4b3d]">
              <tr>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-3">Position</th>
                <th className="py-3 px-3">Price</th>
                <th className="py-3 px-3">Goals / xG</th>
                <th className="py-3 px-3">Assists / xA</th>
                <th className="py-3 px-3">Total xGI</th>
                <th className="py-3 px-3">xGI / 90</th>
                <th className="py-3 px-4 text-right">Finishing Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3b4b3d]/40">
              {currentList.map(({ player, xg, xa, xgi, finishingDelta, xgiPer90, goals, assists }) => (
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
                  <td className="py-3 px-3">
                    <span className="text-[#d6e4f9] font-medium">{goals}</span>
                    <span className="text-[#869ab8] text-xs ml-1">({xg.toFixed(2)})</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[#d6e4f9] font-medium">{assists}</span>
                    <span className="text-[#869ab8] text-xs ml-1">({xa.toFixed(2)})</span>
                  </td>
                  <td className="py-3 px-3 font-bold text-[#00e478]">
                    {xgi.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 font-mono text-xs text-[#d6e4f9]">
                    {xgiPer90.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-block font-mono font-bold text-xs px-2.5 py-1 rounded-md ${
                        finishingDelta > 0
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : finishingDelta < -0.5
                            ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                            : "bg-[#1e2b3b] text-[#869ab8]"
                      }`}
                    >
                      {finishingDelta > 0 ? `+${finishingDelta.toFixed(2)}` : finishingDelta.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-[#3b4b3d]/40">
          {currentList.map(({ player, xg, xa, xgi, finishingDelta, goals, assists }) => (
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
                  <div className="text-xs text-[#869ab8]">xGI</div>
                  <div className="font-bold text-sm text-[#00e478]">
                    {xgi.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs border-t border-[#3b4b3d]/30">
                <div>
                  <span className="text-[#869ab8]">G:</span> {goals} (xG {xg.toFixed(1)}) ·{" "}
                  <span className="text-[#869ab8]">A:</span> {assists} (xA {xa.toFixed(1)})
                </div>
                <div className="font-mono text-xs">
                  Delta:{" "}
                  <span className={finishingDelta > 0 ? "text-amber-400 font-bold" : "text-sky-400 font-bold"}>
                    {finishingDelta > 0 ? `+${finishingDelta.toFixed(2)}` : finishingDelta.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
