import { supabase } from "@/lib/supabase";
import { getFplData } from "@/lib/fpl-data";
import type { Json } from "@/lib/database.types";
import type { CompetitionFixtureRow, CompetitionTeamRow } from "./types";

export interface PlayerBreakdown {
  id: number;
  webName: string;
  fullName: string;
  teamShort: string;
  position: "GKP" | "DEF" | "MID" | "FWD";
  elementPosition: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  multiplier: number;
  rawPoints: number;
  totalPoints: number;
  minutes: number;
  keyStats: string[];
  subbedIn?: boolean;
  subbedOut?: boolean;
}

export interface TeamStatsSummary {
  formation: string;
  goals: number;
  assists: number;
  cleanSheets: number;
  saves: number;
  bonus: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  penaltiesSaved: number;
  goalsConceded: number;
  captainName: string;
  captainPoints: number;
}

export interface TeamBreakdown {
  teamId: string;
  teamName: string;
  managerId: number | null;
  avatarUrl: string | null;
  color: string | null;
  chip: string | null;
  grossPoints: number;
  transferCost: number;
  netPoints: number;
  benchPoints: number;
  playing11: PlayerBreakdown[];
  bench: PlayerBreakdown[];
  statsSummary: TeamStatsSummary;
}

export interface FixtureBreakdownResult {
  fixtureId: string;
  gw: number;
  status: string;
  homeTeam: TeamBreakdown | null;
  awayTeam: TeamBreakdown | null;
  unrevealedReason?: string;
}

interface FplLiveElementStats {
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  total_points: number;
}

const POSITION_MAP: Record<number, "GKP" | "DEF" | "MID" | "FWD"> = {
  1: "GKP",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

const CHIP_LABELS: Record<string, string> = {
  bboost: "Bench Boost",
  "3xc": "Triple Captain",
  freehit: "Free Hit",
  wildcard: "Wildcard",
  manager: "Assistant Manager",
};

/**
 * Fetch and cache live player stats for a gameweek.
 */
export async function fetchLiveGameweekStats(
  gw: number,
): Promise<Map<number, FplLiveElementStats>> {
  const cacheKey = `fpl_live_gw_${gw}`;

  // Check Supabase cache
  try {
    const { data: cached } = await supabase
      .from("fpl_cache")
      .select("value, updated_at, ttl_ms")
      .eq("key", cacheKey)
      .single();

    if (cached?.value) {
      const age = Date.now() - new Date(cached.updated_at).getTime();
      const ttl = cached.ttl_ms ?? 5 * 60 * 1000;
      if (age < ttl) {
        const rawMap = cached.value as unknown as Record<string, FplLiveElementStats>;
        const map = new Map<number, FplLiveElementStats>();
        for (const [k, v] of Object.entries(rawMap)) {
          map.set(Number(k), v);
        }
        return map;
      }
    }
  } catch {
    // ignore cache lookup errors and fetch upstream
  }

  // Fetch upstream from FPL API
  try {
    const res = await fetch(`https://fantasy.premierleague.com/api/event/${gw}/live/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return new Map();
    }

    const data = (await res.json()) as {
      elements?: Array<{ id: number; stats: FplLiveElementStats }>;
    };

    const map = new Map<number, FplLiveElementStats>();
    const serializableObj: Record<string, FplLiveElementStats> = {};
    for (const el of data.elements ?? []) {
      map.set(el.id, el.stats);
      serializableObj[el.id.toString()] = el.stats;
    }

    // Save to cache asynchronously with 5m TTL
    await supabase
      .from("fpl_cache")
      .upsert(
        {
          key: cacheKey,
          value: serializableObj as unknown as Json,
          updated_at: new Date().toISOString(),
          ttl_ms: 5 * 60 * 1000,
        },
        { onConflict: "key" },
      );

    return map;
  } catch {
    return new Map();
  }
}

/**
 * Fetch manager picks for a specific gameweek.
 */
async function fetchManagerPicks(managerId: number, gw: number) {
  try {
    const res = await fetch(
      `https://fantasy.premierleague.com/api/entry/${managerId}/event/${gw}/picks/`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        next: { revalidate: 300 },
      },
    );

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as {
      active_chip: string | null;
      automatic_subs: Array<{
        element_in: number;
        element_out: number;
      }>;
      entry_history: {
        points: number;
        event_transfers_cost: number;
        points_on_bench: number;
      };
      picks: Array<{
        element: number;
        position: number;
        multiplier: number;
        is_captain: boolean;
        is_vice_captain: boolean;
        element_type: number;
      }>;
    };
  } catch {
    return null;
  }
}

function buildKeyStats(stats: FplLiveElementStats, pos: "GKP" | "DEF" | "MID" | "FWD"): string[] {
  const tags: string[] = [];
  if (stats.goals_scored > 0) tags.push(`${stats.goals_scored}G`);
  if (stats.assists > 0) tags.push(`${stats.assists}A`);
  if (stats.clean_sheets > 0 && (pos === "GKP" || pos === "DEF")) tags.push("CS");
  if (stats.clean_sheets > 0 && pos === "MID") tags.push("CS");
  if ((pos === "GKP" || pos === "DEF") && stats.goals_conceded > 0) {
    tags.push(`${stats.goals_conceded} GC`);
  }
  if (stats.bonus > 0) tags.push(`${stats.bonus} Bonus`);
  if (stats.saves >= 3) tags.push(`${stats.saves} Saves`);
  if (stats.penalties_saved > 0) tags.push(`${stats.penalties_saved} Pen Save`);
  if (stats.red_cards > 0) tags.push("RC");
  else if (stats.yellow_cards > 0) tags.push("YC");
  if (stats.own_goals > 0) tags.push(`${stats.own_goals} OG`);
  return tags;
}

/**
 * Builds the complete Playing 11 and Bench breakdown for a fixture.
 */
export async function getFixtureBreakdown(
  fixtureId: string,
): Promise<FixtureBreakdownResult | { error: string; status: number }> {
  // 1. Fetch fixture and linked teams
  const { data: fixture, error: fixError } = await supabase
    .from("competition_fixtures")
    .select("*")
    .eq("id", fixtureId)
    .single();

  if (fixError || !fixture) {
    return { error: "Fixture not found.", status: 404 };
  }

  const fixRow = fixture as CompetitionFixtureRow;
  const gw = fixRow.gw as number;

  const teamIds = [fixRow.home_team_id, fixRow.away_team_id].filter(Boolean) as string[];
  const { data: teamsData } = await supabase
    .from("competition_teams")
    .select("*")
    .in("id", teamIds);

  const teams = (teamsData ?? []) as CompetitionTeamRow[];
  const homeTeamRow = teams.find((t) => t.id === fixRow.home_team_id) ?? null;
  const awayTeamRow = teams.find((t) => t.id === fixRow.away_team_id) ?? null;

  // 2. Fetch live stats & player dictionary
  const [liveStatsMap, fplData] = await Promise.all([
    fetchLiveGameweekStats(gw),
    getFplData().catch(() => null),
  ]);

  const playerDict = new Map(
    (fplData?.players ?? []).map((p) => [
      p.id,
      {
        webName: p.web_name,
        fullName: p.full_name,
        teamShort: p.team_short,
        position: p.position,
      },
    ]),
  );

  async function processTeam(team: CompetitionTeamRow | null): Promise<TeamBreakdown | null> {
    if (!team) return null;
    if (!team.fpl_manager_id) {
      return {
        teamId: team.id,
        teamName: team.name,
        managerId: null,
        avatarUrl: team.avatar_url,
        color: team.color,
        chip: null,
        grossPoints: 0,
        transferCost: 0,
        netPoints: 0,
        benchPoints: 0,
        playing11: [],
        bench: [],
        statsSummary: {
          formation: "-",
          goals: 0,
          assists: 0,
          cleanSheets: 0,
          saves: 0,
          bonus: 0,
          yellowCards: 0,
          redCards: 0,
          ownGoals: 0,
          penaltiesSaved: 0,
          goalsConceded: 0,
          captainName: "-",
          captainPoints: 0,
        },
      };
    }

    const picksData = await fetchManagerPicks(team.fpl_manager_id, gw);
    if (!picksData) {
      return null;
    }

    const subInSet = new Set(picksData.automatic_subs.map((s) => s.element_in));
    const subOutSet = new Set(picksData.automatic_subs.map((s) => s.element_out));

    const allPlayers: PlayerBreakdown[] = picksData.picks.map((pick) => {
      const pInfo = playerDict.get(pick.element);
      const live = liveStatsMap.get(pick.element);
      const rawPoints = live?.total_points ?? 0;
      const minutes = live?.minutes ?? 0;
      const position = pInfo?.position ?? POSITION_MAP[pick.element_type] ?? "MID";

      const isSubbedIn = subInSet.has(pick.element);
      const isSubbedOut = subOutSet.has(pick.element);

      // Effective multiplier: if subbed out, 0; if subbed in, at least 1
      let effectiveMultiplier = pick.multiplier;
      if (isSubbedOut) effectiveMultiplier = 0;
      else if (isSubbedIn && effectiveMultiplier === 0) effectiveMultiplier = 1;

      return {
        id: pick.element,
        webName: pInfo?.webName || pInfo?.fullName || `Player #${pick.element}`,
        fullName: pInfo?.fullName || pInfo?.webName || `Player #${pick.element}`,
        teamShort: pInfo?.teamShort ?? "PL",
        position,
        elementPosition: pick.position,
        isCaptain: pick.is_captain,
        isViceCaptain: pick.is_vice_captain,
        multiplier: effectiveMultiplier,
        rawPoints,
        totalPoints: rawPoints * effectiveMultiplier,
        minutes,
        keyStats: live ? buildKeyStats(live, position) : [],
        subbedIn: isSubbedIn,
        subbedOut: isSubbedOut,
      };
    });

    // Playing 11:
    // Starters are positions 1..11, plus any bench player subbed in, minus any starter subbed out
    const starters = allPlayers.filter((p) => p.elementPosition <= 11);
    const benchRaw = allPlayers.filter((p) => p.elementPosition > 11);

    // Swap subbed-in players into playing 11 for a clean view
    const playing11: PlayerBreakdown[] = [];
    for (const starter of starters) {
      if (starter.subbedOut) {
        // Find the bench replacement
        const subInId = picksData.automatic_subs.find((s) => s.element_out === starter.id)?.element_in;
        const replacement = benchRaw.find((b) => b.id === subInId);
        if (replacement) {
          playing11.push(replacement);
        } else {
          playing11.push(starter);
        }
      } else {
        playing11.push(starter);
      }
    }

    // Sort playing 11 by standard FPL pitch order: GKP, DEF, MID, FWD
    const posOrder = { GKP: 1, DEF: 2, MID: 3, FWD: 4 };
    playing11.sort((a, b) => posOrder[a.position] - posOrder[b.position]);

    const bench: PlayerBreakdown[] = benchRaw.map((b) => {
      return {
        ...b,
        totalPoints: b.rawPoints, // Bench players show their actual gameweek points scored
      };
    });

    // Compute team match stats summary
    const defCount = playing11.filter((p) => p.position === "DEF").length;
    const midCount = playing11.filter((p) => p.position === "MID").length;
    const fwdCount = playing11.filter((p) => p.position === "FWD").length;
    const formation = `${defCount}-${midCount}-${fwdCount}`;

    let goals = 0;
    let assists = 0;
    let cleanSheets = 0;
    let saves = 0;
    let bonus = 0;
    let yellowCards = 0;
    let redCards = 0;
    let ownGoals = 0;
    let penaltiesSaved = 0;
    let goalsConceded = 0;
    let captainName = "-";
    let captainPoints = 0;

    for (const p of playing11) {
      const live = liveStatsMap.get(p.id);
      if (live) {
        goals += live.goals_scored || 0;
        assists += live.assists || 0;
        if (p.position === "GKP" || p.position === "DEF") {
          cleanSheets += live.clean_sheets || 0;
          goalsConceded += live.goals_conceded || 0;
        }
        saves += live.saves || 0;
        bonus += live.bonus || 0;
        yellowCards += live.yellow_cards || 0;
        redCards += live.red_cards || 0;
        ownGoals += live.own_goals || 0;
        penaltiesSaved += live.penalties_saved || 0;
      }
      if (p.isCaptain) {
        captainName = p.webName;
        captainPoints = p.totalPoints;
      }
    }

    const statsSummary: TeamStatsSummary = {
      formation,
      goals,
      assists,
      cleanSheets,
      saves,
      bonus,
      yellowCards,
      redCards,
      ownGoals,
      penaltiesSaved,
      goalsConceded,
      captainName,
      captainPoints,
    };

    const chipRaw = picksData.active_chip;
    const chip = chipRaw ? (CHIP_LABELS[chipRaw] ?? chipRaw) : null;
    const grossPoints = picksData.entry_history.points;
    const transferCost = picksData.entry_history.event_transfers_cost;
    const netPoints = grossPoints - transferCost;
    const benchPoints = picksData.entry_history.points_on_bench;

    return {
      teamId: team.id,
      teamName: team.name,
      managerId: team.fpl_manager_id,
      avatarUrl: team.avatar_url,
      color: team.color,
      chip,
      grossPoints,
      transferCost,
      netPoints,
      benchPoints,
      playing11,
      bench,
      statsSummary,
    };
  }

  const [homeTeam, awayTeam] = await Promise.all([
    processTeam(homeTeamRow),
    processTeam(awayTeamRow),
  ]);

  return {
    fixtureId: fixRow.id,
    gw,
    status: fixRow.status,
    homeTeam,
    awayTeam,
  };
}
