"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  TrendingUp,
  Sparkles,
  Coins,
  Compass,
  Calendar,
  AlertTriangle,
  Zap,
} from "lucide-react";
import type {
  EnrichedPlayer,
  FPLTeam,
  FPLEvent,
  FPLFixture,
} from "@/lib/fpl-types";
import {
  calculateMarketRadar,
  calculateExpectedStats,
  calculateValueRoi,
  calculateDifferentials,
  calculateStatusWatch,
  calculateGameweekMeta,
} from "@/lib/insights-utils";
import { KpiBanner } from "./components/kpi-banner";
import { MarketRadarTab } from "./components/market-radar-tab";
import { ExpectedStatsTab } from "./components/expected-stats-tab";
import { ValueRoiTab } from "./components/value-roi-tab";
import { DifferentialsTab } from "./components/differentials-tab";
import { FixtureTickerTab } from "./components/fixture-ticker-tab";
import { StatusWatchTab } from "./components/status-watch-tab";
import { GameweekMetaTab } from "./components/gameweek-meta-tab";
import { cn } from "@/lib/utils";

interface InsightsClientProps {
  players: EnrichedPlayer[];
  teams: FPLTeam[];
  events?: FPLEvent[];
  fixtures?: FPLFixture[];
  currentGameweek: number;
  liveGameweek?: number | null;
  dailyPriceHistory?: Record<string, Record<string, number>>;
}

type TabType =
  | "market"
  | "expected"
  | "value"
  | "differentials"
  | "fixtures"
  | "status"
  | "meta";

const TABS: Array<{ id: TabType; label: string; icon: typeof TrendingUp }> = [
  { id: "market", label: "Market Radar", icon: TrendingUp },
  { id: "expected", label: "Expected Stats", icon: Sparkles },
  { id: "value", label: "Value & ROI", icon: Coins },
  { id: "differentials", label: "Differentials", icon: Compass },
  { id: "fixtures", label: "Fixture Ticker", icon: Calendar },
  { id: "status", label: "Status Watch", icon: AlertTriangle },
  { id: "meta", label: "Gameweek Meta", icon: Zap },
];

const SPRING_TAB = { type: "spring" as const, bounce: 0, duration: 0.28 };

export function InsightsClient({
  players,
  teams,
  events,
  fixtures = [],
  currentGameweek,
  liveGameweek,
  dailyPriceHistory,
}: InsightsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("market");
  const shouldReduce = useReducedMotion();

  // In-memory calculated insight models
  const marketRadar = useMemo(
    () => calculateMarketRadar(players, dailyPriceHistory),
    [players, dailyPriceHistory],
  );
  const expectedStats = useMemo(() => calculateExpectedStats(players), [players]);
  const valueRoi = useMemo(() => calculateValueRoi(players), [players]);
  const differentials = useMemo(() => calculateDifferentials(players, 10), [players]);
  const statusWatch = useMemo(() => calculateStatusWatch(players), [players]);
  const gameweekMeta = useMemo(
    () => calculateGameweekMeta(events, currentGameweek, players),
    [events, currentGameweek, players],
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          FPL Insights
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
          Market trends, expected stats (xG/xA), value radar, fixture runs, and differential scouting.
        </p>
      </div>

      {/* Gameweek Pulse Banner */}
      <KpiBanner
        currentGw={currentGameweek}
        liveGw={liveGameweek}
        meta={gameweekMeta}
        market={marketRadar}
      />

      {/* Main Tabs Navigation — Apple frosted glass sticky rail */}
      <div className="sticky top-14 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 mb-6 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65 border-b border-border/40">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none p-1 rounded-full bg-muted/60 border border-border/50 backdrop-blur-md w-fit max-w-full">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <motion.button
                key={id}
                onClick={() => setActiveTab(id)}
                whileTap={shouldReduce ? undefined : { scale: 0.95 }}
                transition={SPRING_TAB}
                className={cn(
                  "relative flex items-center gap-2 min-h-[36px] px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 z-10",
                  isActive
                    ? "text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-insights-tab-pill"
                    className="absolute inset-0 rounded-full bg-primary shadow-xs -z-10"
                    transition={shouldReduce ? { duration: 0 } : SPRING_TAB}
                  />
                )}
                <Icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                <span>{label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels with Apple Spring Crossfade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === "market" && <MarketRadarTab data={marketRadar} />}
          {activeTab === "expected" && <ExpectedStatsTab data={expectedStats} />}
          {activeTab === "value" && <ValueRoiTab players={valueRoi} />}
          {activeTab === "differentials" && (
            <DifferentialsTab differentials={differentials} />
          )}
          {activeTab === "fixtures" && (
            <FixtureTickerTab
              teams={teams}
              fixtures={fixtures}
              currentGw={currentGameweek}
            />
          )}
          {activeTab === "status" && (
            <StatusWatchTab
              flaggedPlayers={statusWatch.flaggedPlayers}
              yellowCardAlerts={statusWatch.yellowCardAlerts}
            />
          )}
          {activeTab === "meta" && (
            <GameweekMetaTab
              meta={gameweekMeta}
              currentGw={currentGameweek}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
