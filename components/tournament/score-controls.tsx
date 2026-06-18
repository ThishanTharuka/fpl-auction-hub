"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator } from "lucide-react";
import { toast } from "sonner";

const GW_LABELS = Array.from({ length: 38 }, (_, i) => i + 1);

export function ScoreControls({
  tournamentId,
  startGw,
  endGw,
}: {
  tournamentId: string;
  startGw: number;
  endGw: number;
}) {
  const router = useRouter();
  const [gw, setGw] = useState(endGw);
  const [scoring, setScoring] = useState(false);

  const handleScore = async () => {
    setScoring(true);
    try {
      const res = await fetch(`/api/tournament/${tournamentId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gw }),
      });

      const data = (await res.json()) as {
        scored?: { stage: string; matchesScored: number; standingsUpdated: boolean }[];
        error?: string;
      };

      if (!res.ok) {
        toast.error(data.error ?? "Failed to score");
        return;
      }

      const details = (data.scored ?? [])
        .map((s) => `${s.stage}: ${s.matchesScored} matches`)
        .join(", ");

      toast.success(`GW${gw} scored — ${details}`);
      router.refresh();
    } catch {
      toast.error("Failed to score");
    } finally {
      setScoring(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={gw}
        onChange={(e) => setGw(Number(e.target.value))}
        className="h-7 text-xs bg-[#1e2b3b] border border-[#3b4b3d] text-[#d6e4f9] rounded px-2"
      >
        {GW_LABELS.filter((g) => g >= startGw && g <= endGw).map((g) => (
          <option key={g} value={g}>GW{g}</option>
        ))}
      </select>
      <button
        onClick={handleScore}
        disabled={scoring}
        className="flex items-center gap-1 text-xs text-[#00e478] hover:text-[#00e478]/80 disabled:opacity-50"
        title="Score this gameweek"
      >
        <Calculator size={14} />
        {scoring ? "Scoring..." : "Score"}
      </button>
    </div>
  );
}
