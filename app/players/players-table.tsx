"use client";
/* eslint-disable @next/next/no-img-element -- dynamic crests with onError fallback, next/image incompatible */

import { useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";
import type { EnrichedPlayer } from "@/lib/fpl-types";

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  DEF: "bg-green-500/20 text-green-400 border-green-500/30",
  MID: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  FWD: "bg-red-500/20 text-red-400 border-red-500/30",
};

const POSITION_LABELS: Record<string, string> = {
  GKP: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

const POSITION_STAT: Record<string, { key: keyof EnrichedPlayer; label: string }> = {
  GKP: { key: "clean_sheets", label: "CS" },
  DEF: { key: "clean_sheets", label: "CS" },
  MID: { key: "goals_scored", label: "Goals" },
  FWD: { key: "goals_scored", label: "Goals" },
};

const COLUMN_TOOLTIPS: Record<string, string> = {
  price: "Price (£m)",
  total_points: "Total Points this season",
  points_per_game: "Points Per Game — season average",
  selected_by_percent: "Ownership — selected by % of FPL managers",
  status: "Availability / chance of playing next GW",
  form: "Form — average points over last 4 gameweeks",
  ict_index: "ICT Index — combined Influence, Creativity & Threat score",
  influence: "Influence — player's impact on the match result",
  creativity: "Creativity — chance creation and assist potential",
  threat: "Threat — goal scoring threat score",
  xg: "Expected Goals (xG) — season total",
  xa: "Expected Assists (xA) — season total",
  xgi: "Expected Goal Involvements (xG + xA) — season total",
  xgc: "Expected Goals Conceded (xGC) — season total",
  goals_scored: "Goals Scored this season",
  assists: "Assists this season",
  clean_sheets: "Clean Sheets this season",
  minutes: "Minutes Played this season",
  bonus: "Bonus Points this season",
  bps: "Bonus Points System score — raw BPS this season",
  yellow_cards: "Yellow Cards this season",
  red_cards: "Red Cards this season",
  transfers_in_event: "Transfers In this Gameweek",
  transfers_out_event: "Transfers Out this Gameweek",
  avg_fdr_next5:
    "Average Fixture Difficulty Rating over next 5 Gameweeks (1=easy, 5=hard)",
};

const FDR_COLORS = [
  "",
  "bg-green-700",
  "bg-green-600",
  "bg-yellow-600",
  "bg-orange-600",
  "bg-red-700",
];

const COLUMN_GROUPS = [
  {
    group: "Core",
    columns: [
      { id: "price", label: "Price" },
      { id: "total_points", label: "Pts" },
      { id: "points_per_game", label: "PPG" },
      { id: "selected_by_percent", label: "Own %" },
      { id: "status", label: "Status" },
    ],
  },
  {
    group: "Form & Index",
    columns: [
      { id: "form", label: "Form" },
      { id: "ict_index", label: "ICT" },
      { id: "influence", label: "Influence" },
      { id: "creativity", label: "Creativity" },
      { id: "threat", label: "Threat" },
    ],
  },
  {
    group: "Expected Stats",
    columns: [
      { id: "xg", label: "xG" },
      { id: "xa", label: "xA" },
      { id: "xgi", label: "xGI" },
      { id: "xgc", label: "xGC" },
    ],
  },
  {
    group: "Season Stats",
    columns: [
      { id: "goals_scored", label: "Goals" },
      { id: "assists", label: "Assists" },
      { id: "clean_sheets", label: "CS" },
      { id: "minutes", label: "Mins" },
      { id: "bonus", label: "Bonus" },
      { id: "bps", label: "BPS" },
      { id: "yellow_cards", label: "YC" },
      { id: "red_cards", label: "RC" },
    ],
  },
  {
    group: "Transfers",
    columns: [
      { id: "transfers_in_event", label: "GW In" },
      { id: "transfers_out_event", label: "GW Out" },
    ],
  },
  {
    group: "Fixtures",
    columns: [{ id: "avg_fdr_next5", label: "FDR ×5" }],
  },
];

const DEFAULT_VISIBLE: VisibilityState = {
  price: true,
  total_points: true,
  points_per_game: false,
  selected_by_percent: false,
  status: true,
  form: true,
  ict_index: true,
  influence: false,
  creativity: false,
  threat: false,
  xg: false,
  xa: false,
  xgi: true,
  xgc: false,
  goals_scored: false,
  assists: false,
  clean_sheets: false,
  minutes: false,
  bonus: false,
  bps: false,
  yellow_cards: false,
  red_cards: false,
  transfers_in_event: false,
  transfers_out_event: false,
  avg_fdr_next5: true,
};

function InfoTip({ text }: Readonly<{ text: string }>) {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  return (
    <>
      <span
        ref={ref}
        className="inline-flex items-center"
        onMouseEnter={() => {
          const r = ref.current?.getBoundingClientRect();
          if (r) setCoords({ x: r.left + r.width / 2, y: r.top });
        }}
        onMouseLeave={() => setCoords(null)}
      >
        <Info className="w-3 h-3 text-[#849585] hover:text-[#b9cbb9] cursor-default shrink-0" />
      </span>
      {coords &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: coords.x,
              top: coords.y - 8,
              transform: "translate(-50%, -100%)",
              zIndex: 9999,
            }}
            className="w-48 rounded bg-[#1e2b3b] border border-[#3b4b3d] px-2 py-1.5 text-[11px] text-[#d6e4f9] whitespace-normal text-center shadow-lg pointer-events-none"
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}

function FdrPip({ diff }: Readonly<{ diff: number }>) {
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white ${FDR_COLORS[diff] ?? "bg-gray-600"}`}
    >
      {diff}
    </span>
  );
}

function getStatusInfo(status: string, chance: number | null) {
  switch (status) {
    case "a":
      return { label: "Available", dot: "bg-green-400", text: "text-green-400", ring: "ring-green-400/30" };
    case "d":
      return { label: `Doubt${chance !== null ? ` ${chance}%` : ""}`, dot: "bg-orange-400", text: "text-orange-400", ring: "ring-orange-400/30" };
    case "i":
      return { label: "Injured", dot: "bg-red-400", text: "text-red-400", ring: "ring-red-400/30" };
    case "s":
      return { label: "Suspended", dot: "bg-red-400", text: "text-red-400", ring: "ring-red-400/30" };
    case "n":
      return { label: "Intl", dot: "bg-[#849585]", text: "text-[#849585]", ring: "ring-[#849585]/30" };
    case "u":
      return { label: "Unavailable", dot: "bg-red-400", text: "text-red-400", ring: "ring-red-400/30" };
    default:
      return { label: "Available", dot: "bg-green-400", text: "text-green-400", ring: "ring-green-400/30" };
  }
}

function StatusChip({
  status,
  chance,
}: {
  status: string;
  chance: number | null;
}) {
  const chip = (label: string, color: string) => (
    <span
      className={`inline-flex items-center justify-center rounded-full border w-20 sm:w-24 py-0.5 text-[10px] sm:text-[11px] font-medium ${color}`}
    >
      {label}
    </span>
  );
  if (status === "a")
    return chip("Available", "bg-green-500/15 border-green-500/30 text-green-400");
  if (status === "d")
    return chip(
      `Doubt${chance !== null ? ` ${chance}%` : ""}`,
      "bg-orange-500/15 border-orange-500/30 text-orange-400",
    );
  if (status === "i")
    return chip("Injured", "bg-red-500/15 border-red-500/30 text-red-400");
  if (status === "s")
    return chip("Suspended", "bg-red-500/15 border-red-500/30 text-red-400");
  if (status === "n")
    return chip("Intl", "bg-[#849585]/15 border-[#849585]/30 text-[#849585]");
  if (status === "u")
    return chip("Out", "bg-red-500/15 border-red-500/30 text-red-400");
  return chip(
    "Available",
    "bg-green-500/15 border-green-500/30 text-green-400",
  );
}

function ColumnPickerContent({
  colVisibility,
  setColVisibility,
}: {
  colVisibility: VisibilityState;
  setColVisibility: (
    v: VisibilityState | ((prev: VisibilityState) => VisibilityState),
  ) => void;
}) {
  return (
    <div className="bg-[#0f1c2c] border border-[#3b4b3d] rounded-lg shadow-xl p-4 overflow-y-auto w-72 max-h-[min(90vh,680px)]">
      <div className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-3">
        Toggle Columns
      </div>
      {COLUMN_GROUPS.map(({ group, columns: cols }) => (
        <div key={group} className="mb-4">
          <div className="text-[10px] text-[#849585] uppercase tracking-wider mb-1.5 border-b border-[#3b4b3d] pb-1">
            {group}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {cols.map(({ id, label }) => (
              <label
                key={id}
                className="flex items-center gap-2 cursor-pointer text-xs text-[#d6e4f9] hover:text-[#00e478] py-0.5"
              >
                <input
                  type="checkbox"
                  className="accent-[#00e478]"
                  checked={colVisibility[id] !== false}
                  onChange={(e) =>
                    setColVisibility((v) => ({
                      ...v,
                      [id]: e.target.checked,
                    }))
                  }
                />
                {label}
                {COLUMN_TOOLTIPS[id] && <InfoTip text={COLUMN_TOOLTIPS[id]!} />}
              </label>
            ))}
          </div>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        className="w-full mt-1 border-[#3b4b3d] text-[#849585] text-xs hover:bg-[#1e2b3b]"
        onClick={() => setColVisibility(DEFAULT_VISIBLE)}
      >
        Reset to default
      </Button>
    </div>
  );
}

function PlayerCard({
  player,
  onSelect,
}: {
  player: EnrichedPlayer;
  onSelect: () => void;
}) {
  const statInfo = POSITION_STAT[player.position]!;
  const posStatValue = String(player[statInfo.key] ?? 0);
  const statusInfo = getStatusInfo(player.status, player.chance_of_playing_next_round);

  return (
    <button
      className="w-full text-left bg-[#0a1828] rounded-lg border border-[#3b4b3d]/50 px-3.5 py-3 hover:bg-[#132030] active:bg-[#132030] transition-colors cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="min-w-0 flex-1 truncate">
          <span className="font-medium text-[#d6e4f9] text-sm">{player.web_name}</span>
          <span className="text-xs text-[#b9cbb9] ml-1">({player.team_short})</span>
        </div>
        <Badge
          variant="outline"
          className={`text-[9px] font-bold w-[74px] justify-center shrink-0 ${POSITION_COLORS[player.position]}`}
        >
          {POSITION_LABELS[player.position] ?? player.position}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center text-xs min-w-0">
          <span className="w-[52px] shrink-0 flex justify-between font-mono text-[#bbc6e2]">
            <span>{statInfo.label}</span>
            <span>{posStatValue}</span>
          </span>
          <span className="text-[#3b4b3d] w-[10px] text-center shrink-0">·</span>
          <span className="font-mono font-semibold text-[#d6e4f9] w-[36px] text-right shrink-0">
            {player.total_points}
          </span>
          <span className="text-[#3b4b3d] w-[10px] text-center shrink-0">·</span>
          <span className="font-mono text-[#00e478] w-[28px] text-right shrink-0">
            {parseFloat(player.form).toFixed(1)}
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] w-[74px] justify-end shrink-0">
          <span className={`inline-block w-2 h-2 rounded-full ${statusInfo.dot}`} />
          <span className={statusInfo.text}>{statusInfo.label}</span>
        </span>
      </div>
    </button>
  );
}

function Stat({
  label,
  value,
  highlight,
}: Readonly<{ label: string; value: string | number; highlight?: boolean }>) {
  return (
    <div className="bg-[#132030] rounded p-2 sm:p-3">
      <div className="text-[9px] sm:text-[10px] text-[#849585] uppercase tracking-wider mb-0.5 sm:mb-1">
        {label}
      </div>
      <div
        className={`font-mono font-semibold text-sm sm:text-lg ${highlight ? "text-[#00e478]" : "text-[#d6e4f9]"}`}
      >
        {value}
      </div>
    </div>
  );
}

export function PlayersTable({ players }: Readonly<{ players: EnrichedPlayer[] }>) {
  "use no memo";

  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<string>("ALL");
  const [availFilter, setAvailFilter] = useState<"all" | "available">("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "total_points", desc: true },
  ]);
  const [selected, setSelected] = useState<EnrichedPlayer | null>(null);
  const lastSelected = useRef(selected);
  if (selected) lastSelected.current = selected;
  const displayPlayer = selected ?? lastSelected.current;
  const [dialogImgLoaded, setDialogImgLoaded] = useState(false);
  const [dialogImgError, setDialogImgError] = useState(false);
  const [dialogCrestLoaded, setDialogCrestLoaded] = useState(false);
  const [dialogCrestError, setDialogCrestError] = useState(false);
  const [colVisibility, setColVisibility] =
    useState<VisibilityState>(DEFAULT_VISIBLE);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const minP = minPrice ? parseFloat(minPrice) : null;
    const maxP = maxPrice ? parseFloat(maxPrice) : null;
    return players.filter((p) => {
      if (posFilter !== "ALL" && p.position !== posFilter) return false;
      if (
        availFilter === "available" &&
        p.chance_of_playing_next_round !== null &&
        p.chance_of_playing_next_round < 75
      )
        return false;
      if (minP !== null && p.price < minP) return false;
      if (maxP !== null && p.price > maxP) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.web_name.toLowerCase().includes(q) &&
          !p.team_short.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [players, posFilter, availFilter, search, minPrice, maxPrice]);

  const columns = useMemo<ColumnDef<EnrichedPlayer>[]>(
    () => [
      {
        id: "name",
        header: "Player",
        accessorFn: (r) => r.web_name,
        enableHiding: false,
        cell: ({ row }) => (
          <button
            className="text-left hover:text-[#00e478] transition-colors underline-offset-2 hover:underline cursor-pointer"
            onClick={() => setSelected(row.original)}
          >
            <div className="font-medium text-[#d6e4f9]">
              {row.original.web_name}
            </div>
            <div className="text-xs text-[#b9cbb9]">
              {row.original.team_short}
            </div>
          </button>
        ),
      },
      {
        id: "position",
        header: "Position",
        accessorFn: (r) => r.position,
        enableHiding: false,
        cell: ({ getValue }) => (
          <Badge
            variant="outline"
            className={`text-[10px] font-bold ${POSITION_COLORS[getValue() as string]}`}
          >
            {getValue() as string}
          </Badge>
        ),
      },
      {
        id: "price",
        header: "Price",
        accessorFn: (r) => r.price,
        cell: ({ getValue }) => (
          <span className="font-mono text-[#b9cbb9]">
            £{(getValue() as number).toFixed(1)}m
          </span>
        ),
      },
      {
        id: "total_points",
        header: "Pts",
        accessorFn: (r) => r.total_points,
        cell: ({ getValue }) => (
          <span className="font-mono font-semibold">
            {getValue() as number}
          </span>
        ),
      },
      {
        id: "points_per_game",
        header: "PPG",
        accessorFn: (r) => parseFloat(r.points_per_game),
        cell: ({ getValue }) => (
          <span className="font-mono">{(getValue() as number).toFixed(1)}</span>
        ),
      },
      {
        id: "selected_by_percent",
        header: "Own %",
        accessorFn: (r) => parseFloat(r.selected_by_percent),
        cell: ({ getValue }) => (
          <span className="font-mono text-[#b9cbb9]">
            {(getValue() as number).toFixed(1)}%
          </span>
        ),
      },
      {
        id: "form",
        header: "Form",
        accessorFn: (r) => parseFloat(r.form),
        cell: ({ getValue }) => (
          <span className="font-mono text-[#00e478]">
            {(getValue() as number).toFixed(1)}
          </span>
        ),
      },
      {
        id: "ict_index",
        header: "ICT",
        accessorFn: (r) => parseFloat(r.ict_index),
        cell: ({ getValue }) => (
          <span className="font-mono">{(getValue() as number).toFixed(1)}</span>
        ),
      },
      {
        id: "influence",
        header: "Inf",
        accessorFn: (r) => parseFloat(r.influence),
        cell: ({ getValue }) => (
          <span className="font-mono">{(getValue() as number).toFixed(1)}</span>
        ),
      },
      {
        id: "creativity",
        header: "Cre",
        accessorFn: (r) => parseFloat(r.creativity),
        cell: ({ getValue }) => (
          <span className="font-mono">{(getValue() as number).toFixed(1)}</span>
        ),
      },
      {
        id: "threat",
        header: "Thr",
        accessorFn: (r) => parseFloat(r.threat),
        cell: ({ getValue }) => (
          <span className="font-mono">{(getValue() as number).toFixed(1)}</span>
        ),
      },
      {
        id: "xg",
        header: "xG",
        accessorFn: (r) => parseFloat(r.expected_goals),
        cell: ({ getValue }) => (
          <span className="font-mono text-[#bbc6e2]">
            {(getValue() as number).toFixed(2)}
          </span>
        ),
      },
      {
        id: "xa",
        header: "xA",
        accessorFn: (r) => parseFloat(r.expected_assists),
        cell: ({ getValue }) => (
          <span className="font-mono text-[#bbc6e2]">
            {(getValue() as number).toFixed(2)}
          </span>
        ),
      },
      {
        id: "xgi",
        header: "xGI",
        accessorFn: (r) => parseFloat(r.expected_goal_involvements),
        cell: ({ getValue }) => (
          <span className="font-mono text-[#bbc6e2]">
            {(getValue() as number).toFixed(2)}
          </span>
        ),
      },
      {
        id: "xgc",
        header: "xGC",
        accessorFn: (r) => parseFloat(r.expected_goals_conceded),
        cell: ({ getValue }) => (
          <span className="font-mono text-[#bbc6e2]">
            {(getValue() as number).toFixed(2)}
          </span>
        ),
      },
      {
        id: "goals_scored",
        header: "G",
        accessorFn: (r) => r.goals_scored,
        cell: ({ getValue }) => (
          <span className="font-mono">{getValue() as number}</span>
        ),
      },
      {
        id: "assists",
        header: "A",
        accessorFn: (r) => r.assists,
        cell: ({ getValue }) => (
          <span className="font-mono">{getValue() as number}</span>
        ),
      },
      {
        id: "clean_sheets",
        header: "CS",
        accessorFn: (r) => r.clean_sheets,
        cell: ({ getValue }) => (
          <span className="font-mono">{getValue() as number}</span>
        ),
      },
      {
        id: "minutes",
        header: "Mins",
        accessorFn: (r) => r.minutes,
        cell: ({ getValue }) => (
          <span className="font-mono text-[#b9cbb9]">
            {getValue() as number}
          </span>
        ),
      },
      {
        id: "bonus",
        header: "Bon",
        accessorFn: (r) => r.bonus,
        cell: ({ getValue }) => (
          <span className="font-mono">{getValue() as number}</span>
        ),
      },
      {
        id: "bps",
        header: "BPS",
        accessorFn: (r) => r.bps,
        cell: ({ getValue }) => (
          <span className="font-mono">{getValue() as number}</span>
        ),
      },
      {
        id: "yellow_cards",
        header: "YC",
        accessorFn: (r) => r.yellow_cards,
        cell: ({ getValue }) => (
          <span className="font-mono text-yellow-400">
            {getValue() as number}
          </span>
        ),
      },
      {
        id: "red_cards",
        header: "RC",
        accessorFn: (r) => r.red_cards,
        cell: ({ getValue }) => (
          <span className="font-mono text-red-400">{getValue() as number}</span>
        ),
      },
      {
        id: "transfers_in_event",
        header: "GW In",
        accessorFn: (r) => r.transfers_in_event,
        cell: ({ getValue }) => (
          <span className="font-mono text-green-400">
            +{(getValue() as number).toLocaleString()}
          </span>
        ),
      },
      {
        id: "transfers_out_event",
        header: "GW Out",
        accessorFn: (r) => r.transfers_out_event,
        cell: ({ getValue }) => (
          <span className="font-mono text-red-400">
            -{(getValue() as number).toLocaleString()}
          </span>
        ),
      },
      {
        id: "avg_fdr_next5",
        header: "FDR ×5",
        accessorFn: (r) => r.avg_fdr_next5,
        cell: ({ getValue }) => {
          const v = getValue() as number;
          const rounded = Math.round(v);
          return <FdrPip diff={Math.min(5, Math.max(1, rounded))} />;
        },
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (r) => r.status,
        cell: ({ row }) => {
          return (
            <StatusChip
              status={row.original.status}
              chance={row.original.chance_of_playing_next_round}
            />
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnVisibility: colVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6">
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-start sm:items-center gap-2 sm:gap-3">
        <Input
          placeholder="Search player or team…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-56 bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] placeholder:text-[#849585]"
        />

        <div className="flex gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {["ALL", "GKP", "DEF", "MID", "FWD"].map((pos) => (
            <Button
              key={pos}
              size="sm"
              variant={posFilter === pos ? "default" : "outline"}
              className={
                posFilter === pos
                  ? "bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 shrink-0"
                  : "border-[#3b4b3d] text-[#b9cbb9] hover:text-[#d6e4f9] hover:bg-[#1e2b3b] shrink-0"
              }
              onClick={() => setPosFilter(pos)}
            >
              {pos}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            size="sm"
            variant={availFilter === "available" ? "default" : "outline"}
            className={
              availFilter === "available"
                ? "bg-green-500 text-black border-green-500 hover:bg-green-600 hover:border-green-600"
                : "border-[#3b4b3d] text-[#b9cbb9] hover:text-white hover:bg-green-900/40 hover:border-green-700"
            }
            onClick={() =>
              setAvailFilter((v) => (v === "all" ? "available" : "all"))
            }
          >
            <span className="hidden sm:inline">Available only</span>
            <span className="sm:hidden">Available only</span>
          </Button>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#849585]">£</span>
            <Input
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-14 sm:w-16 h-8 bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] placeholder:text-[#849585] text-xs"
            />
            <span className="text-xs text-[#849585]">–</span>
            <Input
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-14 sm:w-16 h-8 bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] placeholder:text-[#849585] text-xs"
            />
            <span className="text-xs text-[#849585]">m</span>
          </div>
        </div>

        <div
          ref={pickerRef}
          className="relative hidden sm:flex items-center gap-3 ml-auto"
        >
          <span className="text-xs text-[#849585] min-w-[7ch] inline-block text-right">
            {filtered.length} players
          </span>
          <Button
            size="sm"
            variant="outline"
            className="border-[#3b4b3d] text-[#b9cbb9] hover:text-[#d6e4f9] hover:bg-[#1e2b3b]"
            onClick={() => setPickerOpen((o) => !o)}
          >
            Columns ▾
          </Button>
          {pickerOpen && (
            <div className="absolute right-0 top-full mt-1 z-50">
              <ColumnPickerContent
                colVisibility={colVisibility}
                setColVisibility={setColVisibility}
              />
            </div>
          )}
        </div>
      </div>

      <div className="sm:hidden text-xs text-[#849585] mb-2">
        {filtered.length} players
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border border-[#3b4b3d] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-[#0f1c2c] border-b border-[#3b4b3d]">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-[#849585] uppercase tracking-wider cursor-pointer select-none hover:text-[#d6e4f9] whitespace-nowrap"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() === "asc"
                          ? " ↑"
                          : header.column.getIsSorted() === "desc"
                            ? " ↓"
                            : ""}
                        {header.column.id in COLUMN_TOOLTIPS && (
                          <InfoTip text={COLUMN_TOOLTIPS[header.column.id]!} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-[#3b4b3d]/50 hover:bg-[#132030] transition-colors ${i % 2 === 0 ? "bg-[#061423]" : "bg-[#0a1828]"}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-2.5 whitespace-nowrap"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-[#849585] text-sm">
            No players match your filters
          </div>
        ) : (
          table
            .getRowModel()
            .rows.map((row) => (
              <PlayerCard
                key={row.id}
                player={row.original}
                onSelect={() => setSelected(row.original)}
              />
            ))
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-[#849585]">
        <span className="text-xs sm:text-sm">
          Showing {table.getState().pagination.pageIndex * 25 + 1}–
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * 25,
            filtered.length,
          )}{" "}
          of {filtered.length}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b] text-xs sm:text-sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b] text-xs sm:text-sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Player detail modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9] w-[calc(100%-2rem)] max-w-3xl mx-auto">
          {displayPlayer && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-10 sm:h-14 sm:w-12 shrink-0">
                    {!dialogImgLoaded && !dialogImgError && (
                      <div className="absolute inset-0 rounded bg-[#0a1724] animate-pulse" />
                    )}
                    {dialogImgError ? (
                      <img
                        src="/player-fallback.png"
                        alt={displayPlayer.web_name}
                        width={1024}
                        height={1024}
                        className="h-full w-full rounded object-cover bg-[#132030]"
                      />
                    ) : (
                      <img
                        src={displayPlayer.image_url}
                        alt={displayPlayer.web_name}
                        width={110}
                        height={140}
                        className={`h-full w-full rounded object-cover bg-[#132030] ${dialogImgLoaded ? "" : "opacity-0 absolute inset-0"}`}
                        loading="lazy"
                        onLoad={() => { setDialogImgLoaded(true); setDialogImgError(false); }}
                        onError={() => { setDialogImgLoaded(false); setDialogImgError(true); }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-lg sm:text-xl font-bold truncate">
                      {displayPlayer.web_name}
                    </DialogTitle>
                    <p className="text-xs sm:text-sm text-[#b9cbb9]">
                      {POSITION_LABELS[displayPlayer.position] ??
                        displayPlayer.position}
                      {" · "}
                      {displayPlayer.team_name}
                      {" · "}
                      <span className="text-[#00d166]">
                        £{displayPlayer.price.toFixed(1)}m
                      </span>
                    </p>
                  </div>
                  {displayPlayer.team_crest_url &&
                    (dialogCrestError ? (
                      <div className="h-6 w-6 sm:h-8 sm:w-8 rounded bg-[#1e3248] flex items-center justify-center mr-4 sm:mr-8 shrink-0">
                        <span className="text-[10px] sm:text-xs font-bold text-[#5e7d99]">
                          {displayPlayer.team_short?.charAt(0) ?? "?"}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={displayPlayer.team_crest_url}
                        alt={displayPlayer.team_name}
                        className={`h-6 w-6 sm:h-8 sm:w-8 object-contain mr-4 sm:mr-8 shrink-0 ${dialogCrestLoaded ? "" : "opacity-0 absolute"}`}
                        loading="lazy"
                        onLoad={() => { setDialogCrestLoaded(true); setDialogCrestError(false); }}
                        onError={() => { setDialogCrestLoaded(true); setDialogCrestError(true); }}
                      />
                    ))}
                  {!dialogCrestLoaded &&
                    !dialogCrestError &&
                    displayPlayer.team_crest_url && (
                      <div className="h-6 w-6 sm:h-8 sm:w-8 rounded bg-[#0a1724] animate-pulse mr-4 sm:mr-8 shrink-0" />
                    )}
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-4">
                <Stat
                  label="Price"
                  value={`£${displayPlayer.price.toFixed(1)}m`}
                />
                <Stat
                  label="Total Points"
                  value={displayPlayer.total_points}
                />
                <Stat label="PPG" value={displayPlayer.points_per_game} />
                <Stat label="Form" value={displayPlayer.form} highlight />
                <Stat label="ICT Index" value={displayPlayer.ict_index} />
                <Stat
                  label="xGI"
                  value={parseFloat(displayPlayer.expected_goal_involvements).toFixed(2)}
                />
                <Stat label="Goals" value={displayPlayer.goals_scored} />
                <Stat label="Assists" value={displayPlayer.assists} />
                <Stat
                  label="Clean Sheets"
                  value={displayPlayer.clean_sheets}
                />
                <Stat label="Minutes" value={displayPlayer.minutes} />
                <Stat label="Bonus" value={displayPlayer.bonus} />
                <Stat label="Starts" value={displayPlayer.starts} />
                <Stat
                  label="Influence"
                  value={parseFloat(displayPlayer.influence).toFixed(1)}
                />
                <Stat
                  label="Creativity"
                  value={parseFloat(displayPlayer.creativity).toFixed(1)}
                />
                <Stat
                  label="Threat"
                  value={parseFloat(displayPlayer.threat).toFixed(1)}
                />
                <Stat
                  label="xG"
                  value={parseFloat(displayPlayer.expected_goals).toFixed(2)}
                />
                <Stat
                  label="xA"
                  value={parseFloat(displayPlayer.expected_assists).toFixed(2)}
                />
                <Stat
                  label="xGC"
                  value={parseFloat(displayPlayer.expected_goals_conceded).toFixed(2)}
                />
                <Stat label="BPS" value={displayPlayer.bps} />
                <Stat label="Avg FDR ×5" value={displayPlayer.avg_fdr_next5} />
              </div>

              {displayPlayer.news && (
                <p className="text-xs text-orange-400 bg-orange-950/30 rounded p-2 mb-2">
                  {displayPlayer.news}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
