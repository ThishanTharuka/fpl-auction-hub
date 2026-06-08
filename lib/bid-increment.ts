export type BidIncrementTier = {
  threshold: number;
  increment: number;
};

export const DEFAULT_TIERS: BidIncrementTier[] = [
  { threshold: 0, increment: 0.5 },
  { threshold: 10, increment: 1.0 },
];

export function resolveIncrement(
  tiers: BidIncrementTier[] | null | undefined,
  currentBid: number,
): number {
  if (!tiers || tiers.length === 0) return 0.5;
  const sorted = [...tiers].sort((a, b) => b.threshold - a.threshold);
  for (const tier of sorted) {
    if (currentBid >= tier.threshold) return tier.increment;
  }
  return tiers[0]?.increment ?? 0.5;
}

export function resolveBidAmountWithTiers(
  currentBid: number,
  currentBidderId: string | null | undefined,
  startingPrice: number,
  tiers: BidIncrementTier[] | null | undefined,
): number {
  if (!currentBidderId) return startingPrice;
  const increment = resolveIncrement(tiers, currentBid);
  return Number((currentBid + increment).toFixed(1));
}
