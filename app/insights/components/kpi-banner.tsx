"use client";

import Image from "next/image";
import { Clock, TrendingUp, TrendingDown, Award, UserCheck } from "lucide-react";
import type { GameweekMetaInfo, MarketRadarData } from "@/lib/insights-utils";

interface KpiBannerProps {
  currentGw: number;
  liveGw: number | null | undefined;
  meta: GameweekMetaInfo;
  market: MarketRadarData;
}

export function KpiBanner({
  currentGw,
  liveGw,
  meta,
  market,
}: KpiBannerProps) {
  const isLive = liveGw !== null && liveGw !== undefined && liveGw === currentGw;
  const deadlineDate = meta.activeEvent?.deadline_time
    ? new Date(meta.activeEvent.deadline_time).toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      {/* Gameweek Status */}
      <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c]/80 backdrop-blur p-3.5 sm:p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8]">
            Gameweek {currentGw}
          </span>
          {isLive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-[#00e478] border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e478] animate-pulse" />
              Live
            </span>
          ) : (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#1e2b3b] text-[#869ab8]">
              Upcoming
            </span>
          )}
        </div>
        <div className="mt-2">
          <div className="flex items-center gap-1.5 text-xs text-[#b9cbb9]">
            <Clock className="w-3.5 h-3.5 text-[#00e478] shrink-0" />
            <span className="truncate">{deadlineDate || "Deadline TBD"}</span>
          </div>
          <div className="mt-1 text-xs text-[#869ab8]">
            Avg Score: <strong className="text-[#d6e4f9]">{meta.averageScore} pts</strong>
          </div>
        </div>
      </div>

      {/* Most Captained */}
      <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c]/80 backdrop-blur p-3.5 sm:p-4 flex flex-col justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8] flex items-center gap-1">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          Most Captained
        </span>
        {meta.mostCaptainedPlayer ? (
          <div className="mt-2 flex items-center gap-2.5">
            {meta.mostCaptainedPlayer.image_url && (
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#1e2b3b] border border-[#3b4b3d] shrink-0">
                <Image
                  src={meta.mostCaptainedPlayer.image_url}
                  alt={meta.mostCaptainedPlayer.web_name}
                  fill
                  sizes="32px"
                  className="object-cover object-top"
                />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold text-sm text-[#d6e4f9] truncate">
                {meta.mostCaptainedPlayer.web_name}
              </div>
              <div className="text-[11px] text-[#869ab8] truncate">
                {meta.mostCaptainedPlayer.team_short} · {meta.mostCaptainedPlayer.selected_by_percent}% owned
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#869ab8] mt-2">No captaincy data</div>
        )}
      </div>

      {/* Most Transferred In */}
      <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c]/80 backdrop-blur p-3.5 sm:p-4 flex flex-col justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8] flex items-center gap-1">
          <UserCheck className="w-3.5 h-3.5 text-[#00e478]" />
          Top Transfer In
        </span>
        {meta.mostTransferredInPlayer ? (
          <div className="mt-2 flex items-center gap-2.5">
            {meta.mostTransferredInPlayer.image_url && (
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#1e2b3b] border border-[#3b4b3d] shrink-0">
                <Image
                  src={meta.mostTransferredInPlayer.image_url}
                  alt={meta.mostTransferredInPlayer.web_name}
                  fill
                  sizes="32px"
                  className="object-cover object-top"
                />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold text-sm text-[#d6e4f9] truncate">
                {meta.mostTransferredInPlayer.web_name}
              </div>
              <div className="text-[11px] text-[#00e478] font-medium truncate">
                +{meta.mostTransferredInPlayer.transfers_in_event?.toLocaleString() ?? 0} in
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#869ab8] mt-2">Data syncing</div>
        )}
      </div>

      {/* Market Mover Count */}
      <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c]/80 backdrop-blur p-3.5 sm:p-4 flex flex-col justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8]">
          Price Movers (GW)
        </span>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00e478]">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#00e478]">
                {market.totalRisersCount}
              </div>
              <div className="text-[10px] text-[#869ab8]">Risen</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-sm font-bold text-rose-400">
                {market.totalFallersCount}
              </div>
              <div className="text-[10px] text-[#869ab8]">Fallen</div>
            </div>
          </div>
        </div>
      </div>

      {/* Highest GW Score */}
      <div className="col-span-2 md:col-span-4 lg:col-span-1 rounded-xl border border-[#3b4b3d] bg-[#0f1c2c]/80 backdrop-blur p-3.5 sm:p-4 flex flex-col justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#869ab8]">
          Top Score
        </span>
        <div className="mt-2 flex items-baseline justify-between lg:block">
          <div className="text-xl font-black text-[#d6e4f9]">
            {meta.highestScore ? `${meta.highestScore} pts` : "Pending"}
          </div>
          <div className="text-[11px] text-[#869ab8]">
            World highest entry
          </div>
        </div>
      </div>
    </div>
  );
}
