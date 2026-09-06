"use client";

import { useState, useMemo } from "react";
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

interface InsightsClientProps {
  players: EnrichedPlayer[];
  teams: FPLTeam[];
  events?: FPLEvent[];
  fixtures?: FPLFixture[];
  currentGameweek: number;
  liveGameweek?: number | null;
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

export function InsightsClient({
  players,
  teams,
  events,
  fixtures = [],
  currentGameweek,
  liveGameweek,
}: InsightsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("market");

  // In-memory calculated insight models
  const marketRadar = useMemo(() => calculateMarketRadar(players), [players]);
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
        <h1 className="text-2xl sm:text-3xl font-black text-[#d6e4f9] tracking-tight">
          FPL Insights
        </h1>
        <p className="text-sm text-[#869ab8] mt-1">
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

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#3b4b3d] mb-6 scrollbar-none">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-[#00e478] text-[#061423] shadow-md shadow-[#00e478]/10"
                  : "bg-[#0f1c2c] text-[#869ab8] hover:text-[#d6e4f9] hover:bg-[#132030] border border-[#3b4b3d]"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#061423]" : "text-[#869ab8]"}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div>
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
      </div>
    </div>
  );
}
