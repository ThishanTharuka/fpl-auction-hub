import type {
  EnrichedPlayer,
  FPLTeam,
  FPLFixture,
  FPLEvent,
} from "./fpl-types";

// ─── Market Radar ─────────────────────────────────────────────────────────────

export interface MarketPlayerSummary {
  player: EnrichedPlayer;
  netTransfersEvent: number;
  costChangeEvent: number;
  costChangeStart: number;
  ownershipPercent: number;
}

export interface MarketRadarData {
  risers: MarketPlayerSummary[];
  fallers: MarketPlayerSummary[];
  topNetTransfersIn: MarketPlayerSummary[];
  topNetTransfersOut: MarketPlayerSummary[];
  totalRisersCount: number;
  totalFallersCount: number;
}

export function calculateMarketRadar(players: EnrichedPlayer[]): MarketRadarData {
  const summaries: MarketPlayerSummary[] = players.map((p) => {
    const costChangeEvent = p.cost_change_event ?? 0;
    const costChangeStart = p.cost_change_start ?? 0;
    const transfersIn = p.transfers_in_event ?? 0;
    const transfersOut = p.transfers_out_event ?? 0;
    const netTransfersEvent = transfersIn - transfersOut;
    const ownershipPercent = parseFloat(p.selected_by_percent || "0");

    return {
      player: p,
      netTransfersEvent,
      costChangeEvent,
      costChangeStart,
      ownershipPercent,
    };
  });

  const risers = summaries
    .filter((s) => s.costChangeEvent > 0)
    .sort((a, b) => b.costChangeEvent - a.costChangeEvent || b.netTransfersEvent - a.netTransfersEvent);

  const fallers = summaries
    .filter((s) => s.costChangeEvent < 0)
    .sort((a, b) => a.costChangeEvent - b.costChangeEvent || a.netTransfersEvent - b.netTransfersEvent);

  const topNetTransfersIn = [...summaries]
    .filter((s) => s.netTransfersEvent > 0)
    .sort((a, b) => b.netTransfersEvent - a.netTransfersEvent)
    .slice(0, 15);

  const topNetTransfersOut = [...summaries]
    .filter((s) => s.netTransfersEvent < 0)
    .sort((a, b) => a.netTransfersEvent - b.netTransfersEvent)
    .slice(0, 15);

  return {
    risers,
    fallers,
    topNetTransfersIn,
    topNetTransfersOut,
    totalRisersCount: risers.length,
    totalFallersCount: fallers.length,
  };
}

// ─── Expected Stats & Finishing Regression ────────────────────────────────────

export interface ExpectedStatsPlayer {
  player: EnrichedPlayer;
  xg: number;
  xa: number;
  xgi: number;
  xgc: number;
  goals: number;
  assists: number;
  finishingDelta: number; // goals - xG (positive = overperforming/clinical, negative = underperforming/unlucky)
  xgiPer90: number;
  minutes: number;
}

export interface ExpectedStatsData {
  topXgi: ExpectedStatsPlayer[];
  unluckyFinishers: ExpectedStatsPlayer[];
  clinicalFinishers: ExpectedStatsPlayer[];
  topXgcSolidDefenders: ExpectedStatsPlayer[];
}

export function calculateExpectedStats(players: EnrichedPlayer[]): ExpectedStatsData {
  const parsed: ExpectedStatsPlayer[] = players.map((p) => {
    const xg = parseFloat(p.expected_goals || "0");
    const xa = parseFloat(p.expected_assists || "0");
    const xgi = parseFloat(p.expected_goal_involvements || "0");
    const xgc = parseFloat(p.expected_goals_conceded || "0");
    const goals = p.goals_scored || 0;
    const assists = p.assists || 0;
    const finishingDelta = Math.round((goals - xg) * 100) / 100;
    const minutes = p.minutes || 0;
    const xgiPer90 =
      minutes >= 180 ? Math.round((xgi / (minutes / 90)) * 100) / 100 : 0;

    return {
      player: p,
      xg,
      xa,
      xgi,
      xgc,
      goals,
      assists,
      finishingDelta,
      xgiPer90,
      minutes,
    };
  });

  const topXgi = [...parsed]
    .filter((p) => p.minutes >= 180)
    .sort((a, b) => b.xgi - a.xgi)
    .slice(0, 20);

  // Unlucky finishers: high xG (>= 1.5), underperforming xG by at least 0.8
  const unluckyFinishers = [...parsed]
    .filter((p) => p.xg >= 1.5 && p.finishingDelta < -0.6)
    .sort((a, b) => a.finishingDelta - b.finishingDelta)
    .slice(0, 15);

  // Clinical finishers: actual goals > xG by at least 1.2 with >= 3 goals
  const clinicalFinishers = [...parsed]
    .filter((p) => p.goals >= 3 && p.finishingDelta > 1.2)
    .sort((a, b) => b.finishingDelta - a.finishingDelta)
    .slice(0, 15);

  // Defensive solidity: GKP & DEF with high clean sheets and low xGC
  const topXgcSolidDefenders = [...parsed]
    .filter(
      (p) =>
        (p.player.position === "DEF" || p.player.position === "GKP") &&
        p.minutes >= 360,
    )
    .sort((a, b) => a.xgc - b.xgc)
    .slice(0, 15);

  return {
    topXgi,
    unluckyFinishers,
    clinicalFinishers,
    topXgcSolidDefenders,
  };
}

// ─── Value & ROI ──────────────────────────────────────────────────────────────

export interface ValuePlayer {
  player: EnrichedPlayer;
  pointsPerMillion: number;
  formPerMillion: number;
  pointsPerGame: number;
  pointsPer90: number;
}

export function calculateValueRoi(players: EnrichedPlayer[]): ValuePlayer[] {
  return players
    .filter((p) => (p.minutes || 0) >= 180 && p.price > 0)
    .map((p) => {
      const pointsPerMillion =
        Math.round((p.total_points / p.price) * 10) / 10;
      const formNum = parseFloat(p.form || "0");
      const formPerMillion =
        Math.round((formNum / p.price) * 10) / 10;
      const pointsPerGame = parseFloat(p.points_per_game || "0");
      const pointsPer90 =
        p.minutes > 0
          ? Math.round((p.total_points / (p.minutes / 90)) * 10) / 10
          : 0;

      return {
        player: p,
        pointsPerMillion,
        formPerMillion,
        pointsPerGame,
        pointsPer90,
      };
    })
    .sort((a, b) => b.pointsPerMillion - a.pointsPerMillion);
}

// ─── Differential Scout ───────────────────────────────────────────────────────

export interface DifferentialPlayer {
  player: EnrichedPlayer;
  ownership: number;
  form: number;
  totalPoints: number;
  xgi: number;
}

export function calculateDifferentials(
  players: EnrichedPlayer[],
  maxOwnership = 10,
): DifferentialPlayer[] {
  return players
    .filter((p) => {
      const ownership = parseFloat(p.selected_by_percent || "0");
      return ownership <= maxOwnership && (p.minutes || 0) >= 180;
    })
    .map((p) => ({
      player: p,
      ownership: parseFloat(p.selected_by_percent || "0"),
      form: parseFloat(p.form || "0"),
      totalPoints: p.total_points,
      xgi: parseFloat(p.expected_goal_involvements || "0"),
    }))
    .sort((a, b) => b.form - a.form || b.totalPoints - a.totalPoints);
}

// ─── Fixture Ticker & Matrix ──────────────────────────────────────────────────

export interface TeamFixtureItem {
  event: number;
  opponentShort: string;
  isHome: boolean;
  difficulty: number;
}

export interface TeamFixtureRow {
  team: FPLTeam;
  fixtures: Array<TeamFixtureItem | null>;
  avgDifficulty: number;
}

export function calculateFixtureMatrix(
  teams: FPLTeam[],
  fixtures: FPLFixture[],
  startGw: number,
  horizon = 6,
): TeamFixtureRow[] {
  const teamMap = new Map<number, FPLTeam>(teams.map((t) => [t.id, t]));
  const targetGws = Array.from({ length: horizon }, (_, i) => startGw + i);

  // Group fixtures by event and teams
  const eventFixturesMap = new Map<number, FPLFixture[]>();
  for (const f of fixtures) {
    if (f.event !== null && targetGws.includes(f.event)) {
      if (!eventFixturesMap.has(f.event)) {
        eventFixturesMap.set(f.event, []);
      }
      eventFixturesMap.get(f.event)!.push(f);
    }
  }

  const rows: TeamFixtureRow[] = teams.map((team) => {
    const teamFixtures: Array<TeamFixtureItem | null> = [];
    let diffSum = 0;
    let fixtureCount = 0;

    for (const gw of targetGws) {
      const gwMatches = eventFixturesMap.get(gw) || [];
      const match = gwMatches.find(
        (f) => f.team_h === team.id || f.team_a === team.id,
      );

      if (!match) {
        teamFixtures.push(null);
      } else {
        const isHome = match.team_h === team.id;
        const opponentId = isHome ? match.team_a : match.team_h;
        const opponent = teamMap.get(opponentId);
        const difficulty = isHome
          ? match.team_h_difficulty
          : match.team_a_difficulty;

        teamFixtures.push({
          event: gw,
          opponentShort: opponent?.short_name ?? "UNK",
          isHome,
          difficulty,
        });

        diffSum += difficulty;
        fixtureCount++;
      }
    }

    const avgDifficulty =
      fixtureCount > 0 ? Math.round((diffSum / fixtureCount) * 10) / 10 : 3;

    return {
      team,
      fixtures: teamFixtures,
      avgDifficulty,
    };
  });

  return rows.sort((a, b) => a.avgDifficulty - b.avgDifficulty);
}

// ─── Status & Availability Watch ──────────────────────────────────────────────

export interface StatusWatchItem {
  player: EnrichedPlayer;
  status: "d" | "i" | "s" | "u";
  news: string;
  chanceThisRound: number | null;
  chanceNextRound: number | null;
  yellowCards: number;
  isYellowCardRisk: boolean;
}

export function calculateStatusWatch(players: EnrichedPlayer[]): {
  flaggedPlayers: StatusWatchItem[];
  yellowCardAlerts: StatusWatchItem[];
} {
  const flaggedPlayers: StatusWatchItem[] = [];
  const yellowCardAlerts: StatusWatchItem[] = [];

  for (const p of players) {
    const isFlagged =
      p.status === "d" ||
      p.status === "i" ||
      p.status === "s" ||
      p.status === "u";
    const yellowCards = p.yellow_cards || 0;
    const isYellowCardRisk = yellowCards === 4;

    const item: StatusWatchItem = {
      player: p,
      status: p.status as "d" | "i" | "s" | "u",
      news: p.news || "No additional status notes.",
      chanceThisRound: p.chance_of_playing_this_round,
      chanceNextRound: p.chance_of_playing_next_round,
      yellowCards,
      isYellowCardRisk,
    };

    if (isFlagged) {
      flaggedPlayers.push(item);
    }
    if (isYellowCardRisk) {
      yellowCardAlerts.push(item);
    }
  }

  // Sort flagged by total points (key players first)
  flaggedPlayers.sort(
    (a, b) => (b.player.total_points || 0) - (a.player.total_points || 0),
  );
  // Sort yellow card risks by total points
  yellowCardAlerts.sort(
    (a, b) => (b.player.total_points || 0) - (a.player.total_points || 0),
  );

  return { flaggedPlayers, yellowCardAlerts };
}

// ─── Gameweek Meta & Metagame Pulse ───────────────────────────────────────────

export interface GameweekMetaInfo {
  activeEvent: FPLEvent | null;
  averageScore: number;
  highestScore: number;
  mostCaptainedPlayer: EnrichedPlayer | null;
  mostTransferredInPlayer: EnrichedPlayer | null;
  chipPlays: Array<{ name: string; count: number; percentage: number }>;
  totalTransfersMade: number;
}

export function calculateGameweekMeta(
  events: FPLEvent[] | undefined,
  currentGw: number,
  players: EnrichedPlayer[],
): GameweekMetaInfo {
  const playerMap = new Map<number, EnrichedPlayer>(players.map((p) => [p.id, p]));

  const activeEvent =
    events?.find((e) => e.is_current) ??
    events?.find((e) => e.id === currentGw) ??
    events?.[0] ??
    null;

  const averageScore = activeEvent?.average_entry_score || 0;
  const highestScore = activeEvent?.highest_score || 0;
  const mostCaptainedPlayer = activeEvent?.most_captained
    ? playerMap.get(activeEvent.most_captained) || null
    : null;
  const mostTransferredInPlayer = activeEvent?.most_transferred_in
    ? playerMap.get(activeEvent.most_transferred_in) || null
    : null;

  const totalChips =
    activeEvent?.chip_plays?.reduce((sum, c) => sum + c.num_played, 0) || 1;

  const chipPlays = (activeEvent?.chip_plays || []).map((c) => ({
    name:
      c.chip_name === "wildcard"
        ? "Wildcard"
        : c.chip_name === "freehit"
          ? "Free Hit"
          : c.chip_name === "bboost"
            ? "Bench Boost"
            : c.chip_name === "3xc"
              ? "Triple Captain"
              : c.chip_name,
    count: c.num_played,
    percentage: Math.round((c.num_played / totalChips) * 100),
  }));

  return {
    activeEvent,
    averageScore,
    highestScore,
    mostCaptainedPlayer,
    mostTransferredInPlayer,
    chipPlays,
    totalTransfersMade: activeEvent?.transfers_made || 0,
  };
}
