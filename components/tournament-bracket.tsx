"use client";

import { useState, useMemo, useCallback } from "react";
import { TeamAvatar } from "@/components/team-avatar";
import type { CompetitionFixtureRow, CompetitionTeamRow } from "@/lib/tournament/types";
import {
  Trophy,
  Shield,
  Zap,
  Layers,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";

// ── Types & Configuration ─────────────────────────────────────────────────────

type LegDetail = {
  leg: number;
  gw: number;
  homePoints: number | null;
  awayPoints: number | null;
};

type Match = {
  phase: string;
  tieIndex: number;
  gw: number;
  gws: number[];
  homeId: string | null;
  awayId: string | null;
  homePoints: number | null;
  awayPoints: number | null;
  isTwoLeg: boolean;
  status: string;
  legs: LegDetail[];
  originHome: string;
  originAway: string;
  title: string;
  winnerAdvancesTo: string;
  loserDropsTo?: string;
};

const PHASE_CONFIG: Record<
  string,
  {
    title: string;
    originHome: string;
    originAway: string;
    category: "qualifiers" | "eliminators" | "decider" | "final";
    roundName: string;
    gwLabel: string;
    winnerAdvancesTo: string;
    loserDropsTo?: string;
  }
> = {
  q1: { title: "Qualifier 1", originHome: "Seed A1", originAway: "Seed B1", category: "qualifiers", roundName: "Opening", gwLabel: "GW 30 · 31", winnerAdvancesTo: "Q5", loserDropsTo: "E5" },
  q2: { title: "Qualifier 2", originHome: "Seed A2", originAway: "Seed B2", category: "qualifiers", roundName: "Opening", gwLabel: "GW 30 · 31", winnerAdvancesTo: "Q6", loserDropsTo: "E6" },
  q3: { title: "Qualifier 3", originHome: "Seed A3", originAway: "Seed B3", category: "qualifiers", roundName: "Opening", gwLabel: "GW 30 · 31", winnerAdvancesTo: "Q6", loserDropsTo: "E6" },
  q4: { title: "Qualifier 4", originHome: "Seed A4", originAway: "Seed B4", category: "qualifiers", roundName: "Opening", gwLabel: "GW 30 · 31", winnerAdvancesTo: "Q5", loserDropsTo: "E5" },
  q5: { title: "Qualifier 5", originHome: "Winner Q1", originAway: "Winner Q4", category: "qualifiers", roundName: "Qualifiers Semis", gwLabel: "GW 32 · 33", winnerAdvancesTo: "Q7", loserDropsTo: "E9" },
  q6: { title: "Qualifier 6", originHome: "Winner Q2", originAway: "Winner Q3", category: "qualifiers", roundName: "Qualifiers Semis", gwLabel: "GW 32 · 33", winnerAdvancesTo: "Q7", loserDropsTo: "E9" },
  q7: { title: "Qualifier 7", originHome: "Winner Q5", originAway: "Winner Q6", category: "qualifiers", roundName: "Qualifiers Final", gwLabel: "GW 36", winnerAdvancesTo: "Grand Final", loserDropsTo: "E13" },

  e1: { title: "Eliminator 1", originHome: "Seed A5", originAway: "Seed B5", category: "eliminators", roundName: "Opening", gwLabel: "GW 30 · 31", winnerAdvancesTo: "E7" },
  e2: { title: "Eliminator 2", originHome: "Seed A6", originAway: "Seed B6", category: "eliminators", roundName: "Opening", gwLabel: "GW 30 · 31", winnerAdvancesTo: "E8" },
  e3: { title: "Eliminator 3", originHome: "Seed A7", originAway: "Seed B7", category: "eliminators", roundName: "Opening", gwLabel: "GW 30 · 31", winnerAdvancesTo: "E8" },
  e4: { title: "Eliminator 4", originHome: "Seed A8", originAway: "Seed B8", category: "eliminators", roundName: "Opening", gwLabel: "GW 30 · 31", winnerAdvancesTo: "E7" },
  e5: { title: "Eliminator 5", originHome: "Loser Q1", originAway: "Loser Q4", category: "eliminators", roundName: "Round 1", gwLabel: "GW 32 · 33", winnerAdvancesTo: "E10" },
  e6: { title: "Eliminator 6", originHome: "Loser Q2", originAway: "Loser Q3", category: "eliminators", roundName: "Round 1", gwLabel: "GW 32 · 33", winnerAdvancesTo: "E11" },
  e7: { title: "Eliminator 7", originHome: "Winner E1", originAway: "Winner E4", category: "eliminators", roundName: "Round 2", gwLabel: "GW 32 · 33", winnerAdvancesTo: "E11" },
  e8: { title: "Eliminator 8", originHome: "Winner E2", originAway: "Winner E3", category: "eliminators", roundName: "Round 2", gwLabel: "GW 32 · 33", winnerAdvancesTo: "E10" },
  e9: { title: "Eliminator 9", originHome: "Loser Q5", originAway: "Loser Q6", category: "eliminators", roundName: "Round 3", gwLabel: "GW 34 · 35", winnerAdvancesTo: "Decider" },
  e10: { title: "Eliminator 10", originHome: "Winner E5", originAway: "Winner E8", category: "eliminators", roundName: "Round 3", gwLabel: "GW 34 · 35", winnerAdvancesTo: "Decider" },
  e11: { title: "Eliminator 11", originHome: "Winner E6", originAway: "Winner E7", category: "eliminators", roundName: "Round 4", gwLabel: "GW 34 · 35", winnerAdvancesTo: "Decider" },
  decider: { title: "Triangular Decider", originHome: "Winner E9", originAway: "Winner E10/E11", category: "decider", roundName: "Triangular Match", gwLabel: "GW 36", winnerAdvancesTo: "E13" },
  e13: { title: "Eliminator 13", originHome: "Loser Q7", originAway: "Winner Decider", category: "eliminators", roundName: "Lower Final", gwLabel: "GW 37", winnerAdvancesTo: "Grand Final" },

  final: { title: "Grand Final", originHome: "Winner Q7", originAway: "Winner E13", category: "final", roundName: "Grand Final", gwLabel: "GW 38", winnerAdvancesTo: "Champion" },
};

function getDeciderMatchInfo(tieIndex: number) {
  if (tieIndex === 21 || tieIndex === 1) {
    return { title: "Decider Match 1", originHome: "Winner E9", originAway: "Winner E10", label: "DECIDER 1" };
  }
  if (tieIndex === 22 || tieIndex === 2) {
    return { title: "Decider Match 2", originHome: "Winner E9", originAway: "Winner E11", label: "DECIDER 2" };
  }
  if (tieIndex === 23 || tieIndex === 3) {
    return { title: "Decider Match 3", originHome: "Winner E10", originAway: "Winner E11", label: "DECIDER 3" };
  }
  return { title: "Decider Match", originHome: "Decider Team A", originAway: "Decider Team B", label: "DECIDER" };
}

// ── SVG Bracket Forks & Routing Connectors ───────────────────────────────────

function BracketFork({
  color = "#3b4b3d",
  width = 32,
  topPercent = 25,
  bottomPercent = 75,
  showArrow = false,
}: {
  color?: string;
  width?: number;
  topPercent?: number;
  bottomPercent?: number;
  showArrow?: boolean;
}) {
  const mid = (topPercent + bottomPercent) / 2;
  return (
    <div
      className="relative shrink-0 self-stretch pointer-events-none"
      style={{ width }}
    >
      <svg
        className="w-full h-full overflow-visible"
        viewBox="0 0 32 100"
        preserveAspectRatio="none"
      >
        <path
          d={`M 0 ${topPercent} H 16 V ${bottomPercent} H 0`}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={`M 16 ${mid} H 32`}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
        />
        {showArrow && (
          <polygon
            points={`28,${mid - 3.5} 32,${mid} 28,${mid + 3.5}`}
            fill={color}
          />
        )}
      </svg>
    </div>
  );
}

// Connector between Opening Round [E1, E4, E2, E3] and Eliminators R1 & R2 [E6, E7, E5, E8]
function EliminatorsConnectorR1ToR2({
  color = "#3b4b3d",
  dropColor = "#3b82f6",
  width = 80,
}: {
  color?: string;
  dropColor?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 80 100" preserveAspectRatio="none">
        {/* Drop indicator into E6 (y=11) from Q2L & Q3L (dashed, closer to card at x=64) */}
        <path
          d="M 64 2 V 11 H 80"
          fill="none"
          stroke={dropColor}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon points="75,9.5 80,11 75,12.5" fill={dropColor} />

        {/* E1 (y=11) and E4 (y=37) into E7 (y=37) */}
        <path d="M 0 11 H 22 V 37 H 80" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 0 37 H 22" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <polygon points="75,35.5 80,37 75,38.5" fill={color} />

        {/* Drop indicator into E5 (y=63) from Q1L & Q4L (dashed, starts in gap at y=48 so it doesn't cross E7) */}
        <path
          d="M 64 48 V 63 H 80"
          fill="none"
          stroke={dropColor}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon points="75,61.5 80,63 75,64.5" fill={dropColor} />

        {/* E2 (y=63) and E3 (y=89) into E8 (y=89) */}
        <path d="M 0 63 H 22 V 89 H 80" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 0 89 H 22" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <polygon points="75,87.5 80,89 75,90.5" fill={color} />
      </svg>
    </div>
  );
}

// Connector between Eliminators R1 & R2 [E6, E7, E5, E8] and Eliminators R3 & R4 [E9, E11, E10]
function EliminatorsConnectorR2ToR3({
  color = "#3b4b3d",
  dropColor = "#3b82f6",
  width = 96,
}: {
  color?: string;
  dropColor?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 96 100" preserveAspectRatio="none">
        {/* Drop into E9 (y=16) from Q5L & Q6L - positioned close to the card at x=76 with dashed line so it doesn't cross E6 */}
        <path
          d="M 76 2 V 16 H 96"
          fill="none"
          stroke={dropColor}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon points="91,14.5 96,16 91,17.5" fill={dropColor} />

        {/* E6 (y=11) and E7 (y=37) into E11 (y=50) */}
        <path d="M 0 11 H 40 V 50 H 96" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 0 37 H 40" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <polygon points="91,48.5 96,50 91,51.5" fill={color} />

        {/* E5 (y=63) and E8 (y=89) into E10 (y=84) */}
        <path d="M 0 63 H 40 V 84 H 96" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 0 89 H 40 V 84" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="91,82.5 96,84 91,85.5" fill={color} />
      </svg>
    </div>
  );
}

// Connector between Eliminators R3 & R4 [E9, E11, E10] and Triangular Decider
function EliminatorsConnectorR3ToDecider({
  color = "#3b4b3d",
  width = 72,
}: {
  color?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 72 100" preserveAspectRatio="none">
        {/* E9 (y=16), E11 (y=50), E10 (y=84) converge into Decider (y=50) */}
        <path d="M 0 16 H 28 V 84 H 0" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 0 50 H 28" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <path d="M 28 50 H 72" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <polygon points="67,48.5 72,50 67,51.5" fill={color} />
      </svg>
    </div>
  );
}

// Connector between Triangular Decider and Eliminators Final [E13]
function EliminatorsConnectorDeciderToE13({
  color = "#3b4b3d",
  dropColor = "#3b82f6",
  width = 64,
}: {
  color?: string;
  dropColor?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 64 100" preserveAspectRatio="none">
        {/* Decider Winner into E13 (y=50) */}
        <path d="M 0 50 H 64" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <polygon points="59,48.5 64,50 59,51.5" fill={color} />

        {/* Drop from Q7L into E13 (dashed) */}
        <path
          d="M 28 2 V 50"
          fill="none"
          stroke={dropColor}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon points="26,45 28,50 30,45" fill={dropColor} />
      </svg>

      <span className="absolute top-[16%] left-1 text-[9px] font-medium text-blue-400 bg-[#0a1828] border border-blue-500/40 px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm">
        Q7L Drop
      </span>
    </div>
  );
}

// Connector between Eliminators Final [E13] and Grand Final
function EliminatorsConnectorE13ToFinal({
  color = "#00e478",
  width = 64,
}: {
  color?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 64 100" preserveAspectRatio="none">
        <path d="M 0 50 H 64" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <polygon points="58,47.5 64,50 58,52.5" fill={color} />
      </svg>
    </div>
  );
}

// ── Unified Full Bracket Connectors (Upper, Mid, Lower) ──────────────────────

// Spacer 1 (width=80)
function FullBracketSpacer1Upper({
  color = "#3b4b3d",
  dropColor = "#3b82f6",
  width = 80,
}: {
  color?: string;
  dropColor?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 80 620" preserveAspectRatio="none">
        {/* Q1 (y=74) & Q4 (y=202) into Q5 (y=138) */}
        <path d="M 0 74 H 40 V 202 H 0" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 40 138 H 80" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <polygon points="75,136.5 80,138 75,139.5" fill={color} />

        {/* Q2 (y=418) & Q3 (y=546) into Q6 (y=482) */}
        <path d="M 0 418 H 40 V 546 H 0" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 40 482 H 80" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <polygon points="75,480.5 80,482 75,483.5" fill={color} />

        {/* Drop from Q1L & Q4L downward into E5 at x=52 */}
        <path d="M 52 138 V 620" fill="none" stroke={dropColor} strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />

        {/* Drop from Q2L & Q3L downward into E6 at x=64 */}
        <path d="M 64 482 V 620" fill="none" stroke={dropColor} strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function FullBracketSpacer1Mid({
  dropColor = "#3b82f6",
  width = 80,
}: {
  dropColor?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 80 80" preserveAspectRatio="none">
        {/* Drop from Q1L & Q4L to E5 */}
        <path d="M 52 0 V 80" fill="none" stroke={dropColor} strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        {/* Drop from Q2L & Q3L to E6 */}
        <path d="M 64 0 V 80" fill="none" stroke={dropColor} strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function FullBracketSpacer1Lower({
  color = "#3b4b3d",
  dropColor = "#3b82f6",
  width = 80,
}: {
  color?: string;
  dropColor?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 80 620" preserveAspectRatio="none">
        {/* Drop into E6 (y=74) continuing seamlessly from top at x=64 */}
        <path
          d="M 64 0 V 74 H 80"
          fill="none"
          stroke={dropColor}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon points="75,72.5 80,74 75,75.5" fill={dropColor} />

        {/* E1 (y=74) and E4 (y=202) into E7 (y=202) */}
        <path d="M 0 74 H 22 V 202 H 80" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 0 202 H 22" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <polygon points="75,200.5 80,202 75,203.5" fill={color} />

        {/* Drop into E5 (y=418) continuing seamlessly from top at x=52 */}
        <path
          d="M 52 0 V 418 H 80"
          fill="none"
          stroke={dropColor}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon points="75,416.5 80,418 75,419.5" fill={dropColor} />

        {/* E2 (y=418) and E3 (y=546) into E8 (y=546) */}
        <path d="M 0 418 H 22 V 546 H 80" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 0 546 H 22" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <polygon points="75,544.5 80,546 75,547.5" fill={color} />
      </svg>
    </div>
  );
}

// Spacer 2 (width=96)
function FullBracketSpacer2Upper({
  color = "#3b4b3d",
  dropColor = "#3b82f6",
  width = 96,
}: {
  color?: string;
  dropColor?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 96 620" preserveAspectRatio="none">
        <path d="M 0 138 H 96" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <path d="M 0 482 H 96" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        {/* Drop from Q5/Q6 downward into E9 starting at Q5 stem (y=138) */}
        <path d="M 76 138 V 620" fill="none" stroke={dropColor} strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function FullBracketSpacer2Mid({
  dropColor = "#3b82f6",
  width = 96,
}: {
  dropColor?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 96 80" preserveAspectRatio="none">
        <path d="M 76 0 V 80" fill="none" stroke={dropColor} strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function FullBracketSpacer2Lower({
  color = "#3b4b3d",
  dropColor = "#3b82f6",
  width = 96,
}: {
  color?: string;
  dropColor?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 96 620" preserveAspectRatio="none">
        {/* Drop into E9 (y=74) continuing seamlessly from top at x=76 */}
        <path
          d="M 76 0 V 74 H 96"
          fill="none"
          stroke={dropColor}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon points="91,72.5 96,74 91,75.5" fill={dropColor} />

        {/* E6 (y=74) and E7 (y=202) into E11 (y=310) */}
        <path d="M 0 74 H 40 V 310 H 96" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 0 202 H 40" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <polygon points="91,308.5 96,310 91,311.5" fill={color} />

        {/* E5 (y=418) and E8 (y=546) into E10 (y=546) */}
        <path d="M 0 418 H 40 V 546 H 96" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 0 546 H 40" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <polygon points="91,544.5 96,546 91,547.5" fill={color} />
      </svg>
    </div>
  );
}

// Spacer 3 (width=72)
function FullBracketSpacer3Upper({
  color = "#3b4b3d",
  width = 72,
}: {
  color?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 72 620" preserveAspectRatio="none">
        <path d="M 0 138 H 36 V 482 H 0" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 36 310 H 72" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <polygon points="67,308.5 72,310 67,311.5" fill={color} />
      </svg>
    </div>
  );
}

function FullBracketSpacer3Lower({
  color = "#3b4b3d",
  width = 72,
}: {
  color?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 72 620" preserveAspectRatio="none">
        {/* E9 (y=74), E11 (y=310), E10 (y=546) converge into Decider (y=310) */}
        <path d="M 0 74 H 28 V 546 H 0" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 0 310 H 28" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <path d="M 28 310 H 72" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <polygon points="67,308.5 72,310 67,311.5" fill={color} />
      </svg>
    </div>
  );
}

// Spacer 4 (width=64)
function FullBracketSpacer4Upper({
  color = "#00e478",
  dropColor = "#3b82f6",
  width = 64,
}: {
  color?: string;
  dropColor?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 64 620" preserveAspectRatio="none">
        {/* Winner stem out of Q7 (y=310) to Col 5 */}
        <path d="M 0 310 H 64" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        {/* Drop from Q7 (y=310) down to E13 */}
        <path d="M 28 310 V 620" fill="none" stroke={dropColor} strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function FullBracketSpacer4Mid({
  dropColor = "#3b82f6",
  width = 64,
}: {
  dropColor?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none flex items-center justify-center" style={{ width }}>
      <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 64 80" preserveAspectRatio="none">
        <path d="M 28 0 V 80" fill="none" stroke={dropColor} strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      </svg>
      <span className="relative z-10 text-[9px] font-medium text-blue-400 bg-[#0a1828] border border-blue-500/40 px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm">
        Q7L Drop
      </span>
    </div>
  );
}

function FullBracketSpacer4Lower({
  color = "#3b4b3d",
  dropColor = "#3b82f6",
  width = 64,
}: {
  color?: string;
  dropColor?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 64 620" preserveAspectRatio="none">
        {/* Decider into E13 (y=310) */}
        <path d="M 0 310 H 64" fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <polygon points="59,308.5 64,310 59,311.5" fill={color} />

        {/* Drop from Q7L entering seamlessly from top at x=28 down into E13 */}
        <path
          d="M 28 0 V 310"
          fill="none"
          stroke={dropColor}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon points="26,305 28,310 30,305" fill={dropColor} />
      </svg>
    </div>
  );
}

// Spacer 5 (width=64) - Grand Final Convergence
function FullBracketSpacer5Upper({
  color = "#00e478",
  width = 64,
}: {
  color?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 64 620" preserveAspectRatio="none">
        {/* Exits Upper Champion at (0, 310), turns down at x=28 to bottom edge (28, 620) */}
        <path
          d="M 0 310 H 28 V 620"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function FullBracketSpacer5Mid({
  color = "#00e478",
  width = 64,
}: {
  color?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 64 80" preserveAspectRatio="none">
        {/* Upper line enters from top (28, 0) and meets at center (28, 40) */}
        <path
          d="M 28 0 V 40 H 64"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Lower line enters from bottom (28, 80) and meets at center (28, 40) */}
        <path
          d="M 28 80 V 40"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrowhead directly into Grand Final */}
        <polygon points="58,37.5 64,40 58,42.5" fill={color} />
      </svg>
    </div>
  );
}

function FullBracketSpacer5Lower({
  color = "#00e478",
  width = 64,
}: {
  color?: string;
  width?: number;
}) {
  return (
    <div className="relative shrink-0 self-stretch pointer-events-none" style={{ width }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 64 620" preserveAspectRatio="none">
        {/* Exits E13 at (0, 310), turns up at x=28 to top edge (28, 0) */}
        <path
          d="M 0 310 H 28 V 0"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function DirectStem({
  color = "#3b4b3d",
  width = 36,
  label,
}: {
  color?: string;
  width?: number;
  label?: string;
}) {
  return (
    <div
      className="relative flex flex-col items-center justify-center shrink-0 self-stretch pointer-events-none"
      style={{ width }}
    >
      {label && (
        <span className="text-[9px] font-medium text-[#849585] mb-1 tracking-tight">{label}</span>
      )}
      <svg className="w-full h-5 overflow-visible" viewBox="0 0 36 20">
        <path
          d="M 0 10 H 36"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
        />
        <polygon points="30,7 36,10 30,13" fill={color} />
      </svg>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TournamentBracket({
  teams,
  fixtures,
}: {
  teams: CompetitionTeamRow[];
  fixtures: CompetitionFixtureRow[];
}) {
  const [activeTab, setActiveTab] = useState<"all" | "qualifiers" | "eliminators">("all");
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [highlightedPhase, setHighlightedPhase] = useState<string | null>(null);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const teamName = useCallback((id: string | null) => (id ? teamById.get(id)?.name ?? "TBD" : "TBD"), [teamById]);
  const teamMeta = useCallback((id: string | null) => (id ? teamById.get(id) ?? null : null), [teamById]);

  // Group fixtures by tie
  const matches = useMemo(() => {
    const byTie = new Map<string, CompetitionFixtureRow[]>();
    for (const f of fixtures) {
      if (f.stage !== "knockout") continue;
      const k = `${f.phase}:${f.tie_index}`;
      const arr = byTie.get(k) ?? [];
      arr.push(f);
      byTie.set(k, arr);
    }

    const list: Match[] = [];
    for (const rows of byTie.values()) {
      rows.sort((a, b) => a.leg - b.leg);
      const first = rows[0]!;
      const gws = [...new Set(rows.map((r) => r.gw))].sort((a, b) => a - b);

      let homeTotal: number | null = 0;
      let awayTotal: number | null = 0;
      let hasPoints = false;
      let homeId: string | null = null;
      let awayId: string | null = null;
      let complete = true;
      let status = "scheduled";

      const legs: LegDetail[] = [];

      for (const r of rows) {
        if (r.home_points === null || r.away_points === null) complete = false;
        else hasPoints = true;

        const isHomeLeg = r.leg % 2 === 1;
        homeId = isHomeLeg ? r.home_team_id : r.away_team_id;
        awayId = isHomeLeg ? r.away_team_id : r.home_team_id;

        const h = isHomeLeg ? r.home_points : r.away_points;
        const a = isHomeLeg ? r.away_points : r.home_points;

        legs.push({
          leg: r.leg,
          gw: r.gw,
          homePoints: h,
          awayPoints: a,
        });

        if (h !== null && a !== null) {
          homeTotal = (homeTotal ?? 0) + h;
          awayTotal = (awayTotal ?? 0) + a;
        }

        if (r.status === "scored") status = "scored";
        else if (r.status === "manual" && status !== "scored") status = "manual";
      }

      const displayHome = homeId ?? first.home_team_id;
      const displayAway = awayId ?? first.away_team_id;
      const cfg = PHASE_CONFIG[first.phase];

      let originHome = cfg?.originHome ?? "TBD";
      let originAway = cfg?.originAway ?? "TBD";
      let title = cfg?.title ?? first.phase.toUpperCase();

      if (first.phase === "decider") {
        const dInfo = getDeciderMatchInfo(first.tie_index);
        originHome = dInfo.originHome;
        originAway = dInfo.originAway;
        title = dInfo.title;
      }

      list.push({
        phase: first.phase,
        tieIndex: first.tie_index,
        gw: gws[0] ?? first.gw,
        gws,
        homeId: displayHome,
        awayId: displayAway,
        homePoints: complete && hasPoints ? homeTotal : null,
        awayPoints: complete && hasPoints ? awayTotal : null,
        isTwoLeg: rows.length === 2,
        status,
        legs,
        originHome,
        originAway,
        title,
        winnerAdvancesTo: cfg?.winnerAdvancesTo ?? "Next Round",
        loserDropsTo: cfg?.loserDropsTo,
      });
    }

    const order = [
      "q1", "q2", "q3", "q4",
      "e1", "e2", "e3", "e4",
      "q5", "q6",
      "e5", "e6",
      "e7", "e8",
      "e9", "e10",
      "e11",
      "q7", "decider",
      "e13",
      "final",
    ];
    list.sort((a, b) => order.indexOf(a.phase) - order.indexOf(b.phase) || a.gw - b.gw || a.tieIndex - b.tieIndex);
    return list;
  }, [fixtures]);

  const matchesByPhase = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of matches) {
      const arr = map.get(m.phase) ?? [];
      arr.push(m);
      map.set(m.phase, arr);
    }
    return map;
  }, [matches]);

  const matchCounts = useMemo(() => {
    const total = matches.length;
    const scored = matches.filter((m) => m.status === "scored").length;
    return { total, scored, scheduled: total - scored };
  }, [matches]);

  // Triangular Decider: 3 Teams Leaderboard (highest single GW 36 score wins)
  const deciderTeams = useMemo(() => {
    const deciderMatches = matches.filter((m) => m.phase === "decider");

    // Check if teams have been assigned to decider fixtures
    const scoresByTeam = new Map<string, number | null>();
    for (const m of deciderMatches) {
      if (m.homeId) {
        if (!scoresByTeam.has(m.homeId) || scoresByTeam.get(m.homeId) === null) {
          scoresByTeam.set(m.homeId, m.homePoints);
        }
      }
      if (m.awayId) {
        if (!scoresByTeam.has(m.awayId) || scoresByTeam.get(m.awayId) === null) {
          scoresByTeam.set(m.awayId, m.awayPoints);
        }
      }
    }

    if (scoresByTeam.size > 0) {
      const rows = Array.from(scoresByTeam.entries()).map(([teamId, pts]) => ({
        key: teamId,
        teamId,
        name: teamName(teamId),
        meta: teamMeta(teamId),
        pts,
        origin: null as string | null,
      }));

      // Sort by points descending (highest score at #1)
      rows.sort((a, b) => {
        if (a.pts !== null && b.pts !== null) return b.pts - a.pts;
        if (a.pts !== null) return -1;
        if (b.pts !== null) return 1;
        return 0;
      });

      const isComplete = rows.length === 3 && rows.every((r) => r.pts !== null);
      return {
        rows,
        isComplete,
      };
    }

    // If teams are not in decider fixtures yet, determine from feeding matches E9, E11, E10
    const slots = [
      { phase: "e9", fallback: "Winner E9", origin: "From Eliminator 9" },
      { phase: "e11", fallback: "Winner E11", origin: "From Eliminator 11" },
      { phase: "e10", fallback: "Winner E10", origin: "From Eliminator 10" },
    ];

    const rows = slots.map((s) => {
      const m = matchesByPhase.get(s.phase)?.[0];
      let teamId: string | null = null;
      if (m && m.status === "scored" && m.homePoints !== null && m.awayPoints !== null) {
        teamId = (m.homePoints ?? 0) >= (m.awayPoints ?? 0) ? m.homeId : m.awayId;
      }
      return {
        key: s.phase,
        teamId,
        name: teamId ? teamName(teamId) : s.fallback,
        meta: teamId ? teamMeta(teamId) : null,
        pts: null as number | null,
        origin: s.origin,
      };
    });

    return {
      rows,
      isComplete: false,
    };
  }, [matches, matchesByPhase, teamName, teamMeta]);

  // ── Match Card Renderer ─────────────────────────────────────────────────────

  const renderMatchCard = (m: Match, _compact = false) => {
    const home = teamMeta(m.homeId);
    const away = teamMeta(m.awayId);
    const isFinal = m.phase === "final";
    const isDecider = m.phase === "decider";
    const isQualifierDropMatch = m.phase === "e5" || m.phase === "e6" || m.phase === "e9";
    const isEliminationPath = m.phase.startsWith("e") || isDecider;
    const isScored = m.status === "scored" && m.homePoints !== null && m.awayPoints !== null;
    const isHomeWinner = isScored && (m.homePoints ?? 0) > (m.awayPoints ?? 0);
    const isAwayWinner = isScored && (m.awayPoints ?? 0) > (m.homePoints ?? 0);
    const gwLabel = m.gws.length > 1 ? `GW ${m.gws.join(" · ")}` : `GW ${m.gw}`;
    const cardId = `${m.phase}-${m.tieIndex}`;
    const isExpanded = expandedMatch === cardId;
    const isHighlighted = highlightedPhase === m.phase;

    const getDropLabel = (phase: string) => {
      if (phase === "e5") return "Q1L · Q4L";
      if (phase === "e6") return "Q2L · Q3L";
      if (phase === "e9") return "Q5L · Q6L";
      return null;
    };
    const dropLabel = getDropLabel(m.phase);

    const phaseTag = isDecider
      ? getDeciderMatchInfo(m.tieIndex).label
      : m.phase.toUpperCase();

    return (
      <div
        key={cardId}
        onMouseEnter={() => setHighlightedPhase(m.phase)}
        onMouseLeave={() => setHighlightedPhase(null)}
        className={`group relative rounded-lg border transition-all duration-150 ${
          isFinal
            ? "border-[#00e478]/50 bg-[#0f1c2c] hover:border-[#00e478]"
            : isDecider
              ? isHighlighted
                ? "border-violet-400 bg-[#132030] shadow-[0_0_12px_rgba(139,92,246,0.2)]"
                : "border-violet-500/30 bg-[#0f1c2c] hover:border-orange-500 hover:shadow-[0_0_10px_rgba(249,115,22,0.15)]"
              : isEliminationPath
                ? isHighlighted
                  ? isQualifierDropMatch
                    ? "border-blue-500/80 bg-[#142030] shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                    : "border-orange-500/80 bg-[#142030] shadow-[0_0_12px_rgba(249,115,22,0.2)]"
                  : isQualifierDropMatch
                    ? "border-[#3b4b3d] bg-[#0f1c2c] hover:border-blue-400 hover:shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                    : "border-[#3b4b3d] bg-[#0f1c2c] hover:border-orange-500 hover:shadow-[0_0_10px_rgba(249,115,22,0.15)]"
                : isHighlighted
                  ? "border-[#00e478]/50 bg-[#132030]"
                  : "border-[#3b4b3d] bg-[#0f1c2c] hover:border-[#00e478]/50"
        }`}
      >
        {/* Card Header Strip */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#3b4b3d]/60 bg-[#0a1828] rounded-t-lg">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`text-[10px] font-semibold tracking-wide uppercase ${
                isDecider
                  ? "text-violet-300"
                  : isQualifierDropMatch
                    ? "text-[#849585] group-hover:text-blue-400"
                    : isEliminationPath
                      ? "text-[#849585] group-hover:text-orange-300"
                      : "text-[#849585] group-hover:text-[#00e478]"
              }`}
            >
              {phaseTag}
            </span>
            {dropLabel && (
              <span className="text-[9px] font-medium text-blue-400/90 bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.2 rounded group-hover:border-blue-400/60 group-hover:text-blue-300">
                {dropLabel}
              </span>
            )}
            {m.isTwoLeg && (
              <span className="text-[9px] font-medium text-[#849585] bg-[#1e2b3b] px-1.5 py-0.2 rounded">
                2 Legs
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#849585] font-medium shrink-0">
            <span>{gwLabel}</span>
            {m.isTwoLeg && (
              <button
                type="button"
                onClick={() => setExpandedMatch(isExpanded ? null : cardId)}
                className="text-[#849585] hover:text-[#d6e4f9] ml-1 inline-flex items-center"
                title="Toggle leg breakdown"
              >
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>

        {/* Teams & Scores */}
        <div className="p-2 space-y-1">
          {/* Home Team */}
          <div
            className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded transition-colors ${
              isHomeWinner
                ? "bg-[#00e478]/10 text-[#00e478]"
                : "text-[#d6e4f9] hover:bg-[#132030]/60"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <TeamAvatar
                name={teamName(m.homeId)}
                src={home?.avatar_url ?? null}
                color={home?.color ?? null}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className={`text-xs truncate ${m.homeId ? (isHomeWinner ? "font-bold text-[#00e478]" : "font-medium text-[#d6e4f9]") : "text-[#849585] italic font-normal"}`}>
                  {teamName(m.homeId)}
                </p>
                {!m.homeId && (
                  <p className="text-[9px] text-[#849585] leading-none">{m.originHome}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isHomeWinner && <Check className="h-3 w-3 text-[#00e478]" />}
              <span
                className={`text-xs font-semibold tabular-nums min-w-[20px] text-right ${
                  isScored
                    ? isHomeWinner
                      ? "text-[#00e478]"
                      : "text-[#849585]"
                    : "text-[#849585]/40"
                }`}
              >
                {isScored && m.homePoints !== null ? m.homePoints : "—"}
              </span>
            </div>
          </div>

          {/* Away Team */}
          <div
            className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded transition-colors ${
              isAwayWinner
                ? "bg-[#00e478]/10 text-[#00e478]"
                : "text-[#d6e4f9] hover:bg-[#132030]/60"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <TeamAvatar
                name={teamName(m.awayId)}
                src={away?.avatar_url ?? null}
                color={away?.color ?? null}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className={`text-xs truncate ${m.awayId ? (isAwayWinner ? "font-bold text-[#00e478]" : "font-medium text-[#d6e4f9]") : "text-[#849585] italic font-normal"}`}>
                  {teamName(m.awayId)}
                </p>
                {!m.awayId && (
                  <p className="text-[9px] text-[#849585] leading-none">{m.originAway}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isAwayWinner && <Check className="h-3 w-3 text-[#00e478]" />}
              <span
                className={`text-xs font-semibold tabular-nums min-w-[20px] text-right ${
                  isScored
                    ? isAwayWinner
                      ? "text-[#00e478]"
                      : "text-[#849585]"
                    : "text-[#849585]/40"
                }`}
              >
                {isScored && m.awayPoints !== null ? m.awayPoints : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Leg Detailed Breakdown (Collapsible) */}
        {m.isTwoLeg && isExpanded && (
          <div className="px-3 py-2 bg-[#0a1828] border-t border-[#3b4b3d]/60 text-[10px] space-y-1">
            <div className="text-[#849585] font-semibold text-[9px] uppercase tracking-wider flex justify-between">
              <span>Leg</span>
              <span>Score</span>
            </div>
            {m.legs.map((l) => (
              <div key={l.leg} className="flex justify-between items-center text-[#b9cbb9]">
                <span>Leg {l.leg} (GW{l.gw}):</span>
                <span className="font-medium tabular-nums text-[#d6e4f9]">
                  {l.homePoints ?? "—"} : {l.awayPoints ?? "—"}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-1 border-t border-[#3b4b3d]/40 text-[#00e478] font-semibold">
              <span>Aggregate:</span>
              <span className="tabular-nums">
                {m.homePoints ?? "—"} : {m.awayPoints ?? "—"}
              </span>
            </div>
          </div>
        )}

        {/* Path Destination Footer */}
        <div className="px-3 py-1 bg-[#0a1828]/50 border-t border-[#3b4b3d]/30 rounded-b-lg flex items-center justify-between text-[9px] text-[#849585]">
          <span className="truncate">To {m.winnerAdvancesTo}</span>
          {m.loserDropsTo && (
            <span className="text-[#849585] truncate">Drop: {m.loserDropsTo}</span>
          )}
        </div>
      </div>
    );
  };

  const renderTriangularDeciderCard = () => (
    <div className="group relative rounded-lg border border-violet-500/40 hover:border-violet-400 bg-[#0f1c2c] shadow-sm hover:shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all duration-150">
      {/* Card Header Strip */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-violet-500/30 bg-[#0a1828] rounded-t-lg">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-semibold text-violet-300 uppercase tracking-wide flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-violet-400" />
            Triangular Decider
          </span>
          <span className="text-[9px] font-medium text-violet-300 bg-violet-500/15 border border-violet-500/30 px-1.5 py-0.2 rounded">
            3 Teams
          </span>
        </div>
        <div className="text-[10px] text-[#849585] font-medium shrink-0">
          <span>GW 36</span>
        </div>
      </div>

      {/* 3 Teams List */}
      <div className="p-2 space-y-1.5">
        {deciderTeams.rows.map((team, idx) => {
          const isWinner = deciderTeams.isComplete && idx === 0 && team.pts !== null;
          return (
            <div
              key={team.key}
              className={`flex items-center justify-between p-1.5 rounded text-xs transition-colors ${
                isWinner
                  ? "bg-violet-500/20 border border-violet-500/50 text-violet-100 font-semibold"
                  : "bg-[#0a1828] border border-[#3b4b3d]/50 text-[#d6e4f9] hover:bg-[#132030]/60"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className={`text-[10px] px-1 rounded shrink-0 font-bold ${isWinner ? "text-violet-200" : "text-[#849585]"}`}>
                  #{idx + 1}
                </span>
                {team.teamId ? (
                  <TeamAvatar
                    name={team.name}
                    src={team.meta?.avatar_url ?? null}
                    color={team.meta?.color ?? null}
                    size="sm"
                  />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-[#1e2b3b] border border-[#3b4b3d] flex items-center justify-center text-[9px] text-[#849585] shrink-0 font-semibold">
                    TB
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-xs truncate ${team.teamId ? (isWinner ? "font-bold text-violet-100" : "font-medium text-[#d6e4f9]") : "text-[#849585] italic font-normal"}`}>
                    {team.name}
                  </p>
                  {!team.teamId && team.origin && (
                    <p className="text-[9px] text-[#849585] leading-none">{team.origin}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isWinner && <Check className="h-3 w-3 text-violet-300" />}
                <span
                  className={`text-xs font-semibold tabular-nums min-w-[20px] text-right ${
                    isWinner
                      ? "text-violet-200 font-bold"
                      : team.pts !== null
                        ? "text-violet-300"
                        : "text-[#849585]/40"
                  }`}
                >
                  {team.pts !== null ? team.pts : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-1 bg-[#0a1828]/50 border-t border-[#3b4b3d]/30 rounded-b-lg flex items-center justify-between text-[9px]">
        <div className="flex items-center gap-1 text-violet-300/90 font-medium">
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span>Winner to Eliminators Final</span>
        </div>
        <span className="text-[#849585]">1 of 3 advances</span>
      </div>
    </div>
  );

  // ── Render Views ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Top Header Controls & Stats Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#3b4b3d]">
        {/* Navigation Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#0a1828] border border-[#3b4b3d] rounded-lg overflow-x-auto">
          {[
            { key: "all", label: "Full Bracket", icon: Layers },
            { key: "qualifiers", label: "Qualifiers Path", icon: Shield },
            { key: "eliminators", label: "Eliminators Path", icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? "bg-[#00e478] text-[#003919]"
                    : "text-[#849585] hover:text-[#d6e4f9] hover:bg-[#1e2b3b]"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Match Count */}
        <div className="flex items-center gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 bg-[#0f1c2c] border border-[#3b4b3d] px-3 py-1.5 rounded-lg whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00e478] shrink-0" />
            <span className="text-[#849585]">
              <strong className="text-[#d6e4f9] font-bold">{matchCounts.scored}</strong> / {matchCounts.total} Played
            </span>
          </div>
        </div>
      </div>

      {/* ── Tab View 1: Qualifiers Path (Upper Bracket Tree) ───────────────── */}
      {activeTab === "qualifiers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#d6e4f9]">Upper Bracket Qualifiers Path</h3>
          </div>

          <div className="overflow-x-auto overflow-y-hidden pb-6 -mx-2 px-2">
            <div className="min-w-[1100px] space-y-4 pb-8">
              {/* TOP HEADER ROW */}
              <div className="flex items-center gap-0">
                <div className="w-[240px] shrink-0 bg-[#0f1c2c] border border-[#3b4b3d] px-3 py-2 rounded-lg text-center">
                  <p className="text-xs font-semibold text-[#d6e4f9]">Opening Round</p>
                  <p className="text-[10px] text-[#849585]">GW 30 · 31 · 2 Legs</p>
                </div>
                <div className="w-8 shrink-0" />
                <div className="w-[240px] shrink-0 bg-[#0f1c2c] border border-[#3b4b3d] px-3 py-2 rounded-lg text-center">
                  <p className="text-xs font-semibold text-[#d6e4f9]">Qualifiers Semi-Finals</p>
                  <p className="text-[10px] text-[#849585]">GW 32 · 33 · 2 Legs</p>
                </div>
                <div className="w-8 shrink-0" />
                <div className="w-[250px] shrink-0 bg-[#0f1c2c] border border-[#3b4b3d] px-3 py-2 rounded-lg text-center">
                  <p className="text-xs font-semibold text-[#d6e4f9]">Qualifiers Final</p>
                  <p className="text-[10px] text-[#849585]">GW 36 · 1 Leg</p>
                </div>
                <div className="w-9 shrink-0" />
                <div className="w-[260px] shrink-0 bg-[#0f1c2c] border border-[#00e478]/40 px-3 py-2 rounded-lg text-center">
                  <p className="text-xs font-semibold text-[#00e478] flex items-center justify-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5" /> Grand Final
                  </p>
                  <p className="text-[10px] text-[#849585]">GW 38 · 1 Leg</p>
                </div>
              </div>

              {/* TREE BRACKET */}
              <div className="flex items-center">
                <div className="flex flex-col gap-8 shrink-0">
                  <div className="flex items-center">
                    <div className="flex flex-col gap-3 w-[240px] shrink-0">
                      {(() => {
                        const q1 = matchesByPhase.get("q1")?.[0];
                        return q1 ? renderMatchCard(q1) : null;
                      })()}
                      {(() => {
                        const q4 = matchesByPhase.get("q4")?.[0];
                        return q4 ? renderMatchCard(q4) : null;
                      })()}
                    </div>

                    <BracketFork topPercent={25} bottomPercent={75} width={32} />

                    <div className="w-[240px] shrink-0">
                      {(() => {
                        const q5 = matchesByPhase.get("q5")?.[0];
                        return q5 ? renderMatchCard(q5) : null;
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="flex flex-col gap-3 w-[240px] shrink-0">
                      {(() => {
                        const q2 = matchesByPhase.get("q2")?.[0];
                        return q2 ? renderMatchCard(q2) : null;
                      })()}
                      {(() => {
                        const q3 = matchesByPhase.get("q3")?.[0];
                        return q3 ? renderMatchCard(q3) : null;
                      })()}
                    </div>

                    <BracketFork topPercent={25} bottomPercent={75} width={32} />

                    <div className="w-[240px] shrink-0">
                      {(() => {
                        const q6 = matchesByPhase.get("q6")?.[0];
                        return q6 ? renderMatchCard(q6) : null;
                      })()}
                    </div>
                  </div>
                </div>

                <BracketFork topPercent={24} bottomPercent={76} width={32} />

                <div className="w-[250px] shrink-0">
                  {(() => {
                    const q7 = matchesByPhase.get("q7")?.[0];
                    return q7 ? renderMatchCard(q7) : null;
                  })()}
                </div>

                <DirectStem color="#00e478" width={36} label="W(Q7)" />

                <div className="w-[260px] shrink-0">
                  {(() => {
                    const finalMatch = matchesByPhase.get("final")?.[0];
                    return finalMatch ? renderMatchCard(finalMatch) : null;
                  })()}
                </div>
              </div>
              <div className="h-6 shrink-0" />
            </div>
          </div>
        </div>
      )}

      {/* ── Tab View 2: Eliminators Path (Lower Bracket Tree) ──────────────── */}
      {activeTab === "eliminators" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#d6e4f9]">Lower Bracket Elimination Path</h3>
          </div>

          <div className="overflow-x-auto overflow-y-hidden pb-6 -mx-2 px-2">
            <div className="min-w-[1856px] space-y-4 pb-8">
              {/* TOP HEADER ROW FOR ELIMINATORS */}
              <div className="flex items-center gap-0">
                <div className="w-[240px] shrink-0 bg-[#0f1c2c] border border-[#3b4b3d] px-2.5 py-2 rounded-lg text-center">
                  <p className="text-xs font-semibold text-[#d6e4f9]">Opening Round</p>
                  <p className="text-[10px] text-[#849585]">GW 30 · 31 · 2 Legs</p>
                </div>
                <div className="w-[80px] shrink-0" />
                <div className="w-[240px] shrink-0 bg-[#0f1c2c] border border-[#3b4b3d] px-2.5 py-2 rounded-lg text-center">
                  <p className="text-xs font-semibold text-[#d6e4f9]">Eliminators R1 & R2</p>
                  <p className="text-[10px] text-[#849585]">GW 32 · 33 · 2 Legs</p>
                </div>
                <div className="w-[96px] shrink-0" />
                <div className="w-[240px] shrink-0 bg-[#0f1c2c] border border-[#3b4b3d] px-2.5 py-2 rounded-lg text-center">
                  <p className="text-xs font-semibold text-[#d6e4f9]">Eliminators R3 & R4</p>
                  <p className="text-[10px] text-[#849585]">GW 34 · 35 · 2 Legs</p>
                </div>
                <div className="w-[72px] shrink-0" />
                <div className="w-[260px] shrink-0 bg-[#0f1c2c] border border-violet-500/30 px-2.5 py-2 rounded-lg text-center">
                  <p className="text-xs font-semibold text-violet-300 flex items-center justify-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Triangular Decider
                  </p>
                  <p className="text-[10px] text-[#849585]">GW 36 · 3 Teams</p>
                </div>
                <div className="w-[64px] shrink-0" />
                <div className="w-[240px] shrink-0 bg-[#0f1c2c] border border-[#3b4b3d] px-2.5 py-2 rounded-lg text-center">
                  <p className="text-xs font-semibold text-[#d6e4f9]">Eliminators Final</p>
                  <p className="text-[10px] text-[#849585]">GW 37 · 1 Leg</p>
                </div>
                <div className="w-[64px] shrink-0" />
                <div className="w-[260px] shrink-0 bg-[#0f1c2c] border border-[#00e478]/40 px-2.5 py-2 rounded-lg text-center">
                  <p className="text-xs font-semibold text-[#00e478] flex items-center justify-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5" /> Grand Final
                  </p>
                  <p className="text-[10px] text-[#849585]">GW 38 · 1 Leg</p>
                </div>
              </div>

              {/* TREE BRACKET FOR ELIMINATORS */}
              <div className="flex items-stretch min-h-[520px]">
                {/* Stage 1: Opening Round (E1, E4, E2, E3) */}
                <div className="flex flex-col justify-between w-[240px] shrink-0 self-stretch gap-3">
                  {(() => {
                    const e1 = matchesByPhase.get("e1")?.[0];
                    return e1 ? renderMatchCard(e1, true) : null;
                  })()}
                  {(() => {
                    const e4 = matchesByPhase.get("e4")?.[0];
                    return e4 ? renderMatchCard(e4, true) : null;
                  })()}
                  {(() => {
                    const e2 = matchesByPhase.get("e2")?.[0];
                    return e2 ? renderMatchCard(e2, true) : null;
                  })()}
                  {(() => {
                    const e3 = matchesByPhase.get("e3")?.[0];
                    return e3 ? renderMatchCard(e3, true) : null;
                  })()}
                </div>

                {/* Connector 1: E1&E4 to E7, E2&E3 to E8, Drops into E6 & E5 */}
                <EliminatorsConnectorR1ToR2 width={80} />

                {/* Stage 2: Eliminators R1 & R2 (E6, E7, E5, E8) */}
                <div className="flex flex-col justify-between w-[240px] shrink-0 self-stretch gap-3">
                  {(() => {
                    const e6 = matchesByPhase.get("e6")?.[0];
                    return e6 ? renderMatchCard(e6, true) : null;
                  })()}
                  {(() => {
                    const e7 = matchesByPhase.get("e7")?.[0];
                    return e7 ? renderMatchCard(e7, true) : null;
                  })()}
                  {(() => {
                    const e5 = matchesByPhase.get("e5")?.[0];
                    return e5 ? renderMatchCard(e5, true) : null;
                  })()}
                  {(() => {
                    const e8 = matchesByPhase.get("e8")?.[0];
                    return e8 ? renderMatchCard(e8, true) : null;
                  })()}
                </div>

                {/* Connector 2: E6&E7 to E11, E5&E8 to E10, Q5L/Q6L Drop to E9 */}
                <EliminatorsConnectorR2ToR3 width={96} />

                {/* Stage 3: Eliminators R3 & R4 (E9, E11, E10) */}
                <div className="flex flex-col justify-between w-[240px] shrink-0 self-stretch gap-3">
                  {(() => {
                    const e9 = matchesByPhase.get("e9")?.[0];
                    return e9 ? renderMatchCard(e9, true) : null;
                  })()}
                  {(() => {
                    const e11 = matchesByPhase.get("e11")?.[0];
                    return e11 ? renderMatchCard(e11, true) : null;
                  })()}
                  {(() => {
                    const e10 = matchesByPhase.get("e10")?.[0];
                    return e10 ? renderMatchCard(e10, true) : null;
                  })()}
                </div>

                {/* Connector 3: E9, E11, E10 all 3 to Triangular Decider */}
                <EliminatorsConnectorR3ToDecider width={72} />

                {/* Stage 4: Single Triangular Decider Card */}
                <div className="w-[260px] shrink-0 flex flex-col justify-center self-stretch">
                  {renderTriangularDeciderCard()}
                </div>

                {/* Connector 4: Decider to E13 & Q7L Drop */}
                <EliminatorsConnectorDeciderToE13 width={64} />

                {/* Stage 5: Eliminators Final (E13) */}
                <div className="flex flex-col justify-center w-[240px] shrink-0 self-stretch">
                  {(() => {
                    const m = matchesByPhase.get("e13")?.[0];
                    return m ? renderMatchCard(m) : null;
                  })()}
                </div>

                {/* Connector 5: E13 to Grand Final */}
                <EliminatorsConnectorE13ToFinal width={64} />

                {/* Stage 6: Grand Final Convergence */}
                <div className="flex flex-col justify-center w-[260px] shrink-0 self-stretch">
                  {(() => {
                    const m = matchesByPhase.get("final")?.[0];
                    return m ? renderMatchCard(m) : null;
                  })()}
                </div>
              </div>
              <div className="h-6 shrink-0" />
            </div>
          </div>
        </div>
      )}

      {/* ── Tab View 3: Unified Full Bracket (Double Elimination Tree) ────── */}
      {activeTab === "all" && (
        <div className="space-y-4">
          <div className="overflow-x-auto overflow-y-hidden pb-6 -mx-2 px-2">
            <div className="min-w-[1856px] space-y-4 pb-8">
              {/* TOP HEADER ROW - 6 GW COLUMNS */}
              <div className="flex items-center gap-0">
                <div className="w-[240px] shrink-0 bg-[#0f1c2c] border border-[#3b4b3d] px-2.5 py-2 rounded-lg text-center">
                  <p className="text-xs font-semibold text-[#d6e4f9]">Opening Round</p>
                  <p className="text-[10px] text-[#849585]">GW 30 · 31 · 2 Legs</p>
                </div>
                <div className="w-[80px] shrink-0" />
                <div className="w-[240px] shrink-0 bg-[#0f1c2c] border border-[#3b4b3d] px-2.5 py-2 rounded-lg text-center">
                  <p className="text-xs font-semibold text-[#d6e4f9]">Semis & Drops</p>
                  <p className="text-[10px] text-[#849585]">GW 32 · 33 · 2 Legs</p>
                </div>
                <div className="w-[96px] shrink-0" />
                <div className="w-[240px] shrink-0 bg-[#0f1c2c] border border-[#3b4b3d] px-2.5 py-2 rounded-lg text-center">
                  <p className="text-xs font-semibold text-[#d6e4f9]">Eliminators R3 & R4</p>
                  <p className="text-[10px] text-[#849585]">GW 34 · 35 · 2 Legs</p>
                </div>
                <div className="w-[72px] shrink-0" />
                <div className="w-[260px] shrink-0 bg-[#0f1c2c] border border-violet-500/30 px-2.5 py-2 rounded-lg text-center">
                  <p className="text-xs font-semibold text-[#d6e4f9]">Qualifiers Final & Decider</p>
                  <p className="text-[10px] text-[#849585]">GW 36 · 1 Leg</p>
                </div>
                <div className="w-[64px] shrink-0" />
                <div className="w-[240px] shrink-0 bg-[#0f1c2c] border border-[#3b4b3d] px-2.5 py-2 rounded-lg text-center">
                  <p className="text-xs font-semibold text-[#d6e4f9]">Eliminators Final</p>
                  <p className="text-[10px] text-[#849585]">GW 37 · 1 Leg</p>
                </div>
                <div className="w-[64px] shrink-0" />
                <div className="w-[260px] shrink-0 bg-[#0f1c2c] border border-[#00e478]/40 px-2.5 py-2 rounded-lg text-center">
                  <p className="text-xs font-semibold text-[#00e478] flex items-center justify-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5" /> Grand Final
                  </p>
                  <p className="text-[10px] text-[#849585]">GW 38 · 1 Leg</p>
                </div>
              </div>

              {/* TREE CANVAS: LEFT TRACK (UPPER, MID, LOWER) + COLUMN 6 (GRAND FINAL) */}
              <div className="flex items-stretch">
                {/* Left Track (Cols 1 to 5 + Spacer 5, total width: 1596px) */}
                <div className="w-[1596px] shrink-0 flex flex-col">
                  {/* UPPER BRACKET (h = 620px) */}
                  <div className="flex items-stretch h-[620px]">
                    {/* Col 1 Upper: Q1, Q4, Q2, Q3 (Spacious pairs) */}
                    <div className="flex flex-col justify-between w-[240px] shrink-0 self-stretch py-5">
                      <div className="flex flex-col gap-5">
                        {(() => {
                          const q1 = matchesByPhase.get("q1")?.[0];
                          return q1 ? renderMatchCard(q1) : null;
                        })()}
                        {(() => {
                          const q4 = matchesByPhase.get("q4")?.[0];
                          return q4 ? renderMatchCard(q4) : null;
                        })()}
                      </div>
                      <div className="flex flex-col gap-5">
                        {(() => {
                          const q2 = matchesByPhase.get("q2")?.[0];
                          return q2 ? renderMatchCard(q2) : null;
                        })()}
                        {(() => {
                          const q3 = matchesByPhase.get("q3")?.[0];
                          return q3 ? renderMatchCard(q3) : null;
                        })()}
                      </div>
                    </div>

                    {/* Spacer 1 Upper */}
                    <FullBracketSpacer1Upper width={80} />

                    {/* Col 2 Upper: Q5, Q6 */}
                    <div className="flex flex-col justify-between w-[240px] shrink-0 self-stretch py-5">
                      <div className="flex flex-col justify-center min-h-[236px]">
                        {(() => {
                          const q5 = matchesByPhase.get("q5")?.[0];
                          return q5 ? renderMatchCard(q5) : null;
                        })()}
                      </div>
                      <div className="flex flex-col justify-center min-h-[236px]">
                        {(() => {
                          const q6 = matchesByPhase.get("q6")?.[0];
                          return q6 ? renderMatchCard(q6) : null;
                        })()}
                      </div>
                    </div>

                    {/* Spacer 2 Upper */}
                    <FullBracketSpacer2Upper width={96} />

                    {/* Col 3 Upper: GW 34-35 Qualifiers Bye */}
                    <div className="relative w-[240px] shrink-0 self-stretch flex items-center justify-center">
                      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" viewBox="0 0 240 620" preserveAspectRatio="none">
                        <path d="M 0 138 H 240" fill="none" stroke="#3b4b3d" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                        <path d="M 0 482 H 240" fill="none" stroke="#3b4b3d" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                      </svg>
                      <div className="relative z-10 w-[210px] rounded-lg border border-dashed border-[#3b4b3d] bg-[#0f1c2c]/85 backdrop-blur-xs p-3 text-center">
                        <span className="text-[10px] font-semibold text-[#849585] uppercase tracking-wider block">Qualifiers Bye</span>
                        <p className="text-xs font-semibold text-[#d6e4f9] mt-0.5">GW 34 · 35</p>
                        <p className="text-[10px] text-[#849585] mt-1">Q5 & Q6 winners advance to Q7</p>
                      </div>
                    </div>

                    {/* Spacer 3 Upper */}
                    <FullBracketSpacer3Upper width={72} />

                    {/* Col 4 Upper: Q7 Qualifiers Final */}
                    <div className="w-[260px] shrink-0 self-stretch flex flex-col justify-center">
                      {(() => {
                        const q7 = matchesByPhase.get("q7")?.[0];
                        return q7 ? renderMatchCard(q7) : null;
                      })()}
                    </div>

                    {/* Spacer 4 Upper: Q7 to Col 5 + Drop down to E13 */}
                    <FullBracketSpacer4Upper width={64} />

                    {/* Col 5 Upper: Upper Champion */}
                    <div className="relative w-[240px] shrink-0 self-stretch flex items-center justify-center">
                      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" viewBox="0 0 240 620" preserveAspectRatio="none">
                        <path d="M 0 310 H 240" fill="none" stroke="#00e478" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                      </svg>
                      <div className="relative z-10 w-[210px] rounded-lg border border-[#00e478]/40 bg-[#0f1c2c]/90 backdrop-blur-xs p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-[#00e478] uppercase tracking-wider">
                          <Trophy className="h-3.5 w-3.5" />
                          <span>Upper Champion</span>
                        </div>
                        <p className="text-xs font-semibold text-[#d6e4f9] mt-0.5">GW 37 Bye</p>
                        <p className="text-[10px] text-[#849585] mt-1">Advances to Grand Final</p>
                      </div>
                    </div>

                    {/* Spacer 5 Upper: Exits Upper Champion at (0, 310), turns down at x=28 to bottom */}
                    <FullBracketSpacer5Upper width={64} />
                  </div>

                  {/* MID CONNECTOR TRACK (height = 80px) */}
                  <div className="relative flex items-stretch h-[80px]">
                    {/* Col 1 Mid */}
                    <div className="w-[240px] shrink-0" />

                    {/* Spacer 1 Mid: Drop line through to E6 */}
                    <FullBracketSpacer1Mid width={80} />

                    {/* Col 2 Mid */}
                    <div className="w-[240px] shrink-0" />

                    {/* Spacer 2 Mid: Drop line through to E9 */}
                    <FullBracketSpacer2Mid width={96} />

                    {/* Col 3 Mid */}
                    <div className="w-[240px] shrink-0" />

                    {/* Spacer 3 Mid */}
                    <div className="w-[72px] shrink-0" />

                    {/* Col 4 Mid */}
                    <div className="w-[260px] shrink-0" />

                    {/* Spacer 4 Mid: Drop line through to E13 with badge */}
                    <FullBracketSpacer4Mid width={64} />

                    {/* Col 5 Mid */}
                    <div className="w-[240px] shrink-0" />

                    {/* Spacer 5 Mid: Convergence Junction into Grand Final */}
                    <FullBracketSpacer5Mid width={64} />
                  </div>

                  {/* LOWER BRACKET (h = 620px, immediately below Mid Track with 0 gap) */}
                  <div className="flex items-stretch h-[620px]">
                    {/* Col 1 Lower: E1, E4, E2, E3 (Spacious pairs) */}
                    <div className="flex flex-col justify-between w-[240px] shrink-0 self-stretch py-5">
                      <div className="flex flex-col gap-5">
                        {(() => {
                          const e1 = matchesByPhase.get("e1")?.[0];
                          return e1 ? renderMatchCard(e1, true) : null;
                        })()}
                        {(() => {
                          const e4 = matchesByPhase.get("e4")?.[0];
                          return e4 ? renderMatchCard(e4, true) : null;
                        })()}
                      </div>
                      <div className="flex flex-col gap-5">
                        {(() => {
                          const e2 = matchesByPhase.get("e2")?.[0];
                          return e2 ? renderMatchCard(e2, true) : null;
                        })()}
                        {(() => {
                          const e3 = matchesByPhase.get("e3")?.[0];
                          return e3 ? renderMatchCard(e3, true) : null;
                        })()}
                      </div>
                    </div>

                    {/* Spacer 1 Lower */}
                    <FullBracketSpacer1Lower width={80} />

                    {/* Col 2 Lower: E6, E7, E5, E8 */}
                    <div className="flex flex-col justify-between w-[240px] shrink-0 self-stretch py-5">
                      <div className="flex flex-col gap-5">
                        {(() => {
                          const e6 = matchesByPhase.get("e6")?.[0];
                          return e6 ? renderMatchCard(e6, true) : null;
                        })()}
                        {(() => {
                          const e7 = matchesByPhase.get("e7")?.[0];
                          return e7 ? renderMatchCard(e7, true) : null;
                        })()}
                      </div>
                      <div className="flex flex-col gap-5">
                        {(() => {
                          const e5 = matchesByPhase.get("e5")?.[0];
                          return e5 ? renderMatchCard(e5, true) : null;
                        })()}
                        {(() => {
                          const e8 = matchesByPhase.get("e8")?.[0];
                          return e8 ? renderMatchCard(e8, true) : null;
                        })()}
                      </div>
                    </div>

                    {/* Spacer 2 Lower */}
                    <FullBracketSpacer2Lower width={96} />

                    {/* Col 3 Lower: E9, E11, E10 */}
                    <div className="flex flex-col justify-between w-[240px] shrink-0 self-stretch py-5">
                      {(() => {
                        const e9 = matchesByPhase.get("e9")?.[0];
                        return e9 ? renderMatchCard(e9, true) : null;
                      })()}
                      <div className="self-stretch flex flex-col justify-center">
                        {(() => {
                          const e11 = matchesByPhase.get("e11")?.[0];
                          return e11 ? renderMatchCard(e11, true) : null;
                        })()}
                      </div>
                      {(() => {
                        const e10 = matchesByPhase.get("e10")?.[0];
                        return e10 ? renderMatchCard(e10, true) : null;
                      })()}
                    </div>

                    {/* Spacer 3 Lower */}
                    <FullBracketSpacer3Lower width={72} />

                    {/* Col 4 Lower: Triangular Decider Single Card */}
                    <div className="w-[260px] shrink-0 flex flex-col justify-center self-stretch">
                      {renderTriangularDeciderCard()}
                    </div>

                    {/* Spacer 4 Lower: Connector Decider & Q7L to E13 */}
                    <FullBracketSpacer4Lower width={64} />

                    {/* Col 5 Lower: Eliminators Final (E13) */}
                    <div className="flex flex-col justify-center w-[240px] shrink-0 self-stretch">
                      {(() => {
                        const m = matchesByPhase.get("e13")?.[0];
                        return m ? renderMatchCard(m) : null;
                      })()}
                    </div>

                    {/* Spacer 5 Lower: Exits E13 at (0, 310), turns up at x=28 to top */}
                    <FullBracketSpacer5Lower width={64} />
                  </div>
                </div>

                {/* Column 6: Grand Final (Single match card centered vertically across entire height) */}
                <div className="w-[260px] shrink-0 self-stretch flex flex-col justify-center">
                  {(() => {
                    const finalMatch = matchesByPhase.get("final")?.[0];
                    return finalMatch ? renderMatchCard(finalMatch) : null;
                  })()}
                </div>
              </div>
              <div className="h-6 shrink-0" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
