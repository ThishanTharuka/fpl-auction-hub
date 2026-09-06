"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Search } from "lucide-react";
import type { MarketRadarData, MarketPlayerSummary } from "@/lib/insights-utils";

interface MarketRadarTabProps {
  data: MarketRadarData;
}

type MarketSubView = "risers" | "fallers" | "netIn" | "netOut";

export function MarketRadarTab({ data }: MarketRadarTabProps) {
  const [activeView, setActiveView] = useState<MarketSubView>("risers");
  const [search, setSearch] = useState("");

  const currentList: MarketPlayerSummary[] = useMemo(() => {
    let list: MarketPlayerSummary[] = [];
    switch (activeView) {
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
      {/* Top summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              Price Risers
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
              Price Fallers
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
                </thead>
                <tbody className="divide-y divide-[#3b4b3d]/40">
                  {currentList.map(({ player, netTransfersEvent, costChangeEvent, costChangeStart, ownershipPercent }) => (
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
                          {netTransfersEvent > 0 ? `+${netTransfersEvent.toLocaleString()}` : netTransfersEvent.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-[#3b4b3d]/40">
              {currentList.map(({ player, netTransfersEvent, costChangeEvent, costChangeStart, ownershipPercent }) => (
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
                        {costChangeStart >= 0 ? `+£${(costChangeStart / 10).toFixed(1)}m` : `-£${Math.abs(costChangeStart / 10).toFixed(1)}m`}
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
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
