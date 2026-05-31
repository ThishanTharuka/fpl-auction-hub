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

export function PlayerStatsBar({ player, className = "" }: Props) {
  const stats = buildStats(player);
  return (
    <div className={`grid grid-cols-4 gap-1.5 ${className}`}>
      {stats.map((s) => (
        <div key={s.label} className="bg-[#0a1520] rounded px-2 py-1.5 text-center">
          <div className="text-[9px] text-[#849585] uppercase tracking-wide leading-none mb-0.5">
            {s.label}
          </div>
          <div className="text-xs font-mono font-bold text-[#d6e4f9] leading-none">
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
