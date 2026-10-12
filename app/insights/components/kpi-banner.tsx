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
      <div className="rounded-xl border border-border bg-card/90 backdrop-blur p-3.5 sm:p-4 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Gameweek {currentGw}
          </span>
          {isLive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-primary dark:border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live
            </span>
          ) : (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Upcoming
            </span>
          )}
        </div>
        <div className="mt-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{deadlineDate || "Deadline TBD"}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Avg Score: <strong className="text-foreground font-semibold">{meta.averageScore} pts</strong>
          </div>
        </div>
      </div>

      {/* Most Captained */}
      <div className="rounded-xl border border-border bg-card/90 backdrop-blur p-3.5 sm:p-4 flex flex-col justify-between shadow-xs">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Award className="w-3.5 h-3.5 text-amber-500" />
          Most Captained
        </span>
        {meta.mostCaptainedPlayer ? (
          <div className="mt-2 flex items-center gap-2.5">
            {meta.mostCaptainedPlayer.image_url && (
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted border border-border shrink-0">
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
              <div className="font-semibold text-sm text-foreground truncate">
                {meta.mostCaptainedPlayer.web_name}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {meta.mostCaptainedPlayer.team_short} · {meta.mostCaptainedPlayer.selected_by_percent}% owned
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground mt-2">No captaincy data</div>
        )}
      </div>

      {/* Most Transferred In */}
      <div className="rounded-xl border border-border bg-card/90 backdrop-blur p-3.5 sm:p-4 flex flex-col justify-between shadow-xs">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <UserCheck className="w-3.5 h-3.5 text-primary" />
          Top Transfer In
        </span>
        {meta.mostTransferredInPlayer ? (
          <div className="mt-2 flex items-center gap-2.5">
            {meta.mostTransferredInPlayer.image_url && (
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted border border-border shrink-0">
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
              <div className="font-semibold text-sm text-foreground truncate">
                {meta.mostTransferredInPlayer.web_name}
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-primary font-semibold truncate">
                +{meta.mostTransferredInPlayer.transfers_in_event?.toLocaleString() ?? 0} in
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground mt-2">Data syncing</div>
        )}
      </div>

      {/* Market Mover Count */}
      <div className="rounded-xl border border-border bg-card/90 backdrop-blur p-3.5 sm:p-4 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Price Movers
          </span>
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
            Today
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-primary flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-700 dark:text-primary">
                +{market.totalDailyRisersCount}
              </div>
              <div className="text-[10px] text-muted-foreground">GW: +{market.totalRisersCount}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-sm font-bold text-rose-700 dark:text-rose-400">
                -{market.totalDailyFallersCount}
              </div>
              <div className="text-[10px] text-muted-foreground">GW: -{market.totalFallersCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Highest GW Score */}
      <div className="col-span-2 md:col-span-4 lg:col-span-1 rounded-xl border border-border bg-card/90 backdrop-blur p-3.5 sm:p-4 flex flex-col justify-between shadow-xs">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Top Score
        </span>
        <div className="mt-2 flex items-baseline justify-between lg:block">
          <div className="text-xl font-black text-foreground">
            {meta.highestScore ? `${meta.highestScore} pts` : "Pending"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            World highest entry
          </div>
        </div>
      </div>
    </div>
  );
}
