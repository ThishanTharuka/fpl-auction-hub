/**
 * Resolve a pasted list of player names (optionally suffixed with a club code)
 * against the FPL player pool, e.g. "Acheampong (CHE)".
 *
 * Kept deliberately structural so it only depends on the four fields it reads —
 * `EnrichedPlayer` satisfies `ShortlistCandidate` without any import.
 */

export interface ShortlistCandidate {
  id: number;
  web_name: string;
  full_name: string;
  team_short: string;
}

export interface ShortlistMatch {
  /** Matched player ids, deduplicated, in the order the names were pasted. */
  ids: number[];
  /** Pasted entries that could not be resolved to a player. */
  unmatched: string[];
}

/**
 * Case-, diacritic- and punctuation-insensitive key.
 *
 * "O'Brien", "O’Brien" and "Maitland-Niles" all collapse to the same key as
 * their FPL counterparts, and stray whitespace no longer matters.
 */
export function normalizePlayerKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const TRAILING_PUNCTUATION = /[,;.]+$/;
const LEADING_DECORATION = /^(?:[-*•·]\s+|\d{1,3}[.)]\s+)/;
const CLUB_SUFFIX = /\(([A-Za-z]{2,4})\)\s*$/;

interface ParsedEntry {
  name: string;
  club: string | null;
}

function parseEntry(text: string): ParsedEntry | null {
  const cleaned = text
    .trim()
    .replace(LEADING_DECORATION, "")
    .replace(TRAILING_PUNCTUATION, "")
    .trim();
  if (!cleaned) return null;

  const club = cleaned.match(CLUB_SUFFIX);
  if (club) {
    const name = cleaned.slice(0, club.index ?? cleaned.length).trim();
    if (!name) return null;
    return { name, club: club[1]!.toUpperCase() };
  }
  return { name: cleaned, club: null };
}

function addToIndex(
  index: Map<string, ShortlistCandidate[]>,
  key: string,
  player: ShortlistCandidate,
): void {
  if (!key) return;
  const bucket = index.get(key);
  if (bucket) {
    bucket.push(player);
  } else {
    index.set(key, [player]);
  }
}

function collect(
  ...buckets: Array<ShortlistCandidate[] | undefined>
): ShortlistCandidate[] {
  const seen = new Set<number>();
  const out: ShortlistCandidate[] = [];
  for (const bucket of buckets) {
    if (!bucket) continue;
    for (const player of bucket) {
      if (seen.has(player.id)) continue;
      seen.add(player.id);
      out.push(player);
    }
  }
  return out;
}

function resolveEntry(
  key: string,
  club: string | null,
  byWebName: Map<string, ShortlistCandidate[]>,
  byFullName: Map<string, ShortlistCandidate[]>,
): ShortlistCandidate | null {
  if (!key) return null;

  const named = collect(byWebName.get(key), byFullName.get(key));
  if (named.length === 0) return null;

  if (club) {
    const atClub = named.filter(
      (player) => player.team_short.toUpperCase() === club,
    );
    if (atClub.length > 0) return atClub[0]!;
    // The club code disagrees with every holder of this name. Trust the name
    // when it is unambiguous (codes go stale after transfers); otherwise bail.
    if (named.length > 1) return null;
  }

  return named[0]!;
}

/**
 * Parse `text` and match each entry against `players`.
 *
 * Entries are separated by newlines, commas or semicolons. A trailing club
 * code in parentheses is optional and used to disambiguate shared surnames.
 */
export function parseShortlist(
  text: string,
  players: readonly ShortlistCandidate[],
): ShortlistMatch {
  const byWebName = new Map<string, ShortlistCandidate[]>();
  const byFullName = new Map<string, ShortlistCandidate[]>();
  for (const player of players) {
    addToIndex(byWebName, normalizePlayerKey(player.web_name), player);
    addToIndex(byFullName, normalizePlayerKey(player.full_name), player);
  }

  const ids: number[] = [];
  const seen = new Set<number>();
  const unmatched: string[] = [];

  for (const part of text.split(/[\r\n,;]+/)) {
    const entry = parseEntry(part);
    if (!entry) continue;

    const player = resolveEntry(
      normalizePlayerKey(entry.name),
      entry.club,
      byWebName,
      byFullName,
    );

    if (!player) {
      unmatched.push(part.trim());
      continue;
    }
    if (seen.has(player.id)) continue;
    seen.add(player.id);
    ids.push(player.id);
  }

  return { ids, unmatched };
}
