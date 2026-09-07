"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Zap,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import type { MarketRadarData, MarketPlayerSummary } from "@/lib/insights-utils";

interface MarketRadarTabProps {
  data: MarketRadarData;
}

type Timeframe = "today" | "gameweek";
type MarketSubView =
  | "dailyRisers"
  | "dailyFallers"
  | "predictedRisers"
  | "predictedFallers"
  | "risers"
  | "fallers"
  | "netIn"
  | "netOut";

export function MarketRadarTab({ data }: MarketRadarTabProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("today");
  const [activeView, setActiveView] = useState<MarketSubView>("dailyRisers");
  const [search, setSearch] = useState("");

  const handleTimeframeChange = (next: Timeframe) => {
    setTimeframe(next);
    if (next === "today") {
      setActiveView(data.totalDailyRisersCount > 0 ? "dailyRisers" : "predictedRisers");
    } else {
      setActiveView("risers");
    }
  };

  const currentList: MarketPlayerSummary[] = useMemo(() => {
    let list: MarketPlayerSummary[] = [];
    switch (activeView) {
      case "dailyRisers":
        list = data.dailyRisers;
        break;
      case "dailyFallers":
        list = data.dailyFallers;
        break;
      case "predictedRisers":
        list = data.predictedRisersTonight;
        break;
      case "predictedFallers":
        list = data.predictedFallersTonight;
        break;
      case "risers":
        list = data.risers;
        break;
      case "fallers":
        list = data.fallers;
        break;
      case "netIn":
        list = data.topNetTransfersIn;
        break;
      case "netOut":
        list = data.topNetTransfersOut;
        break;
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (s) =>
        s.player.web_name.toLowerCase().includes(q) ||
        s.player.full_name.toLowerCase().includes(q) ||
        s.player.team_name.toLowerCase().includes(q) ||
        s.player.team_short.toLowerCase().includes(q),
    );
  }, [activeView, data, search]);

  return (
    <div className="space-y-4">
      {/* Timeframe Scope Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0f1c2c] p-2.5 rounded-xl border border-[#3b4b3d]">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#061423] border border-[#3b4b3d]/60">
          <button
            type="button"
            onClick={() => handleTimeframeChange("today")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              timeframe === "today"
                ? "bg-[#00e478] text-[#061423] shadow-sm font-bold"
                : "text-[#869ab8] hover:text-[#d6e4f9]"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Today & Predictions</span>
            {data.totalDailyRisersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#061423]/20 text-[#061423]">
                +{data.totalDailyRisersCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTimeframeChange("gameweek")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              timeframe === "gameweek"
                ? "bg-[#00e478] text-[#061423] shadow-sm font-bold"
                : "text-[#869ab8] hover:text-[#d6e4f9]"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Gameweek Overview</span>
            {data.totalRisersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#061423]/20 text-[#061423]">
                +{data.totalRisersCount}
              </span>
            )}
          </button>
        </div>

        <div className="text-[11px] text-[#869ab8] px-2 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#00e478] animate-pulse" />
          <span>FPL price updates run once daily at 00:00 - 01:30 UK time</span>
        </div>
      </div>

      {/* Top summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {timeframe === "today" ? (
          <>
            <button
              onClick={() => setActiveView("dailyRisers")}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                activeView === "dailyRisers"
                  ? "border-[#00e478] bg-[#00e478]/10 ring-1 ring-[#00e478]"
                  : "border-[#3b4b3d] bg-[#0f1c2c] hover:bg-[#132030]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8]">
                  Risen Today
                </span>
                <TrendingUp className="w-4 h-4 text-[#00e478]" />
              </div>
              <div className="mt-2 text-2xl font-black text-[#00e478]">
                {data.totalDailyRisersCount}
              </div>
              <p className="text-[11px] text-[#869ab8] mt-0.5">Price rise today (+£0.1m)</p>
            </button>

            <button
              onClick={() => setActiveView("dailyFallers")}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                activeView === "dailyFallers"
                  ? "border-rose-400 bg-rose-500/10 ring-1 ring-rose-400"
                  : "border-[#3b4b3d] bg-[#0f1c2c] hover:bg-[#132030]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8]">
                  Fallen Today
                </span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-rose-400">
                {data.totalDailyFallersCount}
              </div>
              <p className="text-[11px] text-[#869ab8] mt-0.5">Price drop today (-£0.1m)</p>
            </button>

            <button
              onClick={() => setActiveView("predictedRisers")}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                activeView === "predictedRisers"
                  ? "border-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-400"
                  : "border-[#3b4b3d] bg-[#0f1c2c] hover:bg-[#132030]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8]">
                  Imminent Rise
                </span>
                <Zap className="w-4 h-4 text-[#00e478]" />
              </div>
              <div className="mt-2 text-2xl font-black text-[#d6e4f9]">
                {data.predictedRisersTonight.length}
              </div>
              <p className="text-[11px] text-[#869ab8] mt-0.5">Target progress ≥ 60%</p>
            </button>

            <button
              onClick={() => setActiveView("predictedFallers")}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                activeView === "predictedFallers"
                  ? "border-amber-400 bg-amber-500/10 ring-1 ring-amber-400"
                  : "border-[#3b4b3d] bg-[#0f1c2c] hover:bg-[#132030]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8]">
                  Imminent Fall
                </span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-[#d6e4f9]">
                {data.predictedFallersTonight.length}
              </div>
              <p className="text-[11px] text-[#869ab8] mt-0.5">Target progress ≤ -60%</p>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveView("risers")}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                activeView === "risers"
                  ? "border-[#00e478] bg-[#00e478]/10 ring-1 ring-[#00e478]"
                  : "border-[#3b4b3d] bg-[#0f1c2c] hover:bg-[#132030]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8]">
                  Price Risers (GW)
                </span>
                <TrendingUp className="w-4 h-4 text-[#00e478]" />
              </div>
              <div className="mt-2 text-2xl font-black text-[#00e478]">
                {data.totalRisersCount}
              </div>
              <p className="text-[11px] text-[#869ab8] mt-0.5">Risen this Gameweek</p>
            </button>

            <button
              onClick={() => setActiveView("fallers")}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                activeView === "fallers"
                  ? "border-rose-400 bg-rose-500/10 ring-1 ring-rose-400"
                  : "border-[#3b4b3d] bg-[#0f1c2c] hover:bg-[#132030]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8]">
                  Price Fallers (GW)
                </span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-rose-400">
                {data.totalFallersCount}
              </div>
              <p className="text-[11px] text-[#869ab8] mt-0.5">Fallen this Gameweek</p>
            </button>

            <button
              onClick={() => setActiveView("netIn")}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                activeView === "netIn"
                  ? "border-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-400"
                  : "border-[#3b4b3d] bg-[#0f1c2c] hover:bg-[#132030]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8]">
                  High Net In
                </span>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-[#d6e4f9]">
                {data.topNetTransfersIn.length}
              </div>
              <p className="text-[11px] text-[#869ab8] mt-0.5">Top buy velocity</p>
            </button>

            <button
              onClick={() => setActiveView("netOut")}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                activeView === "netOut"
                  ? "border-amber-400 bg-amber-500/10 ring-1 ring-amber-400"
                  : "border-[#3b4b3d] bg-[#0f1c2c] hover:bg-[#132030]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8]">
                  High Net Out
                </span>
                <ArrowDownRight className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-[#d6e4f9]">
                {data.topNetTransfersOut.length}
              </div>
              <p className="text-[11px] text-[#869ab8] mt-0.5">Top sell velocity</p>
            </button>
          </>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0f1c2c] p-3 rounded-xl border border-[#3b4b3d]">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#869ab8]" />
          <input
            type="text"
            placeholder="Search by player or team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#020f1e] border border-[#3b4b3d] rounded-lg text-xs sm:text-sm text-[#d6e4f9] placeholder-[#869ab8] focus:outline-none focus:border-[#00e478]"
          />
        </div>
        <div className="text-xs text-[#869ab8] self-center sm:self-auto">
          Showing {currentList.length} player{currentList.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] overflow-hidden">
        {currentList.length === 0 ? (
          <div className="p-8 text-center text-[#869ab8] text-sm">
            No players found matching your criteria.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#020f1e] text-[#869ab8] text-xs uppercase border-b border-[#3b4b3d]">
                  {timeframe === "today" ? (
                    <tr>
                      <th className="py-3 px-4">Player</th>
                      <th className="py-3 px-3">Position</th>
                      <th className="py-3 px-3">Price</th>
                      <th className="py-3 px-3">Today Change</th>
                      <th className="py-3 px-3">Target Progress Tonight</th>
                      <th className="py-3 px-3">GW Delta</th>
                      <th className="py-3 px-4 text-right">Net Velocity</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="py-3 px-4">Player</th>
                      <th className="py-3 px-3">Position</th>
                      <th className="py-3 px-3">Price</th>
                      <th className="py-3 px-3">GW Change</th>
                      <th className="py-3 px-3">Season Delta</th>
                      <th className="py-3 px-3">Transfers In</th>
                      <th className="py-3 px-3">Transfers Out</th>
                      <th className="py-3 px-4 text-right">Net Velocity</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-[#3b4b3d]/40">
                  {currentList.map(
                    ({
                      player,
                      netTransfersEvent,
                      costChangeEvent,
                      costChangeStart,
                      costChangeDay,
                      targetProgressPercent,
                      ownershipPercent,
                    }) => (
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
                                {player.team_name} · {ownershipPercent}% owned
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
                        {timeframe === "today" ? (
                          <>
                            <td className="py-3 px-3">
                              {costChangeDay > 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold text-[#00e478] bg-emerald-500/10 px-2 py-0.5 rounded text-xs border border-[#00e478]/30">
                                  <TrendingUp className="w-3 h-3" />
                                  +£{(costChangeDay / 10).toFixed(1)}m
                                </span>
                              ) : costChangeDay < 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-xs border border-rose-500/30">
                                  <TrendingDown className="w-3 h-3" />
                                  -£{Math.abs(costChangeDay / 10).toFixed(1)}m
                                </span>
                              ) : (
                                <span className="text-[#869ab8] text-xs">£0.0m</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-1 min-w-[140px] max-w-[180px]">
                                <div className="flex items-center justify-between text-xs">
                                  <span
                                    className={`font-mono font-semibold ${
                                      targetProgressPercent > 0
                                        ? "text-[#00e478]"
                                        : targetProgressPercent < 0
                                          ? "text-rose-400"
                                          : "text-[#869ab8]"
                                    }`}
                                  >
                                    {targetProgressPercent > 0
                                      ? `+${targetProgressPercent.toFixed(1)}%`
                                      : `${targetProgressPercent.toFixed(1)}%`}
                                  </span>
                                  {targetProgressPercent >= 90 ? (
                                    <span className="text-[10px] uppercase font-bold text-[#00e478] bg-emerald-500/15 px-1.5 py-0.2 rounded border border-[#00e478]/30 animate-pulse">
                                      Imminent
                                    </span>
                                  ) : targetProgressPercent <= -90 ? (
                                    <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.2 rounded border border-rose-500/30 animate-pulse">
                                      Imminent
                                    </span>
                                  ) : null}
                                </div>
                                <div className="w-full bg-[#061423] h-1.5 rounded-full overflow-hidden border border-[#3b4b3d]/60">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      targetProgressPercent >= 0 ? "bg-[#00e478]" : "bg-rose-400"
                                    }`}
                                    style={{
                                      width: `${Math.min(100, Math.max(0, Math.abs(targetProgressPercent)))}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              {costChangeEvent > 0 ? (
                                <span className="text-xs font-semibold text-[#00e478]">
                                  +£{(costChangeEvent / 10).toFixed(1)}m
                                </span>
                              ) : costChangeEvent < 0 ? (
                                <span className="text-xs font-semibold text-rose-400">
                                  -£{Math.abs(costChangeEvent / 10).toFixed(1)}m
                                </span>
                              ) : (
                                <span className="text-[#869ab8] text-xs">£0.0m</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-3">
                              {costChangeEvent > 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold text-[#00e478] bg-emerald-500/10 px-2 py-0.5 rounded text-xs">
                                  <TrendingUp className="w-3 h-3" />
                                  +£{(costChangeEvent / 10).toFixed(1)}m
                                </span>
                              ) : costChangeEvent < 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-xs">
                                  <TrendingDown className="w-3 h-3" />
                                  -£{Math.abs(costChangeEvent / 10).toFixed(1)}m
                                </span>
                              ) : (
                                <span className="text-[#869ab8] text-xs">£0.0m</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {costChangeStart > 0 ? (
                                <span className="text-xs font-semibold text-[#00e478]">
                                  +£{(costChangeStart / 10).toFixed(1)}m
                                </span>
                              ) : costChangeStart < 0 ? (
                                <span className="text-xs font-semibold text-rose-400">
                                  -£{Math.abs(costChangeStart / 10).toFixed(1)}m
                                </span>
                              ) : (
                                <span className="text-[#869ab8] text-xs">£0.0m</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-xs text-[#00e478] font-medium">
                              +{(player.transfers_in_event || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-xs text-rose-400 font-medium">
                              -{(player.transfers_out_event || 0).toLocaleString()}
                            </td>
                          </>
                        )}
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-block font-mono font-bold text-xs px-2.5 py-1 rounded-md ${
                              netTransfersEvent > 0
                                ? "bg-emerald-500/15 text-[#00e478] border border-emerald-500/30"
                                : netTransfersEvent < 0
                                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                  : "bg-[#1e2b3b] text-[#869ab8]"
                            }`}
                          >
                            {netTransfersEvent > 0
                              ? `+${netTransfersEvent.toLocaleString()}`
                              : netTransfersEvent.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-[#3b4b3d]/40">
              {currentList.map(
                ({
                  player,
                  netTransfersEvent,
                  costChangeEvent,
                  costChangeStart,
                  costChangeDay,
                  targetProgressPercent,
                  ownershipPercent,
                }) => (
                  <div key={player.id} className="p-3.5 space-y-2.5">
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
                            {player.team_short} · {player.position}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm text-[#d6e4f9]">
                          £{player.price.toFixed(1)}m
                        </div>
                        <div className="text-[11px] text-[#869ab8]">
                          {ownershipPercent}% owned
                        </div>
                      </div>
                    </div>

                    {timeframe === "today" ? (
                      <div className="pt-1.5 space-y-2 border-t border-[#3b4b3d]/30">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-[#869ab8]">Today:</span>
                            {costChangeDay > 0 ? (
                              <span className="font-bold text-[#00e478]">
                                +£{(costChangeDay / 10).toFixed(1)}m
                              </span>
                            ) : costChangeDay < 0 ? (
                              <span className="font-bold text-rose-400">
                                -£{Math.abs(costChangeDay / 10).toFixed(1)}m
                              </span>
                            ) : (
                              <span className="text-[#869ab8]">£0.0m</span>
                            )}
                            <span className="text-[#869ab8] ml-1">GW:</span>
                            <span className={costChangeEvent >= 0 ? "text-[#00e478]" : "text-rose-400"}>
                              {costChangeEvent >= 0
                                ? `+£${(costChangeEvent / 10).toFixed(1)}m`
                                : `-£${Math.abs(costChangeEvent / 10).toFixed(1)}m`}
                            </span>
                          </div>
                          <span
                            className={`font-mono text-xs px-2 py-0.5 rounded font-medium ${
                              netTransfersEvent > 0
                                ? "bg-emerald-500/15 text-[#00e478]"
                                : "bg-rose-500/15 text-rose-400"
                            }`}
                          >
                            {netTransfersEvent > 0
                              ? `+${netTransfersEvent.toLocaleString()}`
                              : netTransfersEvent.toLocaleString()}
                          </span>
                        </div>

                        {/* Target Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#869ab8]">Target Tonight</span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-mono font-semibold ${
                                  targetProgressPercent > 0
                                    ? "text-[#00e478]"
                                    : targetProgressPercent < 0
                                      ? "text-rose-400"
                                      : "text-[#869ab8]"
                                }`}
                              >
                                {targetProgressPercent > 0
                                  ? `+${targetProgressPercent.toFixed(1)}%`
                                  : `${targetProgressPercent.toFixed(1)}%`}
                              </span>
                              {targetProgressPercent >= 90 ? (
                                <span className="text-[9px] uppercase font-bold text-[#00e478] bg-emerald-500/15 px-1 py-0.2 rounded border border-[#00e478]/30">
                                  Imminent
                                </span>
                              ) : targetProgressPercent <= -90 ? (
                                <span className="text-[9px] uppercase font-bold text-rose-400 bg-rose-500/15 px-1 py-0.2 rounded border border-rose-500/30">
                                  Imminent
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="w-full bg-[#061423] h-1.5 rounded-full overflow-hidden border border-[#3b4b3d]/60">
                            <div
                              className={`h-full rounded-full transition-all ${
                                targetProgressPercent >= 0 ? "bg-[#00e478]" : "bg-rose-400"
                              }`}
                              style={{
                                width: `${Math.min(100, Math.max(0, Math.abs(targetProgressPercent)))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1 text-xs border-t border-[#3b4b3d]/30">
                        <div className="flex items-center gap-2">
                          <span className="text-[#869ab8]">GW:</span>
                          {costChangeEvent > 0 ? (
                            <span className="font-bold text-[#00e478]">
                              +£{(costChangeEvent / 10).toFixed(1)}m
                            </span>
                          ) : costChangeEvent < 0 ? (
                            <span className="font-bold text-rose-400">
                              -£{Math.abs(costChangeEvent / 10).toFixed(1)}m
                            </span>
                          ) : (
                            <span className="text-[#869ab8]">£0.0m</span>
                          )}
                          <span className="text-[#869ab8] ml-1">Season:</span>
                          <span className={costChangeStart >= 0 ? "text-[#00e478]" : "text-rose-400"}>
                            {costChangeStart >= 0
                              ? `+£${(costChangeStart / 10).toFixed(1)}m`
                              : `-£${Math.abs(costChangeStart / 10).toFixed(1)}m`}
                          </span>
                        </div>

                        <div>
                          <span
                            className={`font-mono text-xs px-2 py-0.5 rounded font-medium ${
                              netTransfersEvent > 0
                                ? "bg-emerald-500/15 text-[#00e478]"
                                : "bg-rose-500/15 text-rose-400"
                            }`}
                          >
                            Net: {netTransfersEvent > 0 ? `+${netTransfersEvent.toLocaleString()}` : netTransfersEvent.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
