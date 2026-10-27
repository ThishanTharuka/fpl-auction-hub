"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChipNote, FixtureChipNotes } from "@/lib/tournament/chips";
import type { CompetitionFixtureRow } from "@/lib/tournament/types";

const CHIP_BADGE_CLS =
  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";

/**
 * Badges for chips that were played where chips are not allowed, showing how
 * many points were taken off (or that the fixture needs manual entry).
 */
export function FixtureChipBadges({ notes }: { notes: FixtureChipNotes | null | undefined }) {
  const list = [notes?.home, notes?.away].filter(Boolean) as ChipNote[];
  if (list.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {list.map((n) => (
        <span key={n.chip} className={CHIP_BADGE_CLS} title={n.reason}>
          {n.label}
          {n.applied && n.penalty > 0 ? ` -${n.penalty}` : ""}
          {!n.applied ? " · manual" : ""}
        </span>
      ))}
    </div>
  );
}

/** Compact "Edit score" trigger plus the override label, for the fixture row. */
export function ScoreOverrideButton({
  fixture,
  onEdit,
}: {
  fixture: CompetitionFixtureRow;
  onEdit: () => void;
}) {
  // `typeof` rather than `!== null`: the field is absent (undefined) until the
  // migration lands, so a strict null check would falsely show an override.
  const hasOverride =
    typeof fixture.home_points_override === "number" ||
    typeof fixture.away_points_override === "number";

  return (
    <div className="flex flex-col items-end gap-0.5">
      {hasOverride && (
        <span
          className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 max-w-[160px] truncate"
          title={fixture.override_reason ?? "Score pinned by an admin"}
        >
          Override{fixture.override_reason ? `: ${fixture.override_reason}` : ""}
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onEdit}
        className="h-7 px-2 text-[11px] border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b]"
      >
        Edit score
      </Button>
    </div>
  );
}

type PanelProps = {
  competitionId: string;
  fixture: CompetitionFixtureRow;
  homeName: string;
  awayName: string;
  /** Called with the updated fixture so the parent can refresh its state. */
  onSaved: (fixture: CompetitionFixtureRow) => void;
  onCancel: () => void;
  onError: (message: string) => void;
};

/**
 * Full-width editor for a scored fixture. The score it writes is stored as an
 * override, so later auto-score runs never clobber it. "Clear override" hands
 * the fixture back to auto-score.
 */
export function ScoreOverridePanel({
  competitionId,
  fixture,
  homeName,
  awayName,
  onSaved,
  onCancel,
  onError,
}: PanelProps) {
  // `typeof` rather than `!== null`: the field is absent (undefined) until the
  // migration lands, so a strict null check would falsely show an override.
  const hasOverride =
    typeof fixture.home_points_override === "number" ||
    typeof fixture.away_points_override === "number";

  const [home, setHome] = useState(fixture.home_points === null ? "" : String(fixture.home_points));
  const [away, setAway] = useState(fixture.away_points === null ? "" : String(fixture.away_points));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const homePoints = Number.parseInt(home, 10);
    const awayPoints = Number.parseInt(away, 10);
    if (!Number.isInteger(homePoints) || !Number.isInteger(awayPoints)) {
      onError("Enter both point totals before saving.");
      return;
    }
    if (!reason.trim()) {
      onError("A reason is required for a score override.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(
        `/api/tournaments/${competitionId}/fixtures/${fixture.id}/score`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ homePoints, awayPoints, reason: reason.trim() }),
        },
      );
      const data = (await res.json()) as {
        fixture?: CompetitionFixtureRow;
        error?: string;
      };
      if (!res.ok || !data.fixture) {
        onError(data.error ?? "Could not save the override.");
        return;
      }
      onSaved(data.fixture);
    } catch {
      onError("Could not save the override.");
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/tournaments/${competitionId}/fixtures/${fixture.id}/score`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as {
        fixture?: CompetitionFixtureRow;
        error?: string;
      };
      if (!res.ok || !data.fixture) {
        onError(data.error ?? "Could not clear the override.");
        return;
      }
      onSaved(data.fixture);
    } catch {
      onError("Could not clear the override.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2.5">
      <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
        Override score{homeName && awayName ? ` · ${homeName} vs ${awayName}` : ""}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          aria-label={`${homeName} points`}
          value={home}
          onChange={(e) => setHome(e.target.value)}
          className="w-16 h-8 bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9] text-xs text-center font-bold"
        />
        <span className="text-xs text-[#849585]">–</span>
        <Input
          type="number"
          aria-label={`${awayName} points`}
          value={away}
          onChange={(e) => setAway(e.target.value)}
          className="w-16 h-8 bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9] text-xs text-center font-bold"
        />
        <Input
          aria-label="Override reason"
          placeholder="Why is this score being corrected?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          className="h-8 flex-1 min-w-[200px] bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9] text-xs"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={busy}
          className="h-7 px-3 text-[11px] bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-semibold"
        >
          {busy ? "Saving..." : "Save override"}
        </Button>
        {hasOverride && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clear}
            disabled={busy}
            className="h-7 px-3 text-[11px] border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b]"
          >
            Clear override
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={busy}
          className="h-7 px-3 text-[11px] text-[#849585] hover:text-[#d6e4f9]"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
