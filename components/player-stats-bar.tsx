import type { EnrichedPlayer } from "@/lib/fpl-types";

type Props = Readonly<{ player: EnrichedPlayer; className?: string }>;

interface Stat {
  label: string;
  value: string | number;
}

function buildStats(p: EnrichedPlayer): Stat[] {
  const isAttack = p.position === "MID" || p.position === "FWD";
  const posRow: Stat[] = isAttack
    ? [
        { label: "Goals", value: p.goals_scored },
        { label: "Assists", value: p.assists },
        { label: "xGI", value: Number(p.expected_goal_involvements).toFixed(1) },
        { label: "Bonus", value: p.bonus },
      ]
    : [
        { label: "CS", value: p.clean_sheets },
        { label: "xGC", value: Number(p.expected_goals_conceded).toFixed(1) },
        { label: "Goals", value: p.goals_scored },
        { label: "Bonus", value: p.bonus },
      ];

  return [
    { label: "Pts", value: p.total_points },
    { label: "PPG", value: p.points_per_game },
    { label: "Form", value: p.form },
    { label: "Mins", value: p.minutes },
    ...posRow,
    { label: "FPL £", value: `£${(p.now_cost / 10).toFixed(1)}m` },
    { label: "Sel%", value: `${p.selected_by_percent}%` },
    { label: "ICT", value: Number(p.ict_index).toFixed(1) },
    { label: "FDR", value: p.avg_fdr_next5.toFixed(1) },
  ];
}

function metricTone(label: string): string {
  if (label === "Pts" || label === "PPG" || label === "Form") {
    return "border-[#00e478]/30 bg-[#00e478]/10 text-[#00e478]";
  }
  if (label === "FDR") {
    return "border-[#3b4b3d] bg-[#162638] text-[#f4d47a]";
  }
  return "border-[#1f3042] bg-[#0a1520] text-[#d6e4f9]";
}

export function PlayerStatsBar({ player, className = "" }: Props) {
  const stats = buildStats(player);
  const primary = stats.slice(0, 3);
  const secondary = stats.slice(3);

  return (
    <div className={`rounded-lg border border-[#203345] bg-[#0d1928] p-3 ${className}`}>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {primary.map((s) => (
          <div key={s.label} className={`rounded-md border px-2 py-2 text-center ${metricTone(s.label)}`}>
            <div className="text-[10px] uppercase tracking-[0.08em] leading-none mb-1 opacity-80">
              {s.label}
            </div>
            <div className="text-base font-mono font-bold leading-none">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {secondary.map((s) => (
          <div
            key={s.label}
            className={`rounded-md border px-2 py-1.5 text-center ${metricTone(s.label)}`}
          >
            <div className="text-[9px] uppercase tracking-wide leading-none mb-0.5 opacity-80">
              {s.label}
            </div>
            <div className="text-xs font-mono font-bold leading-none">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
