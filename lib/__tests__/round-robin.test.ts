import { describe, it, expect } from "vitest";
import {
  generateCrossGroupSchedule,
  generateSingleRoundRobin,
} from "@/lib/tournament/round-robin";

const ids = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => `t${i + 1}`);

describe("generateSingleRoundRobin", () => {
  it("produces n-1 rounds for an even roster", () => {
    const rounds = generateSingleRoundRobin(ids(10));
    expect(rounds).toHaveLength(9);
  });

  it("plays every team once per round", () => {
    const rounds = generateSingleRoundRobin(ids(10));
    for (const round of rounds) {
      const seen = new Set<string>();
      for (const p of round) {
        expect(seen.has(p.home)).toBe(false);
        expect(seen.has(p.away)).toBe(false);
        seen.add(p.home);
        seen.add(p.away);
      }
      expect(seen.size).toBe(10);
    }
  });

  it("pairs every team against every other exactly once", () => {
    const rounds = generateSingleRoundRobin(ids(10));
    const pairs = new Set<string>();
    for (const round of rounds) {
      for (const p of round) {
        const key = [p.home, p.away].sort().join("|");
        expect(pairs.has(key)).toBe(false);
        pairs.add(key);
      }
    }
    expect(pairs.size).toBe(45);
  });

  it("handles an odd roster with byes (no self-play, full coverage)", () => {
    const rounds = generateSingleRoundRobin(ids(9));
    expect(rounds).toHaveLength(9);
    const pairs = new Set<string>();
    for (const round of rounds) {
      const seen = new Set<string>();
      for (const p of round) {
        expect(p.home).not.toBe(p.away);
        expect(seen.has(p.home)).toBe(false);
        expect(seen.has(p.away)).toBe(false);
        seen.add(p.home);
        seen.add(p.away);
        const key = [p.home, p.away].sort().join("|");
        pairs.add(key);
      }
    }
    expect(pairs.size).toBe(36);
  });

  it("rotation 2 is the return fixture: every pair reversed and each team once at home", () => {
    const first = generateSingleRoundRobin(ids(10), 1);
    const second = generateSingleRoundRobin(ids(10), 2);

    const firstPairs = new Map<string, { home: string; away: string }>();
    for (const round of first) {
      for (const p of round) {
        firstPairs.set([p.home, p.away].sort().join("|"), p);
      }
    }

    let count = 0;
    for (const round of second) {
      for (const p of round) {
        const key = [p.home, p.away].sort().join("|");
        const first = firstPairs.get(key);
        expect(first).toBeDefined();
        expect(p.home).toBe(first?.away);
        expect(p.away).toBe(first?.home);
        count++;
      }
    }
    expect(count).toBe(45);
    expect(second[0]?.[0]?.home).toBe(first[8]?.[0]?.away);
  });

  it("returns no rounds for fewer than two teams", () => {
    expect(generateSingleRoundRobin(ids(1))).toEqual([]);
    expect(generateSingleRoundRobin([])).toEqual([]);
  });
});

describe("generateCrossGroupSchedule", () => {
  it("covers every A-B pairing exactly once over max(size) rounds", () => {
    const rounds = generateCrossGroupSchedule(ids(10), ids(10).map((id) => `b${id}`));
    expect(rounds).toHaveLength(10);
    const pairs = new Set<string>();
    for (const round of rounds) {
      expect(round).toHaveLength(10);
      for (const p of round) {
        const key = [p.home, p.away].sort().join("|");
        expect(pairs.has(key)).toBe(false);
        pairs.add(key);
      }
    }
    expect(pairs.size).toBe(100);
  });

  it("covers all A-B pairings for unequal sizes (byes on the larger side)", () => {
    const rounds = generateCrossGroupSchedule(ids(8), ids(6).map((id) => `b${id}`));
    expect(rounds).toHaveLength(8);
    const pairs = new Set<string>();
    for (const round of rounds) {
      expect(round).toHaveLength(6);
      for (const p of round) {
        const key = [p.home, p.away].sort().join("|");
        expect(pairs.has(key)).toBe(false);
        pairs.add(key);
      }
    }
    expect(pairs.size).toBe(48);
  });

  it("returns no rounds when either side is empty", () => {
    expect(generateCrossGroupSchedule([], ids(5))).toEqual([]);
    expect(generateCrossGroupSchedule(ids(5), [])).toEqual([]);
  });
});