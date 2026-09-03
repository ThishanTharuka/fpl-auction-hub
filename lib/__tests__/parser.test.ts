import { describe, it, expect } from "vitest";
import {
  parsePastedFixtures,
  matchTeamToRoster,
  normalizeName,
  levenshtein,
} from "@/lib/tournament/parser";
import type { CompetitionTeamRow } from "@/lib/tournament/types";

const team = (id: string, name: string): CompetitionTeamRow => ({
  id,
  competition_id: "c1",
  group_label: "A",
  participant_id: id,
  league_id: "l1",
  name,
  color: null,
  avatar_url: null,
  fpl_manager_id: null,
  team_number: 1,
  created_at: "",
});

describe("parsePastedFixtures", () => {
  it("parses MD headers with hyphen and vs separators", () => {
    const text = [
      "MD1",
      "Team One - Team Two",
      "Team Three vs Team Four",
      "MD2",
      "Team One - Team Three",
    ].join("\n");
    const parsed = parsePastedFixtures(text);
    expect(parsed).toEqual([
      { matchday: 1, home: "Team One", away: "Team Two" },
      { matchday: 1, home: "Team Three", away: "Team Four" },
      { matchday: 2, home: "Team One", away: "Team Three" },
    ]);
  });

  it("supports 'vs.' with a dot and mixed case headers", () => {
    const text = "Md 1\nCrystal M FC vs. Crystal Meth FC";
    const parsed = parsePastedFixtures(text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.home).toBe("Crystal M FC");
    expect(parsed[0]?.away).toBe("Crystal Meth FC");
  });

  it("ignores lines before the first MD header and blank lines", () => {
    const text = "random preamble\n\nMD1\nA - B";
    const parsed = parsePastedFixtures(text);
    expect(parsed).toHaveLength(1);
  });

  it("skips malformed pairing lines", () => {
    const text = "MD1\nA - B\nsolo line\nC vs D";
    const parsed = parsePastedFixtures(text);
    expect(parsed).toHaveLength(2);
  });
});

describe("matchTeamToRoster", () => {
  const roster = [
    team("t1", "Crystal Meth FC"),
    team("t2", "Crystal Palace FC"),
    team("t3", "Manchester United"),
  ];

  it("matches exact names (case/whitespace insensitive)", () => {
    const match = matchTeamToRoster("  CRYSTAL METH FC ", roster);
    expect(match.status).toBe("exact");
    if (match.status === "exact") expect(match.team.id).toBe("t1");
  });

  it("does NOT fuzzy-match a shorter distinct name (manual resolution case)", () => {
    const match = matchTeamToRoster("Crystal M FC", roster);
    expect(match.status).toBe("none");
  });

  it("fuzzy-matches close variants within distance 2", () => {
    const match = matchTeamToRoster("Crystal Palce FC", roster);
    expect(match.status).toBe("fuzzy");
    if (match.status === "fuzzy") expect(match.team.id).toBe("t2");
  });

  it("matches via prefix for truncated names", () => {
    const match = matchTeamToRoster("Manchester Unit", roster);
    expect(match.status).toBe("fuzzy");
    if (match.status === "fuzzy") expect(match.team.id).toBe("t3");
  });

  it("returns none for an empty target", () => {
    expect(matchTeamToRoster("", roster).status).toBe("none");
  });
});

describe("normalizeName", () => {
  it("collapses whitespace, lowercases and strips punctuation", () => {
    expect(normalizeName("  Crystal M. FC  ")).toBe("crystal m fc");
  });
});

describe("levenshtein", () => {
  it("computes edit distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "abc")).toBe(0);
  });
});