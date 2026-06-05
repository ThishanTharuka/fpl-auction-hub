import type {
  FPLBootstrapResponse,
  FPLTeam,
  EnrichedPlayer,
  FPLFixture,
} from "./fpl-types";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const FPL_BOOTSTRAP_URL =
  "https://fantasy.premierleague.com/api/bootstrap-static/";
const FPL_FIXTURES_URL = "https://fantasy.premierleague.com/api/fixtures/";
const FPL_PHOTO_BASE_URL =
  "https://resources.premierleague.com/premierleague/photos/players/110x140/p";
const FPL_CREST_BASE_URL =
  "https://resources.premierleague.com/premierleague/badges/70/t";

const CACHE_KEY = "fpl_data";

const TTL = {
  MATCHDAY: 5 * 60 * 1000,
  MATCHDAY_EVE: 30 * 60 * 1000,
  DEFAULT: 2 * 60 * 60 * 1000,
};

const POSITION_MAP: Record<number, "GKP" | "DEF" | "MID" | "FWD"> = {
  1: "GKP",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
};

export function computeAvgFdr(
  teamId: number,
  fixtures: FPLFixture[],
  currentGw: number,
): number {
  const upcoming = fixtures
    .filter(
      (f) =>
        !f.finished &&
        f.event !== null &&
        f.event >= currentGw &&
        (f.team_h === teamId || f.team_a === teamId),
    )
    .sort((a, b) => (a.event ?? 0) - (b.event ?? 0))
    .slice(0, 5);

  if (upcoming.length === 0) return 3;

  const total = upcoming.reduce((sum, f) => {
    const diff =
      f.team_h === teamId ? f.team_h_difficulty : f.team_a_difficulty;
    return sum + diff;
  }, 0);

  return Math.round((total / upcoming.length) * 10) / 10;
}

export function getCurrentTtl(fixtures: FPLFixture[]): number {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const hasMatchToday = fixtures.some(
    (f) => f.kickoff_time && f.kickoff_time.startsWith(todayStr),
  );

  const hasMatchTomorrow = fixtures.some(
    (f) => f.kickoff_time && f.kickoff_time.startsWith(tomorrowStr),
  );

  if (hasMatchToday) return TTL.MATCHDAY;
  if (hasMatchTomorrow) return TTL.MATCHDAY_EVE;
  return TTL.DEFAULT;
}

type FplDataResult = {
  players: EnrichedPlayer[];
  teams: FPLTeam[];
  currentGameweek: number;
};

async function fetchFromUpstream(): Promise<{
  data: FplDataResult;
  ttl: number;
}> {
  const [bootstrapRes, fixturesRes] = await Promise.all([
    fetch(FPL_BOOTSTRAP_URL, { headers: HEADERS }),
    fetch(FPL_FIXTURES_URL, { headers: HEADERS }),
  ]);

  if (!bootstrapRes.ok) {
    throw new Error("Failed to fetch FPL bootstrap data");
  }

  const bootstrap: FPLBootstrapResponse = await bootstrapRes.json();
  const fixtures: FPLFixture[] = fixturesRes.ok
    ? await fixturesRes.json()
    : [];

  const ttl = getCurrentTtl(fixtures);

  const currentEvent = bootstrap.events.find((e) => e.is_current);
  const nextEvent = bootstrap.events.find((e) => e.is_next);
  const currentGw = nextEvent?.id ?? currentEvent?.id ?? 1;

  const teamFdrMap = new Map<number, number>();
  for (const team of bootstrap.teams) {
    teamFdrMap.set(team.id, computeAvgFdr(team.id, fixtures, currentGw));
  }

  const teamMap = new Map<number, FPLTeam>(
    bootstrap.teams.map((t) => [t.id, t]),
  );

  const players: EnrichedPlayer[] = bootstrap.elements.map((p) => {
    const team = teamMap.get(p.team);
    return {
      ...p,
      full_name: `${p.first_name} ${p.second_name}`,
      image_url: `${FPL_PHOTO_BASE_URL}${p.code}.png`,
      team_crest_url: team ? `${FPL_CREST_BASE_URL}${team.code}.png` : "",
      team_name: team?.name ?? "Unknown",
      team_short: team?.short_name ?? "UNK",
      position: POSITION_MAP[p.element_type] ?? "MID",
      price: p.now_cost / 10,
      avg_fdr_next5: teamFdrMap.get(p.team) ?? 3,
    };
  });

  return {
    data: { players, teams: bootstrap.teams, currentGameweek: currentGw },
    ttl,
  };
}

export async function getFplData(): Promise<FplDataResult> {
  const { data } = await supabase
    .from("fpl_cache")
    .select("value, updated_at, ttl_ms")
    .eq("key", CACHE_KEY)
    .single();

  if (data) {
    const age = Date.now() - new Date(data.updated_at).getTime();
    const ttl = data.ttl_ms ?? TTL.DEFAULT;
    if (age < ttl) {
      return data.value as unknown as FplDataResult;
    }
  }

  const { data: fresh, ttl } = await fetchFromUpstream();

  await supabase
    .from("fpl_cache")
    .upsert(
      {
        key: CACHE_KEY,
        value: JSON.parse(JSON.stringify(fresh)),
        updated_at: new Date().toISOString(),
        ttl_ms: ttl,
      },
      { onConflict: "key" },
    );

  return fresh;
}