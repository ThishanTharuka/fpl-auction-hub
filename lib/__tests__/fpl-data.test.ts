import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }) }) }),
}));

import { computeAvgFdr, getCurrentTtl } from "@/lib/fpl-data";
import type { FPLFixture } from "@/lib/fpl-types";

describe("computeAvgFdr", () => {
  const fixtures: FPLFixture[] = [
    { id: 1, event: 1, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4, finished: false, kickoff_time: null },
    { id: 2, event: 2, team_h: 3, team_a: 1, team_h_difficulty: 3, team_a_difficulty: 5, finished: false, kickoff_time: null },
    { id: 3, event: 3, team_h: 1, team_a: 4, team_h_difficulty: 2, team_a_difficulty: 3, finished: false, kickoff_time: null },
    { id: 4, event: 4, team_h: 5, team_a: 1, team_h_difficulty: 4, team_a_difficulty: 2, finished: false, kickoff_time: null },
    { id: 5, event: 5, team_h: 1, team_a: 6, team_h_difficulty: 1, team_a_difficulty: 5, finished: false, kickoff_time: null },
  ];

  it("averages difficulty for upcoming home fixtures", () => {
    const result = computeAvgFdr(1, fixtures, 1);
    expect(result).toBe(2.4);
  });

  it("averages difficulty for upcoming away fixtures", () => {
    const result = computeAvgFdr(2, fixtures, 1);
    expect(result).toBe(4.0);
  });

  it("returns 3 when no upcoming fixtures", () => {
    const result = computeAvgFdr(99, fixtures, 1);
    expect(result).toBe(3);
  });

  it("filters fixtures by current gameweek", () => {
    const result = computeAvgFdr(1, fixtures, 3);
    expect(result).toBe(1.7);
  });

  it("excludes finished fixtures", () => {
    const mixed = [
      { ...fixtures[0]!, finished: true },
      ...fixtures.slice(1),
    ];
    const result = computeAvgFdr(1, mixed, 1);
    expect(result).toBe(2.5);
  });

  it("handles fixtures with null event (TBC)", () => {
    const withNull = [...fixtures, { ...fixtures[0]!, id: 99, event: null }];
    const result = computeAvgFdr(1, withNull, 1);
    expect(result).toBe(2.4);
  });

  it("only uses next 5 fixtures", () => {
    const manyFixtures = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      event: i + 1,
      team_h: 1,
      team_a: i + 10,
      team_h_difficulty: 5,
      team_a_difficulty: 1,
      finished: false,
      kickoff_time: null,
    }));
    const result = computeAvgFdr(1, manyFixtures, 1);
    expect(result).toBe(5.0);
  });
});

describe("getCurrentTtl", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns MATCHDAY TTL when a fixture starts today", () => {
    const now = new Date("2026-06-10T12:00:00Z");
    vi.setSystemTime(now);
    const fixtures = [
      { kickoff_time: "2026-06-10T15:00:00Z" },
    ] as FPLFixture[];
    expect(getCurrentTtl(fixtures)).toBe(300000);
  });

  it("returns MATCHDAY_EVE TTL when a fixture starts tomorrow", () => {
    const now = new Date("2026-06-10T12:00:00Z");
    vi.setSystemTime(now);
    const fixtures = [
      { kickoff_time: "2026-06-11T15:00:00Z" },
    ] as FPLFixture[];
    expect(getCurrentTtl(fixtures)).toBe(1800000);
  });

  it("returns DEFAULT TTL when no match today or tomorrow", () => {
    const now = new Date("2026-06-10T12:00:00Z");
    vi.setSystemTime(now);
    const fixtures = [
      { kickoff_time: "2026-06-15T15:00:00Z" },
    ] as FPLFixture[];
    expect(getCurrentTtl(fixtures)).toBe(7200000);
  });

  it("returns DEFAULT TTL when fixtures array is empty", () => {
    const now = new Date("2026-06-10T12:00:00Z");
    vi.setSystemTime(now);
    expect(getCurrentTtl([])).toBe(7200000);
  });

  it("ignores fixtures with null kickoff_time", () => {
    const now = new Date("2026-06-10T12:00:00Z");
    vi.setSystemTime(now);
    const fixtures = [
      { kickoff_time: null },
    ] as FPLFixture[];
    expect(getCurrentTtl(fixtures)).toBe(7200000);
  });
});
