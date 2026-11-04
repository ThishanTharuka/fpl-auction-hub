import { describe, it, expect } from "vitest";
import {
  normalizePlayerKey,
  parseShortlist,
  type ShortlistCandidate,
} from "@/lib/player-shortlist";

const players: ShortlistCandidate[] = [
  { id: 1, web_name: "Acheampong", full_name: "Josh Acheampong", team_short: "CHE" },
  { id: 2, web_name: "Ajer", full_name: "Kristoffer Ajer", team_short: "BRE" },
  { id: 3, web_name: "Dedić", full_name: "Sead Dedić", team_short: "NEW" },
  { id: 4, web_name: "Muharemović", full_name: "Armin Muharemović", team_short: "LEE" },
  { id: 5, web_name: "O'Brien", full_name: "James O'Brien", team_short: "EVE" },
  { id: 6, web_name: "O'Reilly", full_name: "Nico O'Reilly", team_short: "MCI" },
  { id: 7, web_name: "Porro", full_name: "Pedro Porro", team_short: "TOT" },
  { id: 8, web_name: "Silva", full_name: "Bernardo Silva", team_short: "MCI" },
  { id: 9, web_name: "Silva", full_name: "Tom Silva", team_short: "BOU" },
  { id: 10, web_name: "Maitland-Niles", full_name: "Ainsley Maitland-Niles", team_short: "EVE" },
];

describe("normalizePlayerKey", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizePlayerKey("O'Brien")).toBe("obrien");
    expect(normalizePlayerKey("Maitland-Niles")).toBe("maitlandniles");
    expect(normalizePlayerKey("Pedro  Porro")).toBe("pedroporro");
  });

  it("strips diacritics", () => {
    expect(normalizePlayerKey("Dedić")).toBe("dedic");
    expect(normalizePlayerKey("Muharemović")).toBe("muharemovic");
  });

  it("treats curly and straight apostrophes the same", () => {
    expect(normalizePlayerKey("O’Brien")).toBe(normalizePlayerKey("O'Brien"));
  });
});

describe("parseShortlist", () => {
  it("matches name plus club code", () => {
    const result = parseShortlist("Acheampong (CHE)", players);
    expect(result.ids).toEqual([1]);
    expect(result.unmatched).toEqual([]);
  });

  it("matches without a club code", () => {
    const result = parseShortlist("Ajer", players);
    expect(result.ids).toEqual([2]);
  });

  it("is case-insensitive on the club code", () => {
    expect(parseShortlist("Acheampong (che)", players).ids).toEqual([1]);
  });

  it("disambiguates shared surnames by club", () => {
    expect(parseShortlist("Silva (BOU)", players).ids).toEqual([9]);
    expect(parseShortlist("Silva (MCI)", players).ids).toEqual([8]);
  });

  it("reports an ambiguous name when no club code resolves it", () => {
    const result = parseShortlist("Silva (CHE)", players);
    expect(result.ids).toEqual([]);
    expect(result.unmatched).toEqual(["Silva (CHE)"]);
  });

  it("trusts an unambiguous name over a stale club code", () => {
    expect(parseShortlist("Ajer (LIV)", players).ids).toEqual([2]);
  });

  it("matches diacritics in pasted names", () => {
    const result = parseShortlist("Dedić (NEW)\nMuharemović (LEE)", players);
    expect(result.ids).toEqual([3, 4]);
  });

  it("matches straight and curly apostrophes", () => {
    const result = parseShortlist("O'Brien (EVE)\nO’Reilly (MCI)", players);
    expect(result.ids).toEqual([5, 6]);
  });

  it("matches a shortened web name against the full name", () => {
    expect(parseShortlist("Pedro Porro (TOT)", players).ids).toEqual([7]);
  });

  it("matches a short web name that differs from the full name", () => {
    expect(parseShortlist("Porro (TOT)", players).ids).toEqual([7]);
  });

  it("keeps the pasted order and deduplicates repeats", () => {
    const result = parseShortlist(
      "Silva (BOU)\nAjer (BRE)\nSilva (BOU)",
      players,
    );
    expect(result.ids).toEqual([9, 2]);
  });

  it("reports unknown names verbatim", () => {
    const result = parseShortlist("Nkunku (CHE)\nAcheampong (CHE)", players);
    expect(result.ids).toEqual([1]);
    expect(result.unmatched).toEqual(["Nkunku (CHE)"]);
  });

  it("ignores blank lines and list decoration", () => {
    const result = parseShortlist(
      "\n1. Ajer (BRE)\n- Acheampong (CHE)\n\n• Porro (TOT)\n",
      players,
    );
    expect(result.ids).toEqual([2, 1, 7]);
  });

  it("accepts comma-separated entries on a single line", () => {
    const result = parseShortlist("Ajer (BRE), Acheampong (CHE); Porro (TOT)", players);
    expect(result.ids).toEqual([2, 1, 7]);
    expect(result.unmatched).toEqual([]);
  });

  it("handles CRLF line endings", () => {
    const result = parseShortlist("Ajer (BRE)\r\nAcheampong (CHE)\r\n", players);
    expect(result.ids).toEqual([2, 1]);
  });

  it("returns empty results for empty input", () => {
    expect(parseShortlist("", players)).toEqual({ ids: [], unmatched: [] });
    expect(parseShortlist("   \n\n", players)).toEqual({
      ids: [],
      unmatched: [],
    });
  });
});
