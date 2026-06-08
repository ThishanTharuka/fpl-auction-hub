"use client";

import { useCallback } from "react";
import type { BidIncrementTier } from "@/lib/bid-increment";

const inputClass =
  "h-10 px-3 rounded-lg bg-[#1a2b3d] border border-[#3b4b3d] text-[#d6e4f9] font-mono text-sm text-center outline-none focus:ring-2 focus:ring-[#00e478]/40 focus:border-[#00e478] transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export function BidIncrementTierEditor({
  tiers,
  onChange,
}: {
  tiers: BidIncrementTier[];
  onChange: (tiers: BidIncrementTier[]) => void;
}) {
  const update = useCallback(
    (index: number, field: "threshold" | "increment", value: number) => {
      const next = tiers.map((t, i) =>
        i === index ? { ...t, [field]: value } : t,
      );
      onChange(next);
    },
    [tiers, onChange],
  );

  const remove = useCallback(
    (index: number) => {
      onChange(tiers.filter((_, i) => i !== index));
    },
    [tiers, onChange],
  );

  const add = useCallback(() => {
    const lastThreshold =
      tiers.length > 0 ? (tiers[tiers.length - 1] as BidIncrementTier).threshold : 0;
    onChange([
      ...tiers,
      { threshold: lastThreshold + 10, increment: 1.0 },
    ]);
  }, [tiers, onChange]);

  const canRemove = tiers.length > 1;

  return (
    <div className="space-y-3">
      {/* Title + tier count badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#849585]">Bid Increment Tiers</span>
        <span className="text-[10px] font-medium text-[#00e478] bg-[#00e478]/10 px-1.5 py-0.5 rounded">
          {tiers.length} {tiers.length === 1 ? "tier" : "tiers"}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_1fr_32px] gap-3 items-center">
        <span
          className="text-[11px] text-[#849585] uppercase"
          style={{ letterSpacing: "0.06em" }}
        >
          Threshold
        </span>
        <span
          className="text-[11px] text-[#849585] uppercase"
          style={{ letterSpacing: "0.06em" }}
        >
          Increment
        </span>
      </div>

      {/* Tier rows */}
      {tiers.map((tier, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_1fr_32px] gap-3 items-center"
        >
          <input
            type="number"
            value={tier.threshold}
            onChange={(e) => update(i, "threshold", Number(e.target.value))}
            min={0}
            max={200}
            step={0.5}
            readOnly={i === 0}
            className={inputClass + (i === 0 ? " cursor-not-allowed opacity-60" : "")}
          />
          <input
            type="number"
            value={tier.increment}
            onChange={(e) => update(i, "increment", Number(e.target.value))}
            min={0.1}
            max={5}
            step={0.1}
            className={inputClass}
          />
          <button
            onClick={() => remove(i)}
            disabled={!canRemove}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sm text-[#849585] bg-transparent transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#849585]"
            aria-label="Remove tier"
          >
            &times;
          </button>
        </div>
      ))}

      {/* Divider */}
      <hr className="border-0 h-px bg-[#3b4b3d]/50" />

      {/* Add button */}
      <button
        onClick={add}
        className="flex items-center justify-center gap-2 w-full h-10 rounded-lg border border-dashed border-[#3b4b3d] text-xs text-[#849585] bg-transparent transition-colors hover:border-[#00e478]/50 hover:text-[#00e478]"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="7" y1="1" x2="7" y2="13" />
          <line x1="1" y1="7" x2="13" y2="7" />
        </svg>
        Add Tier
      </button>
    </div>
  );
}
