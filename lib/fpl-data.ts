import type {
  FPLBootstrapResponse,
  FPLPlayer,
  FPLTeam,
  EnrichedPlayer,
  FPLFixture,
  FplDataResult,
} from "./fpl-types";

export type { FplDataResult };
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "./database.types";
import { getUkDateString } from "./fpl-dates";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
);

const FPL_BOOTSTRAP_URL =
  "https://fantasy.premierleague.com/api/bootstrap-static/";
const FPL_FIXTURES_URL = "https://fantasy.premierleague.com/api/fixtures/";
const FPL_PHOTO_BASE_URL =
  "https://resources.premierleague.com/premierleague25/photos/players/110x140/";
const FPL_CREST_BASE_URL =
  "https://resources.premierleague.com/premierleague/badges/70/t";

const CACHE_KEY = "fpl_data";
export const DAILY_PRICES_CACHE_KEY = "fpl_daily_prices";

export interface DailyPriceSnapshot {
  date: string;
  baselinePrices: Record<string, number>;
  todayChanges: Record<string, number>;
  history?: Record<string, Record<string, number>>;
}

export interface DailyPriceSyncPlayer {
  id: number;
  name: string;
  change: number;
  newCost: number;
}

export interface DailyPriceSyncResult {
  success: boolean;
  date: string;
  risersCount: number;
  fallersCount: number;
  risers: DailyPriceSyncPlayer[];
  fallers: DailyPriceSyncPlayer[];
}

export function calculatePriceChangeProgress(
  player: {
    selected_by_percent?: string;
    transfers_in_event?: number;
    transfers_out_event?: number;
  },
  totalPlayers = 10_500_000,
): string {
  const ownershipPercent = parseFloat(player.selected_by_percent || "0");
  const activeTotal = totalPlayers > 0 ? totalPlayers : 10_500_000;
  const ownershipCount = Math.round((ownershipPercent / 100) * activeTotal);
  const netTransfers = (player.transfers_in_event ?? 0) - (player.transfers_out_event ?? 0);

  // Dynamic threshold based on ownership scale:
  // Players with higher ownership require more net transfers to shift price.
  // Minimum threshold ~15,000; maximum threshold ~150,000.
  const threshold = Math.max(
    15_000,
    Math.min(150_000, Math.round(Math.sqrt(Math.max(1_000, ownershipCount)) * 80)),
  );

  const rawProgress = (netTransfers / threshold) * 100;
  const clampedProgress = Math.max(-120, Math.min(120, Math.round(rawProgress * 10) / 10));
  return clampedProgress.toFixed(1);
}

/**
 * FPL has published an official Price Change Predictor since 2026/27:
 * `price_change_percent` is the progress towards the next change and anything
 * past +/-100 is expected to move. Prefer it and only fall back to the
 * community-style estimate when the field is missing or still calibrating.
 */
export function resolvePriceChangePercent(
  player: Pick<
    FPLPlayer,
    "price_change_percent" | "price_change_calibrating" | "selected_by_percent" | "transfers_in_event" | "transfers_out_event"
  >,
  totalPlayers?: number,
): string {
  const official = player.price_change_percent;
  if (
    !player.price_change_calibrating &&
    typeof official === "string" &&
    Number.isFinite(parseFloat(official))
  ) {
    return official;
  }
  return calculatePriceChangeProgress(player, totalPlayers);
}

/** Projected progress at the next update (`price_change_projections` offset 0). */
export function resolveProjectedPriceChangePercent(
  player: Pick<FPLPlayer, "price_change_projections">,
): string | undefined {
  const next = player.price_change_projections?.find((entry) => entry.offset === 0);
  if (!next) return undefined;
  return Number.isFinite(parseFloat(next.projected_percent))
    ? next.projected_percent
    : undefined;
}

export interface PriceReconciliation {
  snapshot: DailyPriceSnapshot;
  changesMap: Map<number, number>;
  updated: boolean;
}

/**
 * Pure reconciliation of the stored daily price snapshot against the current
 * `bootstrap-static` prices.
 *
 * The snapshot keeps `baselinePrices` (prices at the start of `date`), so the
 * day's movement can be recomputed from `now_cost` at any time. A move is only
 * ever credited to one calendar day: when the day rolls over, whatever was
 * already credited to the previous day is subtracted from the diff.
 *
 * `todayStr` must be the **UK** calendar date (see `lib/fpl-dates.ts`), because
 * FPL applies price changes at 00:00 Europe/London.
 */
export function reconcileDailyPriceSnapshot(
  elements: Array<{ id: number; now_cost: number }>,
  snapshot: DailyPriceSnapshot | null | undefined,
  todayStr: string,
): PriceReconciliation {
  const changesMap = new Map<number, number>();
  const baseline = snapshot?.baselinePrices;

  // First ever run (or a corrupted snapshot): remember today's prices as the
  // baseline. Today's movements cannot be recovered, but every following day
  // will be attributed correctly.
  if (!snapshot || !baseline || Object.keys(baseline).length === 0) {
    const baselinePrices: Record<string, number> = {};
    for (const el of elements) {
      baselinePrices[el.id.toString()] = el.now_cost;
    }

    return {
      changesMap,
      updated: true,
      snapshot: {
        date: todayStr,
        baselinePrices,
        todayChanges: {},
        history: { [todayStr]: {} },
      },
    };
  }

  const history: Record<string, Record<string, number>> = {
    ...(snapshot.history ?? {}),
  };

  if (snapshot.date === todayStr) {
    const todayChanges: Record<string, number> = {
      ...(snapshot.todayChanges ?? {}),
    };
    // Backfill the day bucket when a snapshot predating history tracking is read.
    let updated = snapshot.history?.[todayStr] === undefined;

    for (const el of elements) {
      const key = el.id.toString();
      const baselineCost = baseline[key];
      if (baselineCost === undefined) continue;

      const diff = el.now_cost - baselineCost;

      if (diff === 0) {
        // Price moved and came back - never keep a stale entry for the day.
        if (todayChanges[key] !== undefined) {
          delete todayChanges[key];
          updated = true;
        }
        continue;
      }

      changesMap.set(el.id, diff);
      if (todayChanges[key] !== diff) {
        todayChanges[key] = diff;
        updated = true;
      }
    }

    history[todayStr] = todayChanges;

    return {
      changesMap,
      updated,
      snapshot: { ...snapshot, todayChanges, history },
    };
  }

  // Day rollover (possibly several days late, if the sync job did not run).
  // Everything that moved since the baseline is credited to `todayStr`, minus
  // whatever was already credited to the snapshot day - a move is never
  // counted on two days.
  const alreadyCredited = snapshot.todayChanges ?? {};
  const todayChanges: Record<string, number> = {};
  const baselinePrices: Record<string, number> = {};

  for (const el of elements) {
    const key = el.id.toString();
    baselinePrices[key] = el.now_cost;

    const baselineCost = baseline[key];
    if (baselineCost === undefined) continue;

    const diff = el.now_cost - baselineCost - (alreadyCredited[key] ?? 0);
    if (diff !== 0) {
      todayChanges[key] = diff;
      changesMap.set(el.id, diff);
    }
  }

  // Only close out a day that is actually in the past (guards against a
  // snapshot written with a future date because of clock skew).
  if (Object.keys(alreadyCredited).length > 0 && snapshot.date < todayStr) {
    history[snapshot.date] = alreadyCredited;
  }
  history[todayStr] = todayChanges;

  return {
    changesMap,
    updated: true,
    snapshot: { date: todayStr, baselinePrices, todayChanges, history },
  };
}

export async function getDailyPriceChanges(
  elements: Array<{ id: number; now_cost: number }>,
): Promise<{
  changesMap: Map<number, number>;
  history: Record<string, Record<string, number>>;
  updated: boolean;
}> {
  const todayStr = getUkDateString();
  let reconciliation: PriceReconciliation | null = null;

  try {
    const { data: cached } = await supabase
      .from("fpl_cache")
      .select("value")
      .eq("key", DAILY_PRICES_CACHE_KEY)
      .single();

    const snapshot = cached?.value as unknown as DailyPriceSnapshot | null;
    reconciliation = reconcileDailyPriceSnapshot(elements, snapshot, todayStr);

    // Nothing moved since the last run - skip the write entirely.
    if (reconciliation.updated) {
      await supabase.from("fpl_cache").upsert(
        {
          key: DAILY_PRICES_CACHE_KEY,
          value: reconciliation.snapshot as unknown as Json,
          updated_at: new Date().toISOString(),
          ttl_ms: 24 * 60 * 60 * 1000,
        },
        { onConflict: "key" },
      );
    }
  } catch (err) {
    console.error("Error syncing daily price snapshot:", err);
  }

  return {
    changesMap: reconciliation?.changesMap ?? new Map<number, number>(),
    history: reconciliation?.snapshot.history ?? {},
    updated: reconciliation?.updated ?? false,
  };
}

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

async function fetchFromUpstream(precomputed?: {
  changesMap: Map<number, number>;
  history: Record<string, Record<string, number>>;
}): Promise<{
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
  const currentGw = currentEvent?.id ?? nextEvent?.id ?? 1;
  const liveGw = currentEvent && !currentEvent.finished ? currentEvent.id : (currentEvent?.id ?? null);

  const teamFdrMap = new Map<number, number>();
  for (const team of bootstrap.teams) {
    teamFdrMap.set(team.id, computeAvgFdr(team.id, fixtures, currentGw));
  }

  const teamMap = new Map<number, FPLTeam>(
    bootstrap.teams.map((t) => [t.id, t]),
  );

  const { changesMap: dailyChangesMap, history: dailyPriceHistory } =
    precomputed ?? await getDailyPriceChanges(bootstrap.elements);

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
      cost_change_day: dailyChangesMap.get(p.id) ?? 0,
      price_change_percent: resolvePriceChangePercent(p, bootstrap.total_players),
      price_change_projected_percent: resolveProjectedPriceChangePercent(p),
    };
  });

  return {
    data: {
      players,
      teams: bootstrap.teams,
      events: bootstrap.events,
      fixtures,
      currentGameweek: currentGw,
      liveGameweek: liveGw,
      dailyPriceHistory,
      ukDate: getUkDateString(),
    },
    ttl,
  };
}

export async function fetchAndCacheFplData(precomputed?: {
  changesMap: Map<number, number>;
  history: Record<string, Record<string, number>>;
}): Promise<FplDataResult> {
  const { data: fresh, ttl } = await fetchFromUpstream(precomputed);
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

export async function getFplData(): Promise<FplDataResult> {
  const { data } = await supabase
    .from("fpl_cache")
    .select("value, updated_at, ttl_ms")
    .eq("key", CACHE_KEY)
    .single();

  if (data) {
    const age = Date.now() - new Date(data.updated_at).getTime();
    const ttl = data.ttl_ms ?? TTL.DEFAULT;
    const cached = data.value as unknown as FplDataResult;
    if (
      age < ttl &&
      cached &&
      cached.players &&
      cached.events &&
      cached.fixtures &&
      // `cost_change_day` is baked into the payload, so a payload built before
      // 00:00 UK time must not be served after the price changes land.
      cached.ukDate === getUkDateString() &&
      cached.dailyPriceHistory &&
      Object.keys(cached.dailyPriceHistory).length > 0
    ) {
      return cached;
    }
  }

  return fetchAndCacheFplData();
}

export async function syncDailyPrices(
  force = false,
): Promise<DailyPriceSyncResult> {
  const bootstrapRes = await fetch(FPL_BOOTSTRAP_URL, { headers: HEADERS });
  if (!bootstrapRes.ok) {
    throw new Error(
      `Failed to fetch FPL bootstrap data: ${bootstrapRes.statusText}`,
    );
  }
  const bootstrap: FPLBootstrapResponse = await bootstrapRes.json();
  const { changesMap, history, updated } = await getDailyPriceChanges(
    bootstrap.elements,
  );

  const risers: DailyPriceSyncPlayer[] = [];
  const fallers: DailyPriceSyncPlayer[] = [];

  const playerMap = new Map(bootstrap.elements.map((p) => [p.id, p]));

  for (const [id, change] of changesMap.entries()) {
    const p = playerMap.get(id);
    if (!p) continue;
    const item: DailyPriceSyncPlayer = {
      id,
      name: p.web_name,
      change,
      newCost: p.now_cost,
    };
    if (change > 0) risers.push(item);
    else if (change < 0) fallers.push(item);
  }

  // This endpoint runs on a schedule, so only rewrite the (large) FPL cache
  // when the price snapshot actually moved or a refresh was requested.
  if (updated || force) {
    await fetchAndCacheFplData({ changesMap, history });
  }

  return {
    success: true,
    date: getUkDateString(),
    risersCount: risers.length,
    fallersCount: fallers.length,
    risers,
    fallers,
  };
}

export interface FplGameweekInfo {
  currentGameweek: number | null;
  liveGameweek: number | null;
}

export async function getFplGameweekInfo(): Promise<FplGameweekInfo> {
  try {
    const { data } = await supabase
      .from("fpl_cache")
      .select("value->currentGameweek, value->liveGameweek, updated_at, ttl_ms")
      .eq("key", CACHE_KEY)
      .single();

    if (data) {
      const currentGw =
        typeof data.currentGameweek === "number"
          ? data.currentGameweek
          : Number(data.currentGameweek) || null;
      const liveGw =
        typeof data.liveGameweek === "number"
          ? data.liveGameweek
          : Number(data.liveGameweek) || null;
      if (currentGw !== null) {
        return {
          currentGameweek: currentGw,
          liveGameweek: liveGw,
        };
      }
    }
  } catch {
    // fallback to full getFplData if extraction fails
  }

  const full = await getFplData().catch(() => null);
  return {
    currentGameweek: full?.currentGameweek ?? null,
    liveGameweek: full?.liveGameweek ?? null,
  };
}