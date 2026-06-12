"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useGoogleSheets } from "@/lib/google-sheets-context";
import type { EnrichedPlayer } from "@/lib/fpl-types";
import { XIcon, ArrowUpRightIcon, FileDown } from "lucide-react";

interface ColumnExtractor {
  header: string;
  extract: (p: EnrichedPlayer) => string | number;
}

const COLUMN_EXTRACTORS: Record<string, ColumnExtractor> = {
  name: { header: "Player", extract: (p) => p.web_name },
  full_name: { header: "Full Name", extract: (p) => p.full_name },
  team_name: { header: "Team", extract: (p) => p.team_name },
  position: { header: "Position", extract: (p) => p.position },
  price: { header: "Price (£m)", extract: (p) => p.price },
  total_points: { header: "Total Pts", extract: (p) => p.total_points },
  points_per_game: {
    header: "PPG",
    extract: (p) => parseFloat(p.points_per_game),
  },
  selected_by_percent: {
    header: "Own %",
    extract: (p) => parseFloat(p.selected_by_percent),
  },
  form: { header: "Form", extract: (p) => parseFloat(p.form) },
  ict_index: { header: "ICT", extract: (p) => parseFloat(p.ict_index) },
  influence: { header: "Influence", extract: (p) => parseFloat(p.influence) },
  creativity: {
    header: "Creativity",
    extract: (p) => parseFloat(p.creativity),
  },
  threat: { header: "Threat", extract: (p) => parseFloat(p.threat) },
  xg: { header: "xG", extract: (p) => parseFloat(p.expected_goals) },
  xa: { header: "xA", extract: (p) => parseFloat(p.expected_assists) },
  xgi: {
    header: "xGI",
    extract: (p) => parseFloat(p.expected_goal_involvements),
  },
  xgc: {
    header: "xGC",
    extract: (p) => parseFloat(p.expected_goals_conceded),
  },
  goals_scored: { header: "Goals", extract: (p) => p.goals_scored },
  assists: { header: "Assists", extract: (p) => p.assists },
  clean_sheets: { header: "CS", extract: (p) => p.clean_sheets },
  minutes: { header: "Minutes", extract: (p) => p.minutes },
  bonus: { header: "Bonus", extract: (p) => p.bonus },
  bps: { header: "BPS", extract: (p) => p.bps },
  yellow_cards: { header: "YC", extract: (p) => p.yellow_cards },
  red_cards: { header: "RC", extract: (p) => p.red_cards },
  transfers_in_event: {
    header: "GW In",
    extract: (p) => p.transfers_in_event,
  },
  transfers_out_event: {
    header: "GW Out",
    extract: (p) => p.transfers_out_event,
  },
  avg_fdr_next5: {
    header: "FDR x5",
    extract: (p) => p.avg_fdr_next5,
  },
  status: { header: "Status", extract: (p) => p.status },
};

const EXPORT_FIELD_GROUPS = [
  {
    group: "Player Info",
    fields: ["name", "full_name", "team_name", "position"],
  },
  {
    group: "Pricing & Ownership",
    fields: ["price", "selected_by_percent"],
  },
  {
    group: "Scoring",
    fields: ["total_points", "points_per_game", "form", "bonus", "bps"],
  },
  {
    group: "ICT Index",
    fields: ["ict_index", "influence", "creativity", "threat"],
  },
  {
    group: "Expected Stats",
    fields: ["xg", "xa", "xgi", "xgc"],
  },
  {
    group: "Season Stats",
    fields: [
      "goals_scored",
      "assists",
      "clean_sheets",
      "minutes",
      "yellow_cards",
      "red_cards",
    ],
  },
  {
    group: "Transfers",
    fields: ["transfers_in_event", "transfers_out_event"],
  },
  {
    group: "Other",
    fields: ["avg_fdr_next5", "status"],
  },
];

const ALL_FIELD_IDS = Object.keys(COLUMN_EXTRACTORS);

const PLAYER_INFO_IDS = EXPORT_FIELD_GROUPS.find(
  (g) => g.group === "Player Info",
)!.fields;

const FILTER_LABELS: Record<string, string> = {
  ALL: "All",
  GKP: "Goalkeepers",
  DEF: "Defenders",
  MID: "Midfielders",
  FWD: "Forwards",
};

interface ExportSheetsButtonProps {
  players: EnrichedPlayer[];
  colVisibility: Record<string, boolean | undefined>;
  posFilter: string;
  direction?: "top" | "right" | "bottom" | "left";
}

function FieldPicker({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="overflow-y-auto max-h-none">
      <div className="flex flex-col gap-y-3">
        {EXPORT_FIELD_GROUPS.map(({ group, fields }) => (
          <div key={group}>
            <div className="text-[10px] text-[#849585] uppercase tracking-wider mb-1.5 border-b border-[#3b4b3d] pb-1">
              {group}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {fields.map((id) => {
                const col = COLUMN_EXTRACTORS[id]!;
                return (
                  <label
                    key={id}
                    className="flex items-center gap-2 cursor-pointer text-xs text-[#d6e4f9] hover:text-[#00e478] py-0.5"
                  >
                    <input
                      type="checkbox"
                      className="accent-[#00e478]"
                      checked={selected.has(id)}
                      onChange={() => onToggle(id)}
                    />
                    {col.header}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildExportData(
  fields: Set<string>,
  players: EnrichedPlayer[],
) {
  const visible = ALL_FIELD_IDS.filter((id) => fields.has(id));
  const headers = visible.map((id) => COLUMN_EXTRACTORS[id]!.header);
  const rows = players.map((p) =>
    visible.map((id) => COLUMN_EXTRACTORS[id]!.extract(p)),
  );
  return { headers, rows };
}

export function ExportSheetsButton({
  players,
  posFilter,
  direction = "right",
}: Readonly<ExportSheetsButtonProps>) {
  const { status, error, sheetUrl, exportToSheet, reset } = useGoogleSheets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(PLAYER_INFO_IDS),
  );
  const [step, setStep] = useState<"fields" | "choice">("fields");

  const toggleField = useCallback((id: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isExporting = status === "connecting" || status === "exporting";
  const canClose = !isExporting;

  useEffect(() => {
    if (status === "error" && error) {
      toast.error(error, { id: "export-google-sheets" });
    }
  }, [status, error]);

  const handleExport = useCallback(() => {
    if (selectedFields.size === 0) return;
    setStep("choice");
  }, [selectedFields]);

  const handleCsvExport = useCallback(() => {
    const { headers, rows } = buildExportData(selectedFields, players);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fpl-players.csv";
    a.click();
    URL.revokeObjectURL(url);
    setDrawerOpen(false);
    setStep("fields");
  }, [selectedFields, players]);

  const handleSheetsExport = useCallback(async () => {
    const { headers, rows } = buildExportData(selectedFields, players);
    await exportToSheet(headers, rows);
    setDrawerOpen(false);
    setStep("fields");
  }, [selectedFields, players, exportToSheet]);

  const loadingPhase =
    status === "connecting"
      ? "Authorizing with Google"
      : status === "exporting"
        ? "Creating spreadsheet..."
        : null;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (canClose) {
        setDrawerOpen(open);
        if (!open) {
          setStep("fields");
        }
      }
    },
    [canClose],
  );

  const handleClick = useCallback(() => {
    if (status === "done" && sheetUrl) {
      window.open(sheetUrl, "_blank", "noopener,noreferrer");
      reset();
      return;
    }
    if (status === "error") {
      reset();
      return;
    }
    setDrawerOpen(true);
  }, [status, sheetUrl, reset]);

  let label: string;
  let variant: "default" | "outline" | "destructive";
  let extraClass = "";

  switch (status) {
    case "idle":
    case "ready":
      label = "\u2191 Export to Sheets";
      variant = "outline";
      break;
    case "connecting":
      label = "Authorizing...";
      variant = "outline";
      break;
    case "exporting":
      label = "Exporting...";
      variant = "outline";
      break;
    case "done":
      label = "Open in Sheets";
      variant = "default";
      extraClass =
        "bg-green-700 text-white border-green-600 hover:bg-green-600";
      break;
    case "error":
      label = "Retry";
      variant = "destructive";
      break;
  }

  return (
    <>
      <span className="relative inline-flex">
        <Button
          size="sm"
          variant={variant}
          disabled={isExporting}
          onClick={handleClick}
          title={
            status === "error" && error
              ? error
              : status === "done"
                ? "Open the spreadsheet in a new tab"
                : "Export player data"
          }
          className={
            variant === "outline" && !isExporting
              ? "border-[#3b4b3d] text-[#b9cbb9] hover:text-[#d6e4f9] hover:bg-[#1e2b3b]"
              : extraClass
          }
        >
          {isExporting ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
              {label}
            </span>
          ) : status === "done" ? (
            <span className="flex items-center gap-1.5">
              {label}
              <ArrowUpRightIcon className="w-3.5 h-3.5" />
            </span>
          ) : (
            label
          )}
        </Button>
      </span>

      <Drawer
        direction={direction}
        open={drawerOpen}
        onOpenChange={handleOpenChange}
      >
        <DrawerContent
          className={
            `bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9] ` +
            (direction !== "bottom"
              ? "w-[480px] max-w-[calc(100vw-2rem)]"
              : "data-[vaul-drawer-direction=bottom]:max-h-[85vh]")
          }
        >
          {step === "fields" ? (
            <>
              <DrawerHeader className="flex flex-row items-center justify-between p-5 pb-0">
                <DrawerTitle className="text-base font-semibold text-[#d6e4f9]">
                  Select fields to export
                </DrawerTitle>
                <DrawerClose asChild>
                  <button
                    disabled={!canClose}
                    className="text-[#849585] hover:text-[#d6e4f9] transition-colors cursor-pointer"
                    type="button"
                  >
                    <XIcon className="w-5 h-5" />
                    <span className="sr-only">Close</span>
                  </button>
                </DrawerClose>
              </DrawerHeader>

              <DrawerDescription className="px-5 pt-4 text-xs text-[#849585] leading-relaxed">
                The OAuth app is in test phase &mdash; if you haven&apos;t been
                granted access yet, drop a msg to get added.
              </DrawerDescription>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pt-4 min-h-0">
                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00e478]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#00e478] border border-[#00e478]/20">
                    Exporting {FILTER_LABELS[posFilter] ?? posFilter}
                  </span>
                </div>

                <FieldPicker selected={selectedFields} onToggle={toggleField} />

                <div className="flex items-center gap-2 pt-2 shrink-0">
                  <span className="text-xs text-[#849585]">
                    {selectedFields.size} of{" "}
                    {ALL_FIELD_IDS.length} fields selected
                  </span>
                </div>
              </div>

              <DrawerFooter className="border-t border-[#3b4b3d] p-5">
                <div className="flex justify-end gap-2">
                  <DrawerClose asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b]"
                    >
                      Cancel
                    </Button>
                  </DrawerClose>
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90"
                    disabled={selectedFields.size === 0}
                    onClick={handleExport}
                  >
                    Export
                  </Button>
                </div>
              </DrawerFooter>
            </>
          ) : (
            <>
              <DrawerHeader className="flex flex-row items-center justify-between p-5 pb-0">
                <div className="flex items-center gap-2">
                  <button
                    className="text-[#849585] hover:text-[#d6e4f9] transition-colors"
                    onClick={() => setStep("fields")}
                    disabled={isExporting}
                    type="button"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M12 4l-6 6 6 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <DrawerTitle className="text-base font-semibold text-[#d6e4f9]">
                    Export format
                  </DrawerTitle>
                </div>
                <DrawerClose asChild>
                  <button
                    disabled={!canClose}
                    className="text-[#849585] hover:text-[#d6e4f9] transition-colors cursor-pointer"
                    type="button"
                  >
                    <XIcon className="w-5 h-5" />
                    <span className="sr-only">Close</span>
                  </button>
                </DrawerClose>
              </DrawerHeader>

              <DrawerDescription className="px-5 pt-2 text-xs text-[#849585] leading-relaxed">
                Choose how to export your {players.length} player{players.length !== 1 ? "s" : ""} with {selectedFields.size} field{selectedFields.size !== 1 ? "s" : ""}.
              </DrawerDescription>

              <div className="px-5 pb-6 pt-4 space-y-2">
                <div
                  className="flex items-center gap-3 px-3 py-3 rounded-lg bg-[#061423] border border-[#3b4b3d]/50 cursor-pointer hover:bg-[#132030] transition-colors"
                  onClick={handleCsvExport}
                >
                  <FileDown className="w-5 h-5 text-[#849585]" />
                  <div>
                    <div className="text-sm text-[#d6e4f9] font-medium">
                      Download CSV
                    </div>
                    <div className="text-[11px] text-[#849585]">
                      {selectedFields.size} fields, {players.length} players
                    </div>
                  </div>
                </div>
                <div
                  className="flex items-center gap-3 px-3 py-3 rounded-lg bg-[#061423] border border-[#3b4b3d]/50 cursor-pointer hover:bg-[#132030] transition-colors"
                  onClick={handleSheetsExport}
                >
                  <svg className="w-5 h-5 text-[#849585]" viewBox="0 0 20 20" fill="none">
                    <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M3 8h14M3 12h14M8 3v14M12 3v14" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  <div>
                    <div className="text-sm text-[#d6e4f9] font-medium">
                      Export to Google Sheets
                    </div>
                    <div className="text-[11px] text-[#849585]">
                      Authenticate with Google
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {isExporting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#0f1c2c]/90 backdrop-blur-xs">
              <span className="inline-block w-8 h-8 rounded-full border-2 border-[#00e478] border-t-transparent animate-spin" />
              <span className="text-sm text-[#d6e4f9]">{loadingPhase}</span>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
