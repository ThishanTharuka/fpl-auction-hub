import { describe, it, expect } from "vitest";
import { reconcileDailyPriceSnapshot } from "@/lib/fpl-data";
import type { DailyPriceSnapshot } from "@/lib/fpl-data";
import { getUkDateString, shiftDateString, daysBetweenDateStrings } from "@/lib/fpl-dates";

function snapshot(overrides: Partial<DailyPriceSnapshot> = {}): DailyPriceSnapshot {
  return {
    date: "2026-10-22",
    baselinePrices: { "1": 50, "2": 60 },
    todayChanges: {},
    history: { "2026-10-22": {} },
    ...overrides,
  };
}

describe("getUkDateString", () => {
  it("uses the UK calendar day rather than UTC during BST", () => {
    // 23:30 UTC on 22 Oct is 00:30 on 23 Oct in the UK (BST).
    expect(getUkDateString(new Date("2026-10-22T23:30:00Z"))).toBe("2026-10-23");
  });

  it("matches UTC during GMT", () => {
    expect(getUkDateString(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-15");
  });

  it("shifts date strings and measures gaps", () => {
    expect(shiftDateString("2026-10-01", -1)).toBe("2026-09-30");
    expect(daysBetweenDateStrings("2026-10-17", "2026-10-22")).toBe(5);
  });
});

describe("reconcileDailyPriceSnapshot", () => {
  it("seeds a baseline on the first ever run", () => {
    const result = reconcileDailyPriceSnapshot(
      [
        { id: 1, now_cost: 50 },
        { id: 2, now_cost: 60 },
      ],
      null,
      "2026-10-22",
    );

    expect(result.updated).toBe(true);
    expect(result.snapshot.date).toBe("2026-10-22");
    expect(result.snapshot.baselinePrices).toEqual({ "1": 50, "2": 60 });
    expect(result.snapshot.history).toEqual({ "2026-10-22": {} });
    expect(result.changesMap.size).toBe(0);
  });

  it("records same-day moves and is idempotent", () => {
    const first = reconcileDailyPriceSnapshot(
      [
        { id: 1, now_cost: 51 },
        { id: 2, now_cost: 60 },
      ],
      snapshot(),
      "2026-10-22",
    );

    expect(first.updated).toBe(true);
    expect(first.changesMap.get(1)).toBe(1);
    expect(first.snapshot.todayChanges).toEqual({ "1": 1 });
    expect(first.snapshot.history?.["2026-10-22"]).toEqual({ "1": 1 });

    const second = reconcileDailyPriceSnapshot(
      [
        { id: 1, now_cost: 51 },
        { id: 2, now_cost: 60 },
      ],
      first.snapshot,
      "2026-10-22",
    );

    expect(second.updated).toBe(false);
  });

  it("drops a same-day entry when the price returns to baseline", () => {
    const reverted = reconcileDailyPriceSnapshot(
      [{ id: 1, now_cost: 50 }],
      snapshot({
        baselinePrices: { "1": 50 },
        todayChanges: { "1": 1 },
        history: { "2026-10-22": { "1": 1 } },
      }),
      "2026-10-22",
    );

    expect(reverted.updated).toBe(true);
    expect(reverted.snapshot.todayChanges).toEqual({});
    expect(reverted.snapshot.history?.["2026-10-22"]).toEqual({});
  });

  it("rolls over to the new UK day without double counting", () => {
    const previous = snapshot({
      date: "2026-10-21",
      todayChanges: { "1": 1 },
      history: { "2026-10-21": { "1": 1 } },
    });

    const result = reconcileDailyPriceSnapshot(
      [
        { id: 1, now_cost: 51 },
        { id: 2, now_cost: 60 },
      ],
      previous,
      "2026-10-22",
    );

    // Player 1's +0.1m was already credited to the 21st.
    expect(result.changesMap.size).toBe(0);
    expect(result.snapshot.date).toBe("2026-10-22");
    expect(result.snapshot.baselinePrices).toEqual({ "1": 51, "2": 60 });
    expect(result.snapshot.history).toEqual({
      "2026-10-21": { "1": 1 },
      "2026-10-22": {},
    });
  });

  it("credits a rollover move exactly once and keeps prior days intact", () => {
    const result = reconcileDailyPriceSnapshot(
      [{ id: 1, now_cost: 52 }],
      snapshot({
        date: "2026-10-21",
        baselinePrices: { "1": 50 },
        todayChanges: { "1": 1 },
        history: { "2026-10-21": { "1": 1 } },
      }),
      "2026-10-22",
    );

    expect(result.changesMap.get(1)).toBe(1);
    expect(result.snapshot.todayChanges).toEqual({ "1": 1 });
    expect(result.snapshot.history).toEqual({
      "2026-10-21": { "1": 1 },
      "2026-10-22": { "1": 1 },
    });
  });

  it("attributes a multi-day gap to the current day only", () => {
    const result = reconcileDailyPriceSnapshot(
      [{ id: 1, now_cost: 54 }],
      snapshot({
        date: "2026-10-17",
        baselinePrices: { "1": 50 },
        todayChanges: {},
        history: { "2026-10-17": {} },
      }),
      "2026-10-22",
    );

    expect(result.changesMap.get(1)).toBe(4);
    expect(result.snapshot.history?.["2026-10-22"]).toEqual({ "1": 4 });
    expect(result.snapshot.history?.["2026-10-17"]).toEqual({});
  });
});
