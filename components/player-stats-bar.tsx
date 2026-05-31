import type { EnrichedPlayer } from "@/lib/fpl-types";

type Props = Readonly<{
  player: EnrichedPlayer;
  className?: string;
  wide?: boolean;
}>;

interface Stat {
  label: string;
  value: string | number;
  tooltip: string;
}

const STAT_TOOLTIPS: Record<string, string> = {
  Pts: "Total FPL points this season",
  PPG: "Points per game this season",
  Saves: "Total saves made this season",
  CS: "Clean sheets this season",
  xGC: "Expected goals conceded (lower = better)",
  Bonus: "Bonus points awarded this season",
  Starts: "Matches started this season",
  FDR: "Average fixture difficulty rating (next 5 games, 1–5)",
  Goals: "Goals scored this season",
  Assists: "Assists this season",
  xGI: "Expected goal involvements (xG + xA)",
  Creat: "FPL creativity score — chance creation",
  xG: "Expected goals (shot quality measure)",
  Threat: "FPL threat score — attacking intent",
};

function buildStats(p: EnrichedPlayer): Stat[] {
  const tip = (label: string) => STAT_TOOLTIPS[label] ?? label;

  if (p.position === "GKP") {
    return [
      { label: "Pts", value: p.total_points, tooltip: tip("Pts") },
      { label: "PPG", value: p.points_per_game, tooltip: tip("PPG") },
      { label: "Saves", value: p.saves, tooltip: tip("Saves") },
      { label: "CS", value: p.clean_sheets, tooltip: tip("CS") },
      {
        label: "xGC",
        value: Number(p.expected_goals_conceded).toFixed(1),
        tooltip: tip("xGC"),
      },
      { label: "Bonus", value: p.bonus, tooltip: tip("Bonus") },
      { label: "Starts", value: p.starts, tooltip: tip("Starts") },
      { label: "FDR", value: p.avg_fdr_next5.toFixed(1), tooltip: tip("FDR") },
    ];
  }

  if (p.position === "DEF") {
    return [
      { label: "Pts", value: p.total_points, tooltip: tip("Pts") },
      { label: "PPG", value: p.points_per_game, tooltip: tip("PPG") },
      { label: "CS", value: p.clean_sheets, tooltip: tip("CS") },
      {
        label: "xGC",
        value: Number(p.expected_goals_conceded).toFixed(1),
        tooltip: tip("xGC"),
      },
      { label: "Goals", value: p.goals_scored, tooltip: tip("Goals") },
      { label: "Bonus", value: p.bonus, tooltip: tip("Bonus") },
      { label: "Starts", value: p.starts, tooltip: tip("Starts") },
      { label: "FDR", value: p.avg_fdr_next5.toFixed(1), tooltip: tip("FDR") },
    ];
  }

  if (p.position === "MID") {
    return [
      { label: "Pts", value: p.total_points, tooltip: tip("Pts") },
      { label: "PPG", value: p.points_per_game, tooltip: tip("PPG") },
      { label: "Goals", value: p.goals_scored, tooltip: tip("Goals") },
      { label: "Assists", value: p.assists, tooltip: tip("Assists") },
      {
        label: "xGI",
        value: Number(p.expected_goal_involvements).toFixed(1),
        tooltip: tip("xGI"),
      },
      {
        label: "Creat",
        value: Number(p.creativity).toFixed(0),
        tooltip: tip("Creat"),
      },
      { label: "Starts", value: p.starts, tooltip: tip("Starts") },
      { label: "FDR", value: p.avg_fdr_next5.toFixed(1), tooltip: tip("FDR") },
    ];
  }

  return [
    { label: "Pts", value: p.total_points, tooltip: tip("Pts") },
    { label: "PPG", value: p.points_per_game, tooltip: tip("PPG") },
    { label: "Goals", value: p.goals_scored, tooltip: tip("Goals") },
    {
      label: "xG",
      value: Number(p.expected_goals).toFixed(1),
      tooltip: tip("xG"),
    },
    { label: "Assists", value: p.assists, tooltip: tip("Assists") },
    {
      label: "Threat",
      value: Number(p.threat).toFixed(0),
      tooltip: tip("Threat"),
    },
    { label: "Starts", value: p.starts, tooltip: tip("Starts") },
    { label: "FDR", value: p.avg_fdr_next5.toFixed(1), tooltip: tip("FDR") },
  ];
}

function metricTone(label: string) {
  if (["Pts", "PPG", "Goals", "Saves"].includes(label)) {
    return {
      chip: "border-[#00e478]/25 bg-[#00e478]/8 text-[#00e478]",
      glow: "shadow-[0_0_12px_rgba(0,228,120,0.15)]",
    };
  }
  if (label === "FDR") {
    return {
      chip: "border-[#f4d47a]/20 bg-[#1a1a08] text-[#f4d47a]",
      glow: "",
    };
  }
  if (label === "Starts") {
    return { chip: "border-[#35516f] bg-[#0d1e2e] text-[#8fd0ff]", glow: "" };
  }
  return { chip: "border-[#1f3042] bg-[#0a1520] text-[#c8dcf0]", glow: "" };
}

/** A single stat chip with hover tooltip */
function StatChip({
  stat,
  size = "sm",
}: {
  stat: Stat;
  size?: "sm" | "md" | "lg";
}) {
  const { chip, glow } = metricTone(stat.label);
  const sizeClass =
    size === "lg"
      ? "px-3 py-4 min-w-[68px] text-2xl"
      : size === "md"
        ? "px-3 py-3 min-w-[76px] text-xl"
        : "px-2 py-2.5 text-sm";
  const labelClass =
    size === "lg"
      ? "text-[10px]"
      : size === "md"
        ? "text-[10px]"
        : "text-[9px]";
  return (
    <div
      className={`relative group rounded-xl border cursor-default text-center transition-all duration-150 hover:brightness-125 ${chip} ${glow} ${sizeClass}`}
    >
      <div
        className={`uppercase tracking-wider leading-none mb-1 opacity-70 ${labelClass}`}
      >
        {stat.label}
      </div>
      <div className="font-mono font-bold leading-none">{stat.value}</div>
      {/* Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[180px] rounded-lg border border-[#2a3f55] bg-[#0d1928] px-2.5 py-1.5 text-[11px] text-[#a8c0da] leading-snug opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl">
        {stat.tooltip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 h-0 w-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-[#2a3f55]" />
      </div>
    </div>
  );
}

export function PlayerStatsBar({
  player,
  className = "",
  wide = false,
}: Props) {
  const stats = buildStats(player);
  // wide (auctioneer): ALL 8 stats in 2-col grid on the right, nothing below
  // narrow (bidder):   Pts+PPG pinned right, 6 position stats in bottom row
  const heroStats = wide ? stats : stats.slice(0, 2);
  const detailStats = wide ? [] : stats.slice(2);

  return (
    <div
      className={`rounded-2xl border border-[#1e3248] bg-[linear-gradient(160deg,#0f2236_0%,#0a1724_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_24px_rgba(0,0,0,0.4)] ${className}`}
    >
      {/* ── Top row ─────────────────────────────────────────────────── */}
      <div
        className={`flex gap-4 ${wide ? "items-stretch min-h-[220px]" : "items-start"}`}
      >
        {/* Player portrait — full body when wide, cropped portrait when narrow */}
        <div
          className={`relative shrink-0 ${wide ? "w-[210px] min-w-[190px] h-full self-stretch" : "w-[120px] h-[148px]"}`}
        >
          <div className="absolute inset-x-0 bottom-0 h-10 rounded-full bg-[#00e478]/10 blur-2xl pointer-events-none" />
          <img
            src={player.image_url}
            alt={player.full_name}
            className={`relative w-full drop-shadow-[0_12px_32px_rgba(0,0,0,0.55)] ${wide ? "h-full object-contain object-bottom" : "h-full object-cover object-top"}`}
          />
        </div>

        {/* Name + club + metadata — flex-1 so it fills space between photo and hero stats */}
        <div className="flex-1 min-w-0 pb-1">
          <div className="text-lg font-bold text-[#f1f6ff] leading-tight">
            {player.full_name}
          </div>
          <div className="text-sm text-[#7a9dba] mt-0.5 font-medium">
            {player.team_name}
          </div>
          <div className="mt-2 text-[11px] text-[#5e7d99] uppercase tracking-[0.07em] space-y-1">
            <div className="font-semibold text-[#8ea4be]">
              {player.position}
            </div>
            <div>{player.minutes} mins</div>
            <div>{player.selected_by_percent}% sel.</div>
            <div>{player.starts} starts</div>
          </div>
          {player.news ? (
            <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-300 leading-snug">
              ⚠ {player.news}
            </div>
          ) : null}
        </div>

        {/* Hero stats — wide: 2-col grid of all 8; narrow: single col of Pts+PPG */}
        <div
          className={`shrink-0 grid gap-2 ${wide ? "grid-cols-2" : "grid-cols-1"}`}
        >
          {heroStats.map((s) => (
            <StatChip key={s.label} stat={s} size={wide ? "md" : "lg"} />
          ))}
        </div>
      </div>

      {/* ── Divider + detail stats — only in narrow mode ──────────── */}
      {!wide && (
        <>
          <div className="my-3 border-t border-[#1a2e42]" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {detailStats.map((s) => (
              <StatChip key={s.label} stat={s} size="sm" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
