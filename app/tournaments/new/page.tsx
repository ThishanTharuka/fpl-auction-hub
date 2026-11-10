"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";
import { DEFAULT_FORMAT_CONFIG } from "@/lib/tournament/types";
import type { FixtureDraft } from "@/lib/tournament/types";
import type { TeamMatch } from "@/lib/tournament/parser";
import { buildKnockoutFixtures, countGroupMatchdays } from "@/lib/tournament/schedule";
import { buildTwoPathBracket } from "@/lib/tournament/knockout-two-path";

const supabase = createSupabaseBrowserClient();

type LeagueOption = { id: string; name: string; status: string | null };
type ParticipantRow = { id: string; name: string; fpl_manager_id: number | null };

type ResolutionLine = {
  matchday: number;
  home: string;
  away: string;
  homeMatch: TeamMatch;
  awayMatch: TeamMatch;
};

function matchId(match: TeamMatch, picked: string | undefined): string | null {
  if (match.status === "exact" || match.status === "fuzzy") return match.team.id;
  if (picked) return picked;
  return null;
}

export default function NewTournamentPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [leagueA, setLeagueA] = useState("");
  const [leagueB, setLeagueB] = useState("");
  const [rosterA, setRosterA] = useState<ParticipantRow[]>([]);
  const [rosterB, setRosterB] = useState<ParticipantRow[]>([]);
  const [name, setName] = useState("");
  const [startGw, setStartGw] = useState<number>(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [compRoster, setCompRoster] = useState<{ id: string; name: string }[]>([]);
  const [mode, setMode] = useState<"generate" | "import" | null>(null);
  const [importText, setImportText] = useState("");
  const [preview, setPreview] = useState<FixtureDraft[] | null>(null);
  const [resolution, setResolution] = useState<ResolutionLine[] | null>(null);
  const [picks, setPicks] = useState<Record<number, { home: string; away: string }>>({});
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("leagues")
        .select("id,name,status")
        .eq("created_by", user.id)
        .order("name");
      setLeagues((data ?? []) as LeagueOption[]);
    })().catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!competitionId) return;
    supabase
      .from("competition_teams")
      .select("id,name")
      .eq("competition_id", competitionId)
      .order("name")
      .then(({ data }) => setCompRoster((data ?? []) as { id: string; name: string }[]));
  }, [competitionId]);

  const pickableLeagues = useMemo(() => leagues.map((l) => l.id), [leagues]);

  const selectedName = (id: string) => leagues.find((l) => l.id === id)?.name ?? "";

  async function selectLeague(side: "A" | "B", id: string) {
    if (side === "A") {
      setLeagueA(id);
      setRosterA([]);
      const { data } = await supabase
        .from("participants")
        .select("id,name,fpl_manager_id")
        .eq("league_id", id)
        .order("name");
      setRosterA((data ?? []) as ParticipantRow[]);
    } else {
      setLeagueB(id);
      setRosterB([]);
      const { data } = await supabase
        .from("participants")
        .select("id,name,fpl_manager_id")
        .eq("league_id", id)
        .order("name");
      setRosterB((data ?? []) as ParticipantRow[]);
    }
  }

  // Calculated schedule metrics
  const qualifiers = DEFAULT_FORMAT_CONFIG.qualification.qualifiers_per_group;
  const sizeA = Math.max(rosterA.length, qualifiers);
  const sizeB = Math.max(rosterB.length, qualifiers);
  const totalGroupMds = countGroupMatchdays(DEFAULT_FORMAT_CONFIG, sizeA, sizeB);
  const totalWeeks = totalGroupMds + 1 + 9; // group stage + 1 bye + 9 knockout
  const safeStartGw = Number.isInteger(startGw) && startGw >= 1 ? startGw : 1;
  const endGw = safeStartGw + totalWeeks - 1;
  const isScheduleValid = endGw <= 38;

  async function createCompetition() {
    setError("");
    if (!name.trim()) return setError("Give the tournament a name.");
    if (!leagueA || !leagueB || leagueA === leagueB) return setError("Pick two different leagues.");
    if (!Number.isInteger(startGw) || startGw < 1) return setError("Enter a starting gameweek.");

    if (endGw > 38) {
      return setError(
        `This tournament requires ${totalWeeks} gameweeks (${totalGroupMds} group matchdays, 1 bye week, 9 knockout weeks). Starting at GW ${startGw} would end at GW ${endGw}, exceeding the 38-gameweek FPL season.`,
      );
    }

    setCreating(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          leagueAId: leagueA,
          leagueBId: leagueB,
          formatConfig: DEFAULT_FORMAT_CONFIG,
          startGw,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Failed to create the tournament.");
      setCompetitionId(data.competition.id);
    } finally {
      setCreating(false);
    }
  }

  async function generateFixtures() {
    if (!competitionId) return;
    setBusy(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/tournaments/${competitionId}/fixtures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "generate" }),
      });
      const data = await res.json();
      if (!res.ok) return setSaveError(data.error ?? "Failed to generate fixtures.");
      setPreview(data.drafts);
      setMode("generate");
    } finally {
      setBusy(false);
    }
  }

  async function resolveImport() {
    if (!competitionId) return;
    setBusy(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/tournaments/${competitionId}/fixtures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "import", text: importText }),
      });
      const data = await res.json();
      if (!res.ok) return setSaveError(data.error ?? "Failed to parse fixtures.");
      setResolution(data.resolution as ResolutionLine[]);
      setMode("import");
    } finally {
      setBusy(false);
    }
  }

  async function saveFixtures() {
    if (!competitionId) return;
    if (mode === "generate" && preview) {
      setBusy(true);
      try {
        const res = await fetch(`/api/tournaments/${competitionId}/fixtures`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ drafts: preview }),
        });
        const data = await res.json();
        if (!res.ok) return setSaveError(data.error ?? "Failed to save fixtures.");
        router.push(`/tournaments/${competitionId}`);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (mode === "import" && resolution) {
      const offset = (startGw > 0 ? startGw : 1) - 1;
      const drafts: FixtureDraft[] = resolution.map((line, i) => {
        const pick = picks[i];
        const homeId = matchId(line.homeMatch, pick?.home);
        const awayId = matchId(line.awayMatch, pick?.away);
        return {
          competition_id: competitionId,
          stage: "group" as const,
          phase: "import",
          tie_index: i + 1,
          leg: 1,
          gw: line.matchday + offset,
          home_team_id: homeId,
          away_team_id: awayId,
        };
      });
      if (drafts.some((d) => d.home_team_id === null || d.away_team_id === null)) {
        return setSaveError("Resolve every team before saving (pick from the dropdowns).");
      }
      // Append KO fixtures (1 bye GW after group stage, then 9-week bracket).
      const bracket = buildTwoPathBracket();
      const maxGroupGw = drafts.reduce((max, d) => Math.max(max, d.gw), 0);
      const koStartGw = maxGroupGw + 2; // 1 bye GW after group stage
      const koDrafts = buildKnockoutFixtures(competitionId, bracket, koStartGw, drafts.length + 1);
      const allDrafts = [...drafts, ...koDrafts];

      const maxGw = Math.max(...allDrafts.map((d) => d.gw));
      if (maxGw > 38) {
        return setSaveError(
          `Schedule exceeds the 38-week FPL season (final is scheduled for GW ${maxGw}). Please adjust your matchdays or starting gameweek.`,
        );
      }
      setBusy(true);
      try {
        const res = await fetch(`/api/tournaments/${competitionId}/fixtures`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ drafts: allDrafts }),
        });
        const data = await res.json();
        if (!res.ok) return setSaveError(data.error ?? "Failed to save fixtures.");
        router.push(`/tournaments/${competitionId}`);
      } finally {
        setBusy(false);
      }
      return;
    }
  }

  const previewByGw = useMemo(() => {
    if (!preview) return [];
    const map = new Map<number, FixtureDraft[]>();
    for (const f of preview) {
      const list = map.get(f.gw) ?? [];
      list.push(f);
      map.set(f.gw, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [preview]);

  const teamName = (id: string | null, roster: ParticipantRow[]) =>
    roster.find((t) => t.id === id)?.name ?? "TBD";

  const missingManagers = (roster: ParticipantRow[]) =>
    roster.filter((t) => t.fpl_manager_id === null);

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Header — Consistent with Insights, Players, Teams */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          New Tournament
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
          Combine two of your leagues into a competition with real FPL gameweek scoring.
        </p>
      </div>

      {!competitionId ? (
        /* Full-Row Studio Layout: Config Column (8 cols) + Season Blueprint Column (4 cols) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Configuration Card (8 Columns) */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Tournament Details */}
            <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-6 sm:p-7 space-y-5 shadow-sm">
              <div className="pb-2 border-b border-border/40">
                <h2 className="text-base font-semibold text-foreground tracking-tight">Tournament Details</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Name your tournament and choose which gameweek it kicks off.</p>
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tournament Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Champions Cup 2026"
                    className="rounded-xl bg-muted/40 border-border/70 text-foreground placeholder:text-muted-foreground h-10 px-3.5 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Start Gameweek
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={38}
                    value={startGw}
                    onChange={(e) => setStartGw(parseInt(e.target.value, 10))}
                    className="rounded-xl bg-muted/40 border-border/70 text-foreground h-10 px-3.5 tabular-nums focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Quick Gameweek Stepper Pills */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">Quick pick:</span>
                {[1, 2, 5, 10, 15, 20].map((gw) => (
                  <button
                    key={gw}
                    type="button"
                    onClick={() => setStartGw(gw)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                      startGw === gw
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-foreground/30 border border-border/50"
                    }`}
                  >
                    GW {gw}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Source Leagues Linking */}
            <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-6 sm:p-7 space-y-5 shadow-sm">
              <div className="pb-2 border-b border-border/40">
                <h2 className="text-base font-semibold text-foreground tracking-tight">Source Leagues</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Select two 10-team leagues to pair into Group A and Group B.</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {/* League A Card */}
                <div className="space-y-3 p-4 rounded-xl border border-border/60 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-primary uppercase tracking-wider">
                      Group A
                    </span>
                    {rosterA.length > 0 && (
                      <Badge className="text-[11px] font-medium border rounded-full px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                        {rosterA.length} Teams
                      </Badge>
                    )}
                  </div>
                  <Select value={leagueA} onValueChange={(v) => v && selectLeague("A", v)}>
                    <SelectTrigger className="w-full rounded-xl bg-card border-border/70 text-foreground h-10 px-3.5 hover:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all">
                      <SelectValue placeholder="Pick League A">{(val: string | null) => (val ? selectedName(val) : "Pick League A")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/70 bg-card/95 backdrop-blur-xl text-foreground shadow-2xl">
                      {pickableLeagues.map((id) => (
                        <SelectItem key={id} value={id} className="text-xs rounded-lg" disabled={id === leagueB}>
                          {selectedName(id)} ({leagues.find((l) => l.id === id)?.status ?? ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {rosterA.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>FPL Link Status:</span>
                        {missingManagers(rosterA).length === 0 ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" /> All managers linked
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {missingManagers(rosterA).length} missing FPL ID
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto no-scrollbar pt-1">
                        {rosterA.map((t) => (
                          <span key={t.id} className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-card border border-border/50 text-foreground truncate max-w-[140px]">
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* League B Card */}
                <div className="space-y-3 p-4 rounded-xl border border-border/60 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-primary uppercase tracking-wider">
                      Group B
                    </span>
                    {rosterB.length > 0 && (
                      <Badge className="text-[11px] font-medium border rounded-full px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                        {rosterB.length} Teams
                      </Badge>
                    )}
                  </div>
                  <Select value={leagueB} onValueChange={(v) => v && selectLeague("B", v)}>
                    <SelectTrigger className="w-full rounded-xl bg-card border-border/70 text-foreground h-10 px-3.5 hover:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all">
                      <SelectValue placeholder="Pick League B">{(val: string | null) => (val ? selectedName(val) : "Pick League B")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/70 bg-card/95 backdrop-blur-xl text-foreground shadow-2xl">
                      {pickableLeagues.map((id) => (
                        <SelectItem key={id} value={id} className="text-xs rounded-lg" disabled={id === leagueA}>
                          {selectedName(id)} ({leagues.find((l) => l.id === id)?.status ?? ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {rosterB.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>FPL Link Status:</span>
                        {missingManagers(rosterB).length === 0 ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" /> All managers linked
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {missingManagers(rosterB).length} missing FPL ID
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto no-scrollbar pt-1">
                        {rosterB.map((t) => (
                          <span key={t.id} className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-card border border-border/50 text-foreground truncate max-w-[140px]">
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column / Season Blueprint Card (4 Columns) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-6 sm:p-7 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">Season Blueprint</h3>
              </div>

              {/* Timeline Steps */}
              <div className="space-y-3.5 text-xs">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Group Stage ({totalGroupMds} Matchdays)</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      GW {safeStartGw} – GW {safeStartGw + totalGroupMds - 1} · Intra-group double round-robin &amp; cross-group matches.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-muted border border-border/60 flex items-center justify-center text-muted-foreground font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Mid-Season Bye Week</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      GW {safeStartGw + totalGroupMds} · Table finalization and tournament bracket seeding.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Two-Path Knockouts (9 Weeks)</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      GW {safeStartGw + totalGroupMds + 1} – GW {endGw} · Qualifiers, Eliminators &amp; Grand Final.
                    </p>
                  </div>
                </div>
              </div>

              {/* Season Duration & Validity Badge */}
              <div className="pt-2 border-t border-border/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total Duration:</span>
                  <span className="font-bold text-foreground tabular-nums">{totalWeeks} Gameweeks</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Season Horizon:</span>
                  <span className="font-bold tabular-nums text-foreground">Ends GW {endGw} / 38</span>
                </div>

                <div className="pt-1">
                  {isScheduleValid ? (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-medium">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>Fits within 38-GW season schedule</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Exceeds season (ends at GW {endGw})</span>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <motion.div whileTap={{ scale: 0.98 }} transition={{ type: "spring", bounce: 0, duration: 0.16 }}>
                <Button
                  onClick={createCompetition}
                  disabled={creating || !isScheduleValid}
                  className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-xs hover:shadow-md transition-shadow h-10 text-sm gap-2"
                >
                  {creating ? "Creating Tournament..." : "Create Tournament"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      ) : (
        /* Step 2: Schedule Generation & Import — Full-Width across 1440px */
        <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tournament Created</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">{name || "Untitled"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="text-xs font-medium border rounded-full px-3 py-1 bg-primary/10 text-emerald-800 dark:text-primary border-primary/25 tabular-nums">
                Starts GW {startGw}
              </Badge>
              <Badge className="text-xs font-medium border rounded-full px-3 py-1 bg-muted/60 text-muted-foreground border-border/50 tabular-nums">
                {compRoster.length || 20} Teams
              </Badge>
            </div>
          </div>

          {!mode && (
            <div className="grid gap-6 sm:grid-cols-2">
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", bounce: 0, duration: 0.16 }}
                onClick={generateFixtures}
                disabled={busy}
                className="group rounded-2xl border border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 p-6 sm:p-7 text-left transition-all disabled:opacity-50"
              >
                <div className="mb-2">
                  <p className="text-base font-semibold text-emerald-800 dark:text-primary tracking-tight">Generate Fixtures Automatically</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Recommended standard schedule</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                  Automatically builds the complete double round-robin, cross-group matches, and two-path knockout bracket based on rosters.
                </p>
              </motion.button>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", bounce: 0, duration: 0.16 }}
                onClick={() => setMode("import")}
                className="group rounded-2xl border border-border/70 bg-muted/30 hover:border-primary/40 hover:bg-muted/50 p-6 sm:p-7 text-left transition-all"
              >
                <div className="mb-2">
                  <p className="text-base font-semibold text-foreground tracking-tight">Paste Custom Fixture List</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Import your own schedule</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                  Import an existing custom fixture list with MD headers and team match lines (fuzzy team matching included).
                </p>
              </motion.button>
            </div>
          )}

          {mode === "generate" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                <p className="text-sm font-medium text-muted-foreground">
                  Preview Generated Schedule (<span className="tabular-nums font-semibold text-foreground">{preview?.length ?? 0}</span> fixtures across <span className="tabular-nums font-semibold text-foreground">{previewByGw.length}</span> gameweeks)
                </p>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <motion.div whileTap={{ scale: 0.96 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-border/70 text-foreground hover:bg-muted/60 h-8.5 px-4 text-xs font-medium"
                      onClick={() => setMode(null)}
                    >
                      Back
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.96 }}>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={saveFixtures}
                      className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-8.5 px-5 text-xs shadow-xs"
                    >
                      {busy ? "Saving Schedule..." : "Save & Open Tournament"}
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* 4-Column Full-Row Grid of Gameweeks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto pr-1">
                {previewByGw.map(([gw, rows]) => (
                  <div key={gw} className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Gameweek {gw}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums font-medium">{rows.length} matches</span>
                    </div>
                    <div className="space-y-1.5">
                      {rows.map((f) => (
                        <div key={`${f.tie_index}-${f.leg}`} className="flex items-center justify-between text-xs text-foreground p-1.5 rounded-lg bg-card/70 border border-border/40">
                          <span className="truncate pr-2 font-medium text-[11px]">
                            {teamName(f.home_team_id, [...rosterA, ...rosterB])}
                            <span className="text-muted-foreground font-normal"> v </span>
                            {teamName(f.away_team_id, [...rosterA, ...rosterB])}
                          </span>
                          <Badge className="text-[9px] border bg-muted/60 text-muted-foreground border-border/50 rounded-full px-1.5 py-0 shrink-0 font-normal">
                            {f.phase}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mode === "import" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                <p className="text-sm font-medium text-muted-foreground">
                  {resolution
                    ? "Resolve any unmatched teams, then save."
                    : "Paste your fixture list below."}
                </p>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <motion.div whileTap={{ scale: 0.96 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-border/70 text-foreground hover:bg-muted/60 h-8.5 px-4 text-xs font-medium"
                      onClick={() => setMode(null)}
                    >
                      Back
                    </Button>
                  </motion.div>
                  {!resolution ? (
                    <motion.div whileTap={{ scale: 0.96 }}>
                      <Button
                        size="sm"
                        disabled={busy || !importText.trim()}
                        onClick={resolveImport}
                        className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-8.5 px-5 text-xs shadow-xs"
                      >
                        {busy ? "Parsing..." : "Parse Schedule"}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div whileTap={{ scale: 0.96 }}>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={saveFixtures}
                        className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-8.5 px-5 text-xs shadow-xs"
                      >
                        {busy ? "Saving Schedule..." : "Save & Open Tournament"}
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>

              {!resolution && (
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={"MD1\nTeam A - Team B\nTeam C vs Team D\nMD2\n..."}
                  className="w-full h-72 rounded-2xl border border-border/70 bg-muted/30 p-4 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              )}

              {resolution && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[600px] overflow-y-auto pr-1">
                  {resolution.map((line, i) => {
                    const pick = picks[i] ?? { home: "", away: "" };
                    const homeResolved = matchId(line.homeMatch, pick.home);
                    const awayResolved = matchId(line.awayMatch, pick.away);
                    return (
                      <div key={i} className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between text-xs text-foreground">
                          <span className="text-[11px] font-semibold text-muted-foreground">MD{line.matchday}</span>
                          <span className="truncate px-2 font-medium">
                            {line.home}
                            <span className="text-muted-foreground font-normal"> vs </span>
                            {line.away}
                          </span>
                          <span className="text-xs">
                            {homeResolved && awayResolved ? (
                              <Badge className="text-[10px] font-medium border bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 rounded-full px-2 py-0.2">
                                Resolved
                              </Badge>
                            ) : (
                              <Badge className="text-[10px] font-medium border bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 rounded-full px-2 py-0.2">
                                Needs pick
                              </Badge>
                            )}
                          </span>
                        </div>
                        {(line.homeMatch.status === "ambiguous" || line.homeMatch.status === "none") && (
                          <Select
                            value={pick.home}
                            onValueChange={(v) => {
                              if (!v) return;
                              setPicks((p) => {
                                const prev = p[i] ?? { home: "", away: "" };
                                return { ...p, [i]: { ...prev, home: v } };
                              });
                            }}
                          >
                            <SelectTrigger className="w-full rounded-xl bg-card border-border/70 text-foreground h-8 text-xs">
                              <SelectValue placeholder={`Pick home team for "${line.home}"`} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/70 bg-card/95 backdrop-blur-xl text-foreground">
                              {[...compRoster].map((t) => (
                                <SelectItem key={t.id} value={t.id} className="text-xs">
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {(line.awayMatch.status === "ambiguous" || line.awayMatch.status === "none") && (
                          <Select
                            value={pick.away}
                            onValueChange={(v) => {
                              if (!v) return;
                              setPicks((p) => {
                                const prev = p[i] ?? { home: "", away: "" };
                                return { ...p, [i]: { ...prev, away: v } };
                              });
                            }}
                          >
                            <SelectTrigger className="w-full rounded-xl bg-card border-border/70 text-foreground h-8 text-xs">
                              <SelectValue placeholder={`Pick away team for "${line.away}"`} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/70 bg-card/95 backdrop-blur-xl text-foreground">
                              {[...compRoster].map((t) => (
                                <SelectItem key={t.id} value={t.id} className="text-xs">
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {saveError && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}
            </div>
          )}

          {mode === "import" && !resolution && saveError && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
