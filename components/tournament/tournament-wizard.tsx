"use client";

import { useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, WandSparkles, CheckCircle2, AlertCircle, Trophy, Swords, Route, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { validateStage } from "@/lib/tournament/validator";
import { autoSuggest } from "@/lib/tournament/suggester";
import { useAuth } from "@/components/auth-provider";
import type { StageConfig, ValidationResult } from "@/lib/tournament/types";

const TOTAL_GWS = 38;

type WizardStep = "format" | "scoring" | "stages" | "review";

type SuggesterPreference = "league_playoffs" | "pure_league" | "knockout_heavy";

interface StageFormData {
  localId: string;
  name: string;
  type: "round_robin" | "knockout" | "swiss";
  scoringMode: "total_points" | "head_to_head";
  startGw: number;
  endGw: number;
  advanceQualifiers: number | null;
  repetitions: number;
  rounds: number;
  teams: number;
  twoLegged: boolean;
  thirdPlace: boolean;
}

function ValidationBadgeIcon({ validation }: { validation: ValidationResult }) {
  if (validation.valid) return <CheckCircle2 size={16} className="text-green-500 shrink-0" />;
  return <span title={validation.reason}><AlertCircle size={16} className="text-red-400 shrink-0" /></span>;
}

function Toggle({ checked, onChange, label }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors
        ${checked ? "bg-[#00e478] border-[#00e478]" : "bg-[#1e2b3b] border-[#3b4b3d]"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform mt-[2px] ml-[2px]
        ${checked ? "translate-x-4" : "translate-x-0"}`} />
      <span className="sr-only">{label}</span>
    </button>
  );
}

function toStageConfig(s: StageFormData): StageConfig {
  return {
    name: s.name,
    type: s.type,
    scoringMode: s.scoringMode,
    startGw: s.startGw,
    endGw: s.endGw,
    advanceQualifiers: s.advanceQualifiers ?? undefined,
    config: {
      repetitions: s.type === "round_robin" ? s.repetitions : undefined,
      rounds: s.type === "swiss" ? s.rounds : undefined,
      teams: s.type === "knockout" ? s.teams : undefined,
      twoLegged: s.type === "knockout" ? s.twoLegged : undefined,
      thirdPlace: s.type === "knockout" ? s.thirdPlace : undefined,
    },
  };
}

let localIdCounter = 0;
function nextLocalId(): string {
  localIdCounter += 1;
  return `stage-${localIdCounter}`;
}

function createDefaultStage(
  index: number,
  type: "round_robin" | "knockout" | "swiss",
  scoringMode: "total_points" | "head_to_head",
  startGw: number,
  endGw: number,
  teamCount: number,
): StageFormData {
  const names: Record<string, string> = {
    round_robin: "Regular Season",
    knockout: "Playoffs",
    swiss: "Swiss Stage",
  };
  const maxKoTeams = largestPowerOfTwo(teamCount);
  return {
    localId: nextLocalId(),
    name: names[type] ?? "Stage",
    type,
    scoringMode,
    startGw,
    endGw,
    advanceQualifiers: null,
    repetitions: 2,
    rounds: Math.max(3, Math.ceil(Math.log2(teamCount))),
    teams: Math.min(8, maxKoTeams),
    twoLegged: false,
    thirdPlace: true,
  };
}

function largestPowerOfTwo(n: number): number {
  if (n <= 0) return 0;
  let result = 1;
  while (result <= n) result *= 2;
  return result / 2;
}

// ─── SORTABLE STAGE CARD ────────────────────────────────

function SortableStageCard({
  stage,
  index,
  teamCount,
  stageCount,
  validation,
  onUpdate,
  onRemove,
}: {
  stage: StageFormData;
  index: number;
  teamCount: number;
  stageCount: number;
  validation: ValidationResult;
  onUpdate: (id: string, patch: Partial<StageFormData>) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.localId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const koTeamOptions: number[] = [];
  for (let i = 2; i <= largestPowerOfTwo(teamCount); i *= 2) {
    koTeamOptions.push(i);
  }

  const isLast = index === stageCount - 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border ${validation.valid ? "border-[#3b4b3d]" : "border-red-500/50"} bg-[#0f1c2c] p-4 space-y-4 ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab text-[#3b4b3d] hover:text-[#849585]">
          <GripVertical size={18} />
        </button>
        <span className="text-xs font-semibold text-[#849585] uppercase tracking-wider w-16">Stage {index + 1}</span>
        <Input
          value={stage.name}
          onChange={(e) => onUpdate(stage.localId, { name: e.target.value })}
          className="h-8 text-sm bg-[#1e2b3b] border-[#3b4b3d] text-[#d6e4f9] flex-1"
        />
        {stageCount > 1 && (
          <button onClick={() => onRemove(stage.localId)} className="text-xs text-red-400 hover:text-red-300">
            Remove
          </button>
        )}
        <ValidationBadgeIcon validation={validation} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-[#849585]">Type</Label>
          <Select
            value={stage.type}
            onValueChange={(v) => onUpdate(stage.localId, { type: v as StageFormData["type"] })}
          >
            <SelectTrigger className="h-8 text-xs bg-[#1e2b3b] border-[#3b4b3d] text-[#d6e4f9]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9]">
              <SelectItem value="round_robin" className="text-xs">Round Robin</SelectItem>
              <SelectItem value="knockout" className="text-xs">Knockout</SelectItem>
              <SelectItem value="swiss" className="text-xs">Swiss</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-[#849585]">Scoring</Label>
          <Select
            value={stage.scoringMode}
            onValueChange={(v) => onUpdate(stage.localId, { scoringMode: v as "total_points" | "head_to_head" })}
          >
            <SelectTrigger className="h-8 text-xs bg-[#1e2b3b] border-[#3b4b3d] text-[#d6e4f9]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9]">
              <SelectItem value="total_points" className="text-xs">Total Points</SelectItem>
              <SelectItem value="head_to_head" className="text-xs">Head to Head</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-[#849585]">Start GW</Label>
          <Input
            type="number"
            min={1}
            max={38}
            value={stage.startGw}
            onChange={(e) => onUpdate(stage.localId, { startGw: Math.max(1, Math.min(38, Number(e.target.value) || 1)) })}
            className="h-8 text-xs bg-[#1e2b3b] border-[#3b4b3d] text-[#d6e4f9]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-[#849585]">End GW</Label>
          <Input
            type="number"
            min={1}
            max={38}
            value={stage.endGw}
            onChange={(e) => onUpdate(stage.localId, { endGw: Math.max(1, Math.min(38, Number(e.target.value) || 1)) })}
            className="h-8 text-xs bg-[#1e2b3b] border-[#3b4b3d] text-[#d6e4f9]"
          />
        </div>
      </div>

      {stage.type === "round_robin" && (
        <div className="flex gap-4 items-center">
          <div className="space-y-1.5 w-32">
            <Label className="text-xs text-[#849585]">Repetitions</Label>
            <Select
              value={String(stage.repetitions)}
              onValueChange={(v) => onUpdate(stage.localId, { repetitions: Number(v) })}
            >
              <SelectTrigger className="h-8 text-xs bg-[#1e2b3b] border-[#3b4b3d] text-[#d6e4f9]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9]">
                <SelectItem value="1" className="text-xs">1x</SelectItem>
                <SelectItem value="2" className="text-xs">2x</SelectItem>
                <SelectItem value="3" className="text-xs">3x</SelectItem>
                <SelectItem value="4" className="text-xs">4x</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {((teamCount % 2 === 0 ? teamCount - 1 : teamCount) * stage.repetitions) > 0 && (
            <Badge variant="outline" className="text-xs border-[#3b4b3d] text-[#849585] bg-transparent self-end mb-1">
              {stage.repetitions === 1 ? `${teamCount - 1} round` : `${(teamCount % 2 === 0 ? teamCount - 1 : teamCount) * stage.repetitions} rounds`} needed
            </Badge>
          )}
          {stage.advanceQualifiers !== null && stage.advanceQualifiers > 0 && !isLast && (
            <div className="space-y-1.5 w-32">
              <Label className="text-xs text-[#849585]">Qualifiers</Label>
              <Input
                type="number"
                min={2}
                value={stage.advanceQualifiers}
                onChange={(e) => onUpdate(stage.localId, { advanceQualifiers: Number(e.target.value) || null })}
                className="h-8 text-xs bg-[#1e2b3b] border-[#3b4b3d] text-[#d6e4f9]"
              />
            </div>
          )}
        </div>
      )}

      {stage.type === "swiss" && (
        <div className="flex gap-4 items-center">
          <div className="space-y-1.5 w-32">
            <Label className="text-xs text-[#849585]">Rounds</Label>
            <Input
              type="number"
              min={1}
              max={38}
              value={stage.rounds}
              onChange={(e) => onUpdate(stage.localId, { rounds: Math.max(1, Number(e.target.value) || 1) })}
              className="h-8 text-xs bg-[#1e2b3b] border-[#3b4b3d] text-[#d6e4f9]"
            />
          </div>
          <Badge variant="outline" className="text-xs border-[#3b4b3d] text-[#849585] bg-transparent self-end mb-1">
            Min {Math.ceil(Math.log2(teamCount))} recommended
          </Badge>
          {!isLast && (
            <div className="space-y-1.5 w-32">
              <Label className="text-xs text-[#849585]">Qualifiers</Label>
              <Input
                type="number"
                min={2}
                value={stage.advanceQualifiers ?? ""}
                onChange={(e) => onUpdate(stage.localId, { advanceQualifiers: Number(e.target.value) || null })}
                className="h-8 text-xs bg-[#1e2b3b] border-[#3b4b3d] text-[#d6e4f9]"
              />
            </div>
          )}
        </div>
      )}

      {stage.type === "knockout" && (
        <div className="flex gap-4 items-center flex-wrap">
          <div className="space-y-1.5 w-32">
            <Label className="text-xs text-[#849585]">Teams</Label>
            <Select
              value={String(stage.teams)}
              onValueChange={(v) => onUpdate(stage.localId, { teams: Number(v) })}
            >
              <SelectTrigger className="h-8 text-xs bg-[#1e2b3b] border-[#3b4b3d] text-[#d6e4f9]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9]">
                {koTeamOptions.map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 self-end mb-1">
            <Label className="text-xs text-[#849585]">3rd Place</Label>
            <Toggle
              checked={stage.thirdPlace}
              onChange={(v: boolean) => onUpdate(stage.localId, { thirdPlace: v })}
              label="3rd place match"
            />
          </div>
          <div className="flex items-center gap-2 self-end mb-1">
            <Label className="text-xs text-[#849585]">Two-Legged</Label>
            <Toggle
              checked={stage.twoLegged}
              onChange={(v: boolean) => onUpdate(stage.localId, { twoLegged: v })}
              label="Two-legged ties"
            />
          </div>
        </div>
      )}

      {(() => { if (!validation.valid) return <p className="text-xs text-red-400 mt-1">{validation.reason}</p> })()}
    </div>
  );
}

// ─── GW TIMELINE ────────────────────────────────────────

function GwTimeline({ stages }: { stages: StageFormData[] }) {
  const segments: { start: number; end: number; color: string; label: string }[] = [];
  const used = new Set<number>();

  for (const s of stages) {
    const color =
      s.type === "round_robin" ? "#3b82f6" :
      s.type === "knockout" ? "#ef4444" :
      s.type === "swiss" ? "#a855f7" :
      "#6b7280";
    const gwStart = Math.max(1, Math.min(TOTAL_GWS, s.startGw));
    const gwEnd = Math.max(gwStart, Math.min(TOTAL_GWS, s.endGw));
    for (let g = gwStart; g <= gwEnd; g++) used.add(g);
    segments.push({ start: gwStart, end: gwEnd, color, label: s.name });
  }

  return (
    <div className="space-y-2">
      <div className="relative h-7 w-full rounded overflow-hidden flex">
        {Array.from({ length: TOTAL_GWS }, (_, i) => {
          const gw = i + 1;
          const seg = segments.find((s) => gw >= s.start && gw <= s.end);
          return (
            <div
              key={gw}
              className="flex-1 border-r border-[#061423]/30 flex items-center justify-center"
              style={{ backgroundColor: seg?.color ?? "#1e2b3b" }}
              title={`GW ${gw}${seg ? `: ${seg.label}` : ""}`}
            >
              {gw % 5 === 0 && (
                <span className="text-[9px] text-white/70 font-mono">{gw}</span>
              )}
            </div>
          );
        })}
      </div>
      {segments.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-[11px] text-[#849585]">{seg.label} (GW {seg.start}-{seg.end})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── STEP INDICATOR ─────────────────────────────────────

function StepIndicator({ steps, current }: { steps: WizardStep[]; current: WizardStep }) {
  const labels: Record<WizardStep, string> = {
    format: "Format",
    scoring: "Scoring",
    stages: "Stages",
    review: "Review",
  };

  const currentIndex = steps.indexOf(current);

  return (
    <div className="flex items-center gap-1 mb-8">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
              ${i === currentIndex ? "bg-[#00e478]/20 text-[#00e478]" : ""}
              ${i < currentIndex ? "text-green-500" : ""}
              ${i > currentIndex ? "text-[#3b4b3d]" : ""}`}
          >
            {i < currentIndex ? <CheckCircle2 size={14} /> : <span className="text-xs">{i + 1}</span>}
            {labels[step]}
          </div>
          {i < steps.length - 1 && <span className="text-[#3b4b3d] w-4 h-px bg-[#3b4b3d]" />}
        </div>
      ))}
    </div>
  );
}

// ─── FORMAT CARDS ───────────────────────────────────────

const formatOptions: {
  value: SuggesterPreference;
  icon: typeof Trophy;
  title: string;
  desc: string;
  timeline: string;
}[] = [
  {
    value: "league_playoffs",
    icon: Trophy,
    title: "League + Playoffs",
    desc: "Regular season round-robin followed by knockout playoffs for the top teams.",
    timeline: "Blue league phase → Red knockout phase",
  },
  {
    value: "pure_league",
    icon: Route,
    title: "Pure League",
    desc: "All teams in a single round-robin league for the entire season.",
    timeline: "Blue league phase (full season)",
  },
  {
    value: "knockout_heavy",
    icon: Swords,
    title: "Knockout",
    desc: "Single or double elimination bracket tournament.",
    timeline: "Red knockout bracket",
  },
];

// ─── MAIN WIZARD ────────────────────────────────────────

export default function TournamentWizard({
  leagueId,
  teamCount,
}: {
  leagueId: string;
  teamCount: number;
  participants: { id: string; name: string; color: string | null }[];
}) {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [step, setStep] = useState<WizardStep>("format");
  const [preference, setPreference] = useState<SuggesterPreference | null>(null);
  const [defaultScoringMode, setDefaultScoringMode] = useState<"total_points" | "head_to_head">("total_points");
  const [tournamentName, setTournamentName] = useState("");
  const [stages, setStages] = useState<StageFormData[]>([]);
  const [generating, setGenerating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const steps: WizardStep[] = ["format", "scoring", "stages", "review"];

  // Convert stages to StageConfig[] for validation
  const stageConfigs = useMemo(() => stages.map(toStageConfig), [stages]);

  // Validate current stages
  const stageValidations = useMemo(() => {
    return stages.map((s) => validateStage(toStageConfig(s), teamCount));
  }, [stages, teamCount]);

  const allStagesValid = useMemo(() => {
    if (stages.length === 0) return false;

    // Check GW overlap
    for (let i = 0; i < stageConfigs.length - 1; i++) {
      if (stageConfigs[i]!.endGw >= stageConfigs[i + 1]!.startGw) return false;
    }

    // Check total GWs
    const last = stageConfigs[stageConfigs.length - 1]!;
    if (last.endGw > TOTAL_GWS) return false;

    // Each stage is individually valid
    return stageValidations.every((v) => v.valid);
  }, [stages, stageConfigs, stageValidations]);

  // Auto-suggest from preference (preserves calculated config values)
  const handleAutoSuggest = useCallback((pref: SuggesterPreference) => {
    setPreference(pref);
    const suggestion = autoSuggest(teamCount, TOTAL_GWS, pref);
    setTournamentName(suggestion.name);
    const newStages = suggestion.stages.map((s, i) => {
      const stage = createDefaultStage(
        i, s.type === 'league' ? 'round_robin' : s.type,
        s.scoringMode ?? defaultScoringMode,
        s.startGw, s.endGw, teamCount,
      );
      if (s.advanceQualifiers) stage.advanceQualifiers = s.advanceQualifiers;
      if (s.config.repetitions) stage.repetitions = s.config.repetitions;
      if (s.config.rounds) stage.rounds = s.config.rounds;
      if (s.config.teams) stage.teams = s.config.teams;
      if (s.config.twoLegged !== undefined) stage.twoLegged = s.config.twoLegged;
      if (s.config.thirdPlace !== undefined) stage.thirdPlace = s.config.thirdPlace;
      return stage;
    });
    setStages(newStages);
  }, [teamCount, defaultScoringMode]);

  // Stage CRUD
  const updateStage = useCallback((localId: string, patch: Partial<StageFormData>) => {
    setStages((prev) => prev.map((s) => (s.localId === localId ? { ...s, ...patch } : s)));
  }, []);

  const removeStage = useCallback((localId: string) => {
    setStages((prev) => prev.filter((s) => s.localId !== localId));
  }, []);

  const addStage = useCallback(() => {
    setStages((prev) => {
      const lastGw = prev.length > 0 ? prev[prev.length - 1]!.endGw : 0;
      const startGw = Math.min(lastGw + 1, TOTAL_GWS);
      const endGw = Math.min(startGw + 7, TOTAL_GWS);
      const newStage = createDefaultStage(
        prev.length,
        "round_robin",
        defaultScoringMode,
        startGw,
        endGw,
        teamCount,
      );
      return [...prev, newStage];
    });
  }, [defaultScoringMode, teamCount]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStages((prev) => {
      const oldIndex = prev.findIndex((s) => s.localId === active.id);
      const newIndex = prev.findIndex((s) => s.localId === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const result = [...prev];
      const [removed] = result.splice(oldIndex, 1);
      result.splice(newIndex, 0, removed!);
      return result;
    });
  }, []);

  // Generate tournament
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      if (!user) {
        toast.error("You must be signed in");
        return;
      }
      const res = await fetch("/api/tournament/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueId,
          name: tournamentName || `${teamCount}-Team Tournament`,
          stages: stageConfigs,
          teamCount,
        }),
      });

      const data = (await res.json()) as { tournamentId: string; error?: string };
      if (!res.ok || !data.tournamentId) {
        toast.error(data.error ?? "Failed to create tournament");
        return;
      }

      toast.success("Tournament created!");
      router.push(`/auction/${id}/tournament/${data.tournamentId}`);
    } catch {
      toast.error("Failed to create tournament");
    } finally {
      setGenerating(false);
    }
  }, [leagueId, tournamentName, stageConfigs, teamCount, router, id, user]);

  return (
    <div className="space-y-6">
      <StepIndicator steps={steps} current={step} />

      {/* ── STEP 1: FORMAT ── */}
      {step === "format" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-[#d6e4f9]">Choose a format</h2>
            <p className="text-sm text-[#849585] mt-1">{teamCount} teams will compete in this tournament.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formatOptions.map((opt) => {
              const Icon = opt.icon;
              const selected = preference === opt.value;
              return (
                <Card
                  key={opt.value}
                  onClick={() => handleAutoSuggest(opt.value)}
                  className={`p-5 cursor-pointer transition-all border-2 ${
                    selected
                      ? "border-[#00e478] bg-[#00e478]/5"
                      : "border-[#3b4b3d] bg-[#0f1c2c] hover:border-[#849585]"
                  }`}
                >
                  <Icon size={24} className={selected ? "text-[#00e478]" : "text-[#849585]"} />
                  <h3 className="text-sm font-semibold text-[#d6e4f9] mt-3">{opt.title}</h3>
                  <p className="text-xs text-[#849585] mt-1">{opt.desc}</p>
                  <p className="text-[11px] text-[#3b4b3d] mt-2">{opt.timeline}</p>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setStep("scoring")}
              disabled={!preference}
              className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90"
            >
              Next <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: SCORING ── */}
      {step === "scoring" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-[#d6e4f9]">Scoring mode</h2>
            <p className="text-sm text-[#849585] mt-1">
              Each stage can override this, but choose a default for the whole tournament.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              onClick={() => setDefaultScoringMode("head_to_head")}
              className={`p-5 cursor-pointer transition-all border-2 ${
                defaultScoringMode === "head_to_head"
                  ? "border-[#00e478] bg-[#00e478]/5"
                  : "border-[#3b4b3d] bg-[#0f1c2c] hover:border-[#849585]"
              }`}
            >
              <h3 className="text-sm font-semibold text-[#d6e4f9]">Head to Head</h3>
              <p className="text-xs text-[#849585] mt-2">
                Teams earn 3 points for a win, 1 for a draw. Ranked by match points, then goal difference.
              </p>
              <div className="mt-3 flex gap-2 text-xs text-[#d6e4f9]">
                <span className="bg-[#1e2b3b] px-2 py-1 rounded">Team A 72</span>
                <span className="text-[#849585]">vs</span>
                <span className="bg-[#1e2b3b] px-2 py-1 rounded">Team B 65</span>
                <Badge className="bg-green-700/40 text-green-400 border-green-700/50 text-[10px]">A gets 3pts</Badge>
              </div>
            </Card>
            <Card
              onClick={() => setDefaultScoringMode("total_points")}
              className={`p-5 cursor-pointer transition-all border-2 ${
                defaultScoringMode === "total_points"
                  ? "border-[#00e478] bg-[#00e478]/5"
                  : "border-[#3b4b3d] bg-[#0f1c2c] hover:border-[#849585]"
              }`}
            >
              <h3 className="text-sm font-semibold text-[#d6e4f9]">Total Points</h3>
              <p className="text-xs text-[#849585] mt-2">
                Cumulative FPL gameweek scores. Ranked by total points — simple and pure.
              </p>
              <div className="mt-3 space-y-1 text-xs text-[#d6e4f9]">
                <div className="flex justify-between bg-[#1e2b3b] px-2 py-1 rounded">
                  <span>1. Team A</span>
                  <span className="text-[#00e478]">1,824 pts</span>
                </div>
                <div className="flex justify-between bg-[#1e2b3b] px-2 py-1 rounded">
                  <span>2. Team B</span>
                  <span className="text-[#849585]">1,790 pts</span>
                </div>
              </div>
            </Card>
          </div>
          <div className="flex justify-between">
            <Button onClick={() => setStep("format")} variant="outline" className="border-[#3b4b3d] text-[#849585]">
              <ArrowLeft size={16} className="mr-1" /> Back
            </Button>
            <Button
              onClick={() => {
                // Apply default scoring mode to all stages
                setStages((prev) => prev.map((s) => ({ ...s, scoringMode: defaultScoringMode })));
                setStep("stages");
              }}
              className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90"
            >
              Next <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: STAGES ── */}
      {step === "stages" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#d6e4f9]">Configure stages</h2>
              <p className="text-sm text-[#849585] mt-1">
                Drag to reorder. Each stage configures its own type, GW range, and scoring.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleAutoSuggest(preference ?? "league_playoffs")}
                variant="outline"
                size="sm"
                className="border-[#3b4b3d] text-[#849585] hover:bg-[#132030] text-xs"
              >
                <WandSparkles size={14} className="mr-1" /> Auto-suggest
              </Button>
              {stages.length < 4 && (
                <Button
                  onClick={addStage}
                  variant="outline"
                  size="sm"
                  className="border-[#3b4b3d] text-[#849585] hover:bg-[#132030] text-xs"
                >
                  <Plus size={14} className="mr-1" /> Add stage
                </Button>
              )}
            </div>
          </div>

          <GwTimeline stages={stages} />

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={stages.map((s) => s.localId)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {stages.map((s, i) => (
                  <SortableStageCard
                    key={s.localId}
                    stage={s}
                    index={i}
                    teamCount={teamCount}
                    stageCount={stages.length}
                    validation={stageValidations[i] ?? { valid: true }}
                    onUpdate={updateStage}
                    onRemove={removeStage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {stages.length === 0 && (
            <div className="text-center py-12 text-[#849585] text-sm">
              No stages yet. Click Auto-suggest or Add stage to begin.
            </div>
          )}

          <div className="flex justify-between">
            <Button onClick={() => setStep("scoring")} variant="outline" className="border-[#3b4b3d] text-[#849585]">
              <ArrowLeft size={16} className="mr-1" /> Back
            </Button>
            <Button
              onClick={() => setStep("review")}
              disabled={!allStagesValid}
              className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90"
            >
              Review <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: REVIEW ── */}
      {step === "review" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-[#d6e4f9]">Review and Generate</h2>
            <p className="text-sm text-[#849585] mt-1">
              Verify the tournament configuration before creating it.
            </p>
          </div>

          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Label className="text-xs text-[#849585] shrink-0">Tournament Name</Label>
              <Input
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder={`${teamCount}-Team Tournament`}
                className="h-8 text-sm bg-[#1e2b3b] border-[#3b4b3d] text-[#d6e4f9] flex-1"
              />
            </div>

            <GwTimeline stages={stages} />

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#849585] border-b border-[#3b4b3d]">
                    <th className="text-left py-2 pr-3">Stage</th>
                    <th className="text-left py-2 pr-3">Type</th>
                    <th className="text-left py-2 pr-3">Scoring</th>
                    <th className="text-left py-2 pr-3">GWs</th>
                    <th className="text-left py-2 pr-3">Details</th>
                    <th className="text-left py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stages.map((s, i) => {
                    const v = stageValidations[i];
                    const details: string[] = [];
                    if (s.type === "round_robin") {
                      const roundsNeeded = (teamCount % 2 === 0 ? teamCount - 1 : teamCount) * s.repetitions;
                      details.push(`${s.repetitions}x RR`, `${roundsNeeded} rounds`);
                    }
                    if (s.type === "swiss") {
                      details.push(`${s.rounds} rounds`);
                    }
                    if (s.type === "knockout") {
                      details.push(`${s.teams} teams${s.twoLegged ? ", 2-legged" : ""}${s.thirdPlace ? ", 3rd place" : ""}`);
                    }
                    if (s.advanceQualifiers && i < stages.length - 1) {
                      details.push(`Top ${s.advanceQualifiers} advance`);
                    }
                    return (
                      <tr key={s.localId} className="border-b border-[#3b4b3d]/50">
                        <td className="py-2 pr-3 text-[#d6e4f9]">{s.name}</td>
                        <td className="py-2 pr-3 text-[#849585] capitalize">{s.type.replace("_", " ")}</td>
                        <td className="py-2 pr-3 text-[#849585]">
                          {s.scoringMode === "head_to_head" ? "H2H" : "Total Pts"}
                        </td>
                        <td className="py-2 pr-3 text-[#849585]">GW {s.startGw}-{s.endGw}</td>
                        <td className="py-2 pr-3 text-[#849585]">{details.join(", ")}</td>
                        <td className="py-2">
                          <ValidationBadgeIcon validation={v ?? { valid: true }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-4 text-xs text-[#849585]">
              <span>Teams: {teamCount}</span>
              <span>GWs used: {stageConfigs.reduce((sum, s) => sum + (s.endGw - s.startGw + 1), 0)} / {TOTAL_GWS}</span>
              <span>Stages: {stages.length}</span>
            </div>
          </div>

          <div className="flex justify-between">
            <Button onClick={() => setStep("stages")} variant="outline" className="border-[#3b4b3d] text-[#849585]">
              <ArrowLeft size={16} className="mr-1" /> Back
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!allStagesValid || generating}
              className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90"
            >
              {generating ? "Creating..." : "Generate Tournament"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
