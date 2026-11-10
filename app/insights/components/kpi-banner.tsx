"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Clock, TrendingUp, TrendingDown, Award, UserCheck } from "lucide-react";
import type { GameweekMetaInfo, MarketRadarData } from "@/lib/insights-utils";

interface KpiBannerProps {
  currentGw: number;
  liveGw: number | null | undefined;
  meta: GameweekMetaInfo;
  market: MarketRadarData;
}

const CARD_SHADOW = {
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
};

export function KpiBanner({
  currentGw,
  liveGw,
  meta,
  market,
}: KpiBannerProps) {
  const shouldReduce = useReducedMotion();
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
      <motion.div
        whileHover={shouldReduce ? undefined : { y: -1.5 }}
        transition={{ duration: 0.15 }}
        style={CARD_SHADOW}
        className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground">
            Gameweek {currentGw}
          </span>
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-primary border border-emerald-500/30">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              Live
            </span>
          ) : (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40">
              Upcoming
            </span>
          )}
        </div>
        <div className="mt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{deadlineDate || "Deadline TBD"}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Avg Score: <strong className="text-foreground font-semibold tabular-nums">{meta.averageScore} pts</strong>
          </div>
        </div>
      </motion.div>

      {/* Most Captained */}
      <motion.div
        whileHover={shouldReduce ? undefined : { y: -1.5 }}
        transition={{ duration: 0.15 }}
        style={CARD_SHADOW}
        className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 flex flex-col justify-between"
      >
        <span className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground flex items-center gap-1">
          <Award className="w-3.5 h-3.5 text-amber-500" />
          Most Captained
        </span>
        {meta.mostCaptainedPlayer ? (
          <div className="mt-2.5 flex items-center gap-2.5">
            {meta.mostCaptainedPlayer.image_url && (
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted border border-border/60 shrink-0 shadow-xs">
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
              <div className="font-semibold text-sm text-foreground truncate tracking-tight">
                {meta.mostCaptainedPlayer.web_name}
              </div>
              <div className="text-[11px] text-muted-foreground truncate tabular-nums">
                {meta.mostCaptainedPlayer.team_short} · {meta.mostCaptainedPlayer.selected_by_percent}% owned
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground mt-2">No captaincy data</div>
        )}
      </motion.div>

      {/* Most Transferred In */}
      <motion.div
        whileHover={shouldReduce ? undefined : { y: -1.5 }}
        transition={{ duration: 0.15 }}
        style={CARD_SHADOW}
        className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 flex flex-col justify-between"
      >
        <span className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground flex items-center gap-1">
          <UserCheck className="w-3.5 h-3.5 text-primary" />
          Top Transfer In
        </span>
        {meta.mostTransferredInPlayer ? (
          <div className="mt-2.5 flex items-center gap-2.5">
            {meta.mostTransferredInPlayer.image_url && (
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted border border-border/60 shrink-0 shadow-xs">
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
              <div className="font-semibold text-sm text-foreground truncate tracking-tight">
                {meta.mostTransferredInPlayer.web_name}
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-primary font-semibold truncate tabular-nums">
                +{meta.mostTransferredInPlayer.transfers_in_event?.toLocaleString() ?? 0} in
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground mt-2">Data syncing</div>
        )}
      </motion.div>

      {/* Market Mover Count */}
      <motion.div
        whileHover={shouldReduce ? undefined : { y: -1.5 }}
        transition={{ duration: 0.15 }}
        style={CARD_SHADOW}
        className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground">
            Price Movers
          </span>
          <span className="text-[10px] font-medium text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full border border-border/50">
            Today
          </span>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-primary flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-700 dark:text-primary tabular-nums">
                +{market.totalDailyRisersCount}
              </div>
              <div className="text-[10px] text-muted-foreground tabular-nums">GW: +{market.totalRisersCount}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-sm font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                -{market.totalDailyFallersCount}
              </div>
              <div className="text-[10px] text-muted-foreground tabular-nums">GW: -{market.totalFallersCount}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Highest GW Score */}
      <motion.div
        whileHover={shouldReduce ? undefined : { y: -1.5 }}
        transition={{ duration: 0.15 }}
        style={CARD_SHADOW}
        className="col-span-2 md:col-span-4 lg:col-span-1 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 flex flex-col justify-between"
      >
        <span className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground">
          Top Score
        </span>
        <div className="mt-2.5 flex items-baseline justify-between lg:block">
          <div className="text-xl sm:text-2xl font-bold text-foreground tracking-tight tabular-nums">
            {meta.highestScore ? `${meta.highestScore} pts` : "Pending"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            World highest entry
          </div>
        </div>
      </motion.div>
    </div>
  );
}
