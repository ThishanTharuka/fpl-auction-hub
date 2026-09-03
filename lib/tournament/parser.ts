export type ParsedFixtureLine = {
  matchday: number;
  home: string;
  away: string;
};

/**
 * Parses pasted fixture text. Format: a header line `MDx` (case-insensitive)
 * followed by pairing lines `Team A - Team B` or `Team A vs Team B`.
 */
export function parsePastedFixtures(text: string): ParsedFixtureLine[] {
  const lines = text.split(/\r?\n/);
  const result: ParsedFixtureLine[] = [];
  let matchday = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const md = line.match(/^MD\s*(\d+)\s*$/i);
    if (md) {
      matchday = parseInt(md[1] ?? "1", 10);
      continue;
    }
    if (matchday === 0) continue;
    const parts = line.split(/\s+-\s+|\s+vs\.?\s+/i);
    if (parts.length === 2) {
      const home = parts[0]?.trim() ?? "";
      const away = parts[1]?.trim() ?? "";
      if (home && away) result.push({ matchday, home, away });
    }
  }
  return result;
}

export type RosterTeam = {
  id: string;
  name: string;
};

export type TeamMatch =
  | { status: "exact"; team: RosterTeam }
  | { status: "fuzzy"; team: RosterTeam; distance: number }
  | { status: "ambiguous"; candidates: RosterTeam[] }
  | { status: "none" };

export function normalizeName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const curr = new Array<number>(n + 1);
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      const insert = (curr[j - 1] ?? Infinity) + 1;
      const remove = (prev[j] ?? Infinity) + 1;
      const substitute = (prev[j - 1] ?? Infinity) + cost;
      curr[j] = Math.min(insert, remove, substitute);
    }
    prev = curr;
  }
  return prev[n] ?? 0;
}

/**
 * Matches a pasted team name against the competition roster. Prefers exact,
 * then prefix (short) matches, then tight Levenshtein matches. Returns an
 * ambiguous candidate list when several names are equally close so the UI can
 * ask the user to resolve manually.
 */
export function matchTeamToRoster(
  name: string,
  roster: RosterTeam[],
): TeamMatch {
  const target = normalizeName(name);
  if (!target) return { status: "none" };

  const exact = roster.find((t) => normalizeName(t.name) === target);
  if (exact) return { status: "exact", team: exact };

  const scored: { team: RosterTeam; distance: number; prefix: boolean }[] = [];
  for (const t of roster) {
    const rn = normalizeName(t.name);
    if (!rn) continue;
    const prefix = rn.startsWith(target) || target.startsWith(rn);
    const distance = levenshtein(rn, target);
    const prefixTolerance = Math.max(2, Math.floor(Math.max(rn.length, target.length) / 4));
    if (prefix && target.length >= 3 && Math.abs(rn.length - target.length) <= prefixTolerance) {
      scored.push({ team: t, distance, prefix: true });
    } else if (!prefix && distance <= 2 && target.length >= 4) {
      scored.push({ team: t, distance, prefix: false });
    }
  }

  if (scored.length === 0) return { status: "none" };
  scored.sort(
    (a, b) =>
      a.distance - b.distance ||
      Number(b.prefix) - Number(a.prefix),
  );
  const best = scored[0];
  if (!best) return { status: "none" };
  const tied = scored.filter((s) => s.distance === best.distance);
  if (tied.length > 1) {
    return { status: "ambiguous", candidates: tied.map((s) => s.team) };
  }
  return { status: "fuzzy", team: best.team, distance: best.distance };
}