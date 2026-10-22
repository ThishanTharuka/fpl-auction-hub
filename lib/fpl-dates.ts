/**
 * FPL price changes are applied daily at 00:00 Europe/London. Every bucket in
 * the price-change history therefore has to use the UK calendar day, not UTC:
 * during BST (late March to late October) 00:00 UK time is 23:00 UTC on the
 * previous UTC day, so UTC keys file a move under the wrong day (and can file
 * the same move twice, once on each side of the UTC midnight).
 */
export const FPL_PRICE_TIME_ZONE = "Europe/London";

const ukDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: FPL_PRICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The current (or given) moment as a `YYYY-MM-DD` UK calendar date. */
export function getUkDateString(date: Date = new Date()): string {
  const parts = ukDateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    // Extremely defensive fallback: ICU should always provide these parts.
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

/** Shifts a `YYYY-MM-DD` string by whole days. */
export function shiftDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const base = new Date(
    Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1),
  );
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Whole-day difference between two `YYYY-MM-DD` strings (`b - a`). */
export function daysBetweenDateStrings(a: string, b: string): number {
  const toUtc = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  };
  return Math.round((toUtc(b) - toUtc(a)) / (24 * 60 * 60 * 1000));
}
