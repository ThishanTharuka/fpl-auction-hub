"use client";

import Image from "next/image";
import { Zap, Crown, ArrowRightLeft, Target, Trophy } from "lucide-react";
import type { GameweekMetaInfo } from "@/lib/insights-utils";

interface GameweekMetaTabProps {
  meta: GameweekMetaInfo;
  currentGw: number;
}

export function GameweekMetaTab({ meta, currentGw }: GameweekMetaTabProps) {
  const activeEvent = meta.activeEvent;

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Scoring benchmark */}
        <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#869ab8] uppercase font-semibold">
            <span>Gameweek {currentGw} Scoring</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-black text-[#d6e4f9]">
                {meta.averageScore} pts
              </div>
              <div className="text-[11px] text-[#869ab8]">Average Entry Score</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-[#00e478]">
                {meta.highestScore || "N/A"}
              </div>
              <div className="text-[11px] text-[#869ab8]">Highest World Score</div>
            </div>
          </div>
        </div>

        {/* Most Captained */}
        <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#869ab8] uppercase font-semibold">
            <span>Most Captained</span>
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          {meta.mostCaptainedPlayer ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-[#1e2b3b] border border-[#3b4b3d] shrink-0">
                {meta.mostCaptainedPlayer.image_url ? (
                  <Image
                    src={meta.mostCaptainedPlayer.image_url}
                    alt={meta.mostCaptainedPlayer.web_name}
                    fill
                    sizes="44px"
                    className="object-cover object-top"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-[#d6e4f9] truncate">
                  {meta.mostCaptainedPlayer.full_name}
                </div>
                <div className="text-xs text-[#869ab8]">
                  {meta.mostCaptainedPlayer.team_name} · £{meta.mostCaptainedPlayer.price.toFixed(1)}m
                </div>
                <div className="text-xs font-semibold text-[#00e478] mt-0.5">
                  {meta.mostCaptainedPlayer.selected_by_percent}% Owned Globally
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#869ab8] mt-3">Data pending sync</div>
          )}
        </div>

        {/* Transfer Volume */}
        <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#869ab8] uppercase font-semibold">
            <span>Market Activity</span>
            <ArrowRightLeft className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#d6e4f9]">
              {meta.totalTransfersMade ? meta.totalTransfersMade.toLocaleString() : "0"}
            </div>
            <div className="text-[11px] text-[#869ab8] mt-0.5">
              Total transfers executed this gameweek window
            </div>
          </div>
        </div>
      </div>

      {/* Chip plays breakdown */}
      <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-sm text-[#d6e4f9]">
            Gameweek Chip Plays
          </h3>
          <span className="text-xs text-[#869ab8] ml-auto">
            {activeEvent?.name || `Gameweek ${currentGw}`}
          </span>
        </div>

        {meta.chipPlays.length === 0 ? (
          <div className="p-6 text-center text-[#869ab8] text-xs">
            No chip play statistics available for this gameweek.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {meta.chipPlays.map((chip) => (
              <div
                key={chip.name}
                className="bg-[#020f1e] p-3.5 rounded-xl border border-[#3b4b3d]/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-[#00e478]" />
                    <span className="font-semibold text-sm text-[#d6e4f9]">
                      {chip.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#00e478] bg-emerald-500/10 px-2 py-0.5 rounded">
                    {chip.count.toLocaleString()} played
                  </span>
                </div>
                <div className="w-full bg-[#1e2b3b] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#00e478] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(chip.percentage, 5)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#869ab8]">
                  <span>Share of chips this round</span>
                  <span className="font-semibold text-[#d6e4f9]">
                    {chip.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
