"use client";

import { useEffect, useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
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
import type { EnrichedPlayer } from "@/lib/fpl-types";

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  DEF: "bg-green-500/20 text-green-400 border-green-500/30",
  MID: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  FWD: "bg-red-500/20 text-red-400 border-red-500/30",
};

const FDR_COLORS = [
  "",
  "bg-green-700",
  "bg-green-600",
  "bg-yellow-600",
  "bg-orange-600",
  "bg-red-700",
];

function FdrPip({ diff }: Readonly<{ diff: number }>) {
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white ${FDR_COLORS[diff] ?? "bg-gray-600"}`}
    >
      {diff}
    </span>
  );
}

export default function PlayersPage() {
  // TanStack Table returns functions that React Compiler cannot safely memoize.
  // Opting this component out of compilation is the correct escape hatch.
  "use no memo";

  const [players, setPlayers] = useState<EnrichedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<string>("ALL");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "total_points", desc: true },
  ]);
  const [selected, setSelected] = useState<EnrichedPlayer | null>(null);

  useEffect(() => {
    fetch("/api/fpl/bootstrap")
      .then((r) => r.json())
      .then((d) => {
        setPlayers(d.players ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return players.filter((p) => {
      if (posFilter !== "ALL" && p.position !== posFilter) return false;
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
  }, [players, posFilter, search]);

  const columns = useMemo<ColumnDef<EnrichedPlayer>[]>(
    () => [
      {
        id: "name",
        header: "Player",
        accessorFn: (r) => r.web_name,
        cell: ({ row }) => (
          <button
            className="text-left hover:text-[#00e478] transition-colors"
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
        header: "Pos",
        accessorFn: (r) => r.position,
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
        accessorFn: (r) => r.chance_of_playing_next_round,
        cell: ({ row }) => {
          const chance = row.original.chance_of_playing_next_round;
          if (chance === null || chance === 100)
            return <span className="text-green-400 text-xs">✓</span>;
          return <span className="text-orange-400 text-xs">{chance}%</span>;
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6">
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search player or team…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56 bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] placeholder:text-[#849585]"
        />
        <div className="flex gap-1">
          {["ALL", "GKP", "DEF", "MID", "FWD"].map((pos) => (
            <Button
              key={pos}
              size="sm"
              variant={posFilter === pos ? "default" : "outline"}
              className={
                posFilter === pos
                  ? "bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90"
                  : "border-[#3b4b3d] text-[#b9cbb9] hover:text-[#d6e4f9] hover:bg-[#1e2b3b]"
              }
              onClick={() => setPosFilter(pos)}
            >
              {pos}
            </Button>
          ))}
        </div>
        <span className="ml-auto text-xs text-[#849585]">
          {filtered.length} players
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#3b4b3d] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0f1c2c] border-b border-[#3b4b3d]">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-[#849585] uppercase tracking-wider cursor-pointer select-none hover:text-[#d6e4f9]"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {header.column.getIsSorted() === "asc"
                        ? " ↑"
                        : header.column.getIsSorted() === "desc"
                          ? " ↓"
                          : ""}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-16 text-center text-[#849585]"
                  >
                    Loading players…
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`border-b border-[#3b4b3d]/50 hover:bg-[#132030] transition-colors ${i % 2 === 0 ? "bg-[#061423]" : "bg-[#0a1828]"}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2.5">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-sm text-[#849585]">
        <span>
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
            className="border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b]"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b]"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Player detail modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9] max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {selected.web_name}
                </DialogTitle>
                <p className="text-sm text-[#b9cbb9]">
                  {selected.team_name} · {selected.position}
                </p>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <Stat label="Price" value={`£${selected.price.toFixed(1)}m`} />
                <Stat label="Total Points" value={selected.total_points} />
                <Stat label="Form" value={selected.form} highlight />
                <Stat label="ICT Index" value={selected.ict_index} />
                <Stat
                  label="xG"
                  value={parseFloat(selected.expected_goals).toFixed(2)}
                />
                <Stat
                  label="xA"
                  value={parseFloat(selected.expected_assists).toFixed(2)}
                />
                <Stat
                  label="xGI"
                  value={parseFloat(
                    selected.expected_goal_involvements,
                  ).toFixed(2)}
                />
                <Stat label="Avg FDR ×5" value={selected.avg_fdr_next5} />
                <Stat label="Goals" value={selected.goals_scored} />
                <Stat label="Assists" value={selected.assists} />
                <Stat label="Clean Sheets" value={selected.clean_sheets} />
                <Stat label="Minutes" value={selected.minutes} />
              </div>
              {selected.news && (
                <p className="text-xs text-orange-400 bg-orange-950/30 rounded p-2">
                  {selected.news}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: Readonly<{ label: string; value: string | number; highlight?: boolean }>) {
  return (
    <div className="bg-[#132030] rounded p-3">
      <div className="text-[10px] text-[#849585] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={`font-mono font-semibold text-lg ${highlight ? "text-[#00e478]" : "text-[#d6e4f9]"}`}
      >
        {value}
      </div>
    </div>
  );
}
