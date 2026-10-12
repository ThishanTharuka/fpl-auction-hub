"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles, Flame, Snowflake, ShieldCheck } from "lucide-react";
import type { ExpectedStatsData, ExpectedStatsPlayer } from "@/lib/insights-utils";

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
              ? "border-primary bg-primary/10 ring-1 ring-primary"
              : "border-border bg-card hover:bg-muted"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              xGI Leaders
            </span>
            <Sparkles className="w-4 h-4 text-emerald-700 dark:text-primary" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-primary">
            {data.topXgi.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Top threat creators</p>
        </button>

        <button
          onClick={() => setMode("unlucky")}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            mode === "unlucky"
              ? "border-sky-500 bg-sky-500/10 ring-1 ring-sky-500"
              : "border-border bg-card hover:bg-muted"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Unlucky Radar
            </span>
            <Snowflake className="w-4 h-4 text-sky-700 dark:text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-sky-700 dark:text-sky-400">
            {data.unluckyFinishers.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Due for goal hauls (xG &gt; Goals)</p>
        </button>

        <button
          onClick={() => setMode("clinical")}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            mode === "clinical"
              ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
              : "border-border bg-card hover:bg-muted"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Overperformers
            </span>
            <Flame className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-400">
            {data.clinicalFinishers.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Clinical / Regression alert</p>
        </button>

        <button
          onClick={() => setMode("defensive")}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            mode === "defensive"
              ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
              : "border-border bg-card hover:bg-muted"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Clean xGC Defense
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-primary">
            {data.topXgcSolidDefenders.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Lowest goals conceded expected</p>
        </button>
      </div>

      {/* Narrative Guide Box */}
      <div className="bg-card border border-border rounded-xl p-3.5 text-xs text-muted-foreground flex items-center justify-between">
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
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase border-b border-border">
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
            <tbody className="divide-y divide-border/40">
              {currentList.map(({ player, xg, xa, xgi, finishingDelta, xgiPer90, goals, assists }) => (
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
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getPositionBadgeClass(player.position)}`}>
                      {player.position}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-foreground">
                    £{player.price.toFixed(1)}m
                  </td>
                  <td className="py-3 px-3 font-mono">
                    <span className="text-foreground font-medium">{goals}</span>
                    <span className="text-muted-foreground text-xs ml-1">({xg.toFixed(2)})</span>
                  </td>
                  <td className="py-3 px-3 font-mono">
                    <span className="text-foreground font-medium">{assists}</span>
                    <span className="text-muted-foreground text-xs ml-1">({xa.toFixed(2)})</span>
                  </td>
                  <td className="py-3 px-3 font-bold text-emerald-700 dark:text-primary">
                    {xgi.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 font-mono text-xs text-foreground">
                    {xgiPer90.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-block font-mono font-bold text-xs px-2.5 py-1 rounded-md ${
                        finishingDelta > 0
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                          : finishingDelta < -0.5
                            ? "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30"
                            : "bg-muted text-muted-foreground"
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
        <div className="md:hidden divide-y divide-border/40">
          {currentList.map(({ player, xg, xa, xgi, finishingDelta, goals, assists }) => (
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
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                      <span>{player.team_short}</span>
                      <span>·</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getPositionBadgeClass(player.position)}`}>
                        {player.position}
                      </span>
                      <span>·</span>
                      <span className="font-mono">£{player.price.toFixed(1)}m</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">xGI</div>
                  <div className="font-bold text-sm text-emerald-700 dark:text-primary">
                    {xgi.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs border-t border-border/30">
                <div className="font-mono">
                  <span className="text-muted-foreground">G:</span> {goals} (xG {xg.toFixed(1)}) ·{" "}
                  <span className="text-muted-foreground">A:</span> {assists} (xA {xa.toFixed(1)})
                </div>
                <div className="font-mono text-xs">
                  Delta:{" "}
                  <span className={finishingDelta > 0 ? "text-amber-700 dark:text-amber-400 font-bold" : "text-sky-700 dark:text-sky-400 font-bold"}>
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
