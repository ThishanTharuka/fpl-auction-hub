"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGoogleSheets } from "@/lib/google-sheets-context";
import type { EnrichedPlayer } from "@/lib/fpl-types";

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

interface ExportSheetsButtonProps {
  players: EnrichedPlayer[];
  colVisibility: Record<string, boolean | undefined>;
  posFilter: string;
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
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
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

const FILTER_LABELS: Record<string, string> = {
  ALL: "All",
  GKP: "Goalkeepers",
  DEF: "Defenders",
  MID: "Midfielders",
  FWD: "Forwards",
};

export function ExportSheetsButton({
  players,
  posFilter,
}: Readonly<ExportSheetsButtonProps>) {
  const { status, error, sheetUrl, exportToSheet, reset } = useGoogleSheets();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(PLAYER_INFO_IDS),
  );

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

  const handleExport = useCallback(async () => {
    const visible = ALL_FIELD_IDS.filter((id) => selectedFields.has(id));
    const headers = visible.map((id) => COLUMN_EXTRACTORS[id]!.header);
    const rows = players.map((p) =>
      visible.map((id) => COLUMN_EXTRACTORS[id]!.extract(p)),
    );
    await exportToSheet(headers, rows);
    setDialogOpen(false);
  }, [selectedFields, players, exportToSheet]);

  const loadingPhase =
    status === "connecting"
      ? "Authorizing with Google"
      : status === "exporting"
        ? "Creating spreadsheet..."
        : null;

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
    setDialogOpen(true);
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
                : "Export player data to a new Google Sheet"
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
          ) : (
            label
          )}
        </Button>
        {status === "error" && error && (
          <span className="absolute -bottom-5 right-0 text-[10px] text-red-400 whitespace-nowrap max-w-[200px] truncate">
            {error}
          </span>
        )}
      </span>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9] w-[calc(100%-2rem)] sm:w-[calc(100%-2rem)] max-w-4xl sm:max-w-4xl mx-auto">
          <div className="relative">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold flex items-center">
                Select fields to export
                {/* <div className="flex items-center gap-3 mt-0.5 ml-2"> */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00e478]/10 ml-3 px-2 py-0.5 text-[11px] font-medium text-[#00e478] border border-[#00e478]/20">
                  Exporting {FILTER_LABELS[posFilter] ?? posFilter}
                </span>
                {/* </div> */}
              </DialogTitle>
              <p className="text-xs text-[#849585] mb-3 leading-relaxed">
                The OAuth app is still in test phase &mdash; if you haven&apos;t
                been granted access yet, drop a message or an email to get added
                to the test users. (thishantharuka4@gmail.com)
              </p>
            </DialogHeader>
            <FieldPicker selected={selectedFields} onToggle={toggleField} />
            <div className="flex items-center justify-between gap-2 pt-2">
              <span className="text-xs text-[#849585]">
                {selectedFields.size} of {ALL_FIELD_IDS.length} fields selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b]"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
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
            </div>

            {isExporting && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-xl bg-[#0f1c2c]/90 backdrop-blur-xs">
                <span className="inline-block w-8 h-8 rounded-full border-2 border-[#00e478] border-t-transparent animate-spin" />
                <span className="text-sm text-[#d6e4f9]">{loadingPhase}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
