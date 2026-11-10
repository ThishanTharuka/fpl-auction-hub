"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";
import { computeGroupStandings } from "@/lib/tournament/standings";
import { computeTieOutcomes, resolveKnockoutPlacement } from "@/lib/tournament/knockout";
import { buildTwoPathBracket } from "@/lib/tournament/knockout-two-path";
import { TeamAvatar } from "@/components/team-avatar";
import { StandingsExport } from "@/components/standings-export";
import { TournamentBracket } from "@/components/tournament-bracket";
import { TournamentFixtures } from "@/components/tournament-fixtures";
import {
  FixtureChipBadges,
  ScoreOverrideButton,
  ScoreOverridePanel,
} from "@/components/tournament-score-editor";
import type { FixtureChipNotes } from "@/lib/tournament/chips";
import type {
  CompetitionConfig,
  CompetitionFixtureRow,
  CompetitionRow,
  CompetitionTeamRow,
} from "@/lib/tournament/types";

const supabase = createSupabaseBrowserClient();

const DEFAULT_STATUS = { label: "Scheduled", cls: "bg-muted text-muted-foreground border-border/60" };

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-muted text-muted-foreground border-border/60" },
  scored: { label: "Scored", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  manual: { label: "Manual", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
};

function statusInfo(status: string) {
  return STATUS_LABELS[status] ?? DEFAULT_STATUS;
}

export default function TournamentAdminPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { user } = useAuth();

  const [competition, setCompetition] = useState<CompetitionRow | null>(null);
  const [teams, setTeams] = useState<CompetitionTeamRow[]>([]);
  const [fixtures, setFixtures] = useState<CompetitionFixtureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [tab, setTab] = useState<"fixtures" | "standings" | "bracket" | "settings">("fixtures");
  const [scoreGw, setScoreGw] = useState(0);
  const [liveGameweek, setLiveGameweek] = useState<number | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreMsg, setScoreMsg] = useState("");
  const [manualScores, setManualScores] = useState<Record<string, { home: string; away: string }>>({});
  const [editingOverrideId, setEditingOverrideId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [refreshingManagers, setRefreshingManagers] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const config = useMemo(
    () => (competition ? (competition.format_config as unknown as CompetitionConfig) : null),
    [competition],
  );

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const [compRes, teamsRes, fixRes] = await Promise.all([
        supabase.from("competitions").select("*").eq("id", id).single(),
        supabase.from("competition_teams").select("*").eq("competition_id", id),
        supabase.from("competition_fixtures").select("*").eq("competition_id", id).order("gw"),
      ]);
      if (!compRes.data || compRes.error) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCompetition(compRes.data as CompetitionRow);
      setNewName(compRes.data.name);
      const loadedTeams = (teamsRes.data ?? []) as CompetitionTeamRow[];
      setFixtures((fixRes.data ?? []) as CompetitionFixtureRow[]);

      // The snapshot stores avatars only at creation, so overlay current
      // participant avatars to keep logos in sync on screen and in exports.
      const participantIds = loadedTeams.map((t) => t.participant_id).filter(Boolean);
      const participantAvatars = new Map<
        string,
        { avatar_url: string | null; color: string | null }
      >();
      if (participantIds.length > 0) {
        const { data } = await supabase
          .from("participants")
          .select("id,avatar_url,color")
          .in("id", participantIds);
        for (const p of data ?? []) {
          participantAvatars.set(p.id, { avatar_url: p.avatar_url, color: p.color });
        }
      }
      setTeams(
        loadedTeams.map((t) => {
          const live = participantAvatars.get(t.participant_id);
          if (!live) return t;
          return {
            ...t,
            avatar_url: live.avatar_url ?? t.avatar_url,
            color: live.color ?? t.color,
          };
        }),
      );
      const availableGws = [...new Set((fixRes.data ?? []).map((f) => f.gw as number))].sort(
        (a, b) => a - b,
      );
      const maxGw = availableGws.length ? availableGws[availableGws.length - 1]! : 0;
      let gwToSelect = maxGw || (compRes.data.start_gw ?? 1);
      try {
        const gwRes = await fetch("/api/fpl/gameweek")
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        const cg = (gwRes as { currentGameweek?: number; liveGameweek?: number | null } | null)?.currentGameweek;
        const lg = (gwRes as { currentGameweek?: number; liveGameweek?: number | null } | null)?.liveGameweek ?? cg ?? null;
        if (typeof lg === "number") setLiveGameweek(lg);
        const targetGw = lg ?? cg;
        if (typeof targetGw === "number" && availableGws.length) {
          if (availableGws.includes(targetGw)) {
            gwToSelect = targetGw;
          } else {
            const next = availableGws.find((g) => g >= targetGw);
            gwToSelect = next ?? availableGws[availableGws.length - 1] ?? maxGw;
          }
        }
      } catch {}
      setScoreGw(gwToSelect);
      setLoading(false);

      // Automatic background sync check if gameweek scores are due
      if (typeof gwToSelect === "number" && id) {
        fetch(`/api/tournaments/${id}/score`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gw: gwToSelect, checkOnly: true }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.scored > 0) {
              supabase
                .from("competition_fixtures")
                .select("*")
                .eq("competition_id", id)
                .order("gw")
                .then((r) => {
                  if (r.data) setFixtures(r.data as CompetitionFixtureRow[]);
                });
            }
          })
          .catch(() => null);
      }
    })().catch(() => setLoading(false));
  }, [user, id]);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const teamName = useCallback(
    (teamId: string | null) => (teamId ? teamById.get(teamId)?.name ?? "TBD" : "TBD"),
    [teamById],
  );

  const fixtureGroupLabel = useCallback(
    (f: CompetitionFixtureRow) => {
      if (f.stage === "group") {
        const hGroup = f.home_team_id ? teamById.get(f.home_team_id)?.group_label : null;
        const aGroup = f.away_team_id ? teamById.get(f.away_team_id)?.group_label : null;
        if (hGroup && aGroup) {
          return hGroup === aGroup ? `Group ${hGroup}` : "Group A vs B";
        }
        if (hGroup) return `Group ${hGroup}`;
        if (aGroup) return `Group ${aGroup}`;
        return "Group";
      }
      return f.phase;
    },
    [teamById],
  );

  const standings = useMemo(() => {
    if (!config) return [];
    return computeGroupStandings(teams, fixtures, config);
  }, [config, teams, fixtures]);

  const _bracketSlots = useMemo(() => {
    if (!config || config.knockout.template !== "two_path_v1") return [];
    const outcomes = computeTieOutcomes(fixtures);
    const qualifiers = config.qualification.qualifiers_per_group;
    const seeds = [
      {
        group: "A" as const,
        teamIds: standings.filter((s) => s.group === "A").slice(0, qualifiers).map((s) => s.teamId),
      },
      {
        group: "B" as const,
        teamIds: standings.filter((s) => s.group === "B").slice(0, qualifiers).map((s) => s.teamId),
      },
    ];
    return resolveKnockoutPlacement(buildTwoPathBracket(), outcomes, seeds);
  }, [config, fixtures, standings]);

  const fixturesByGw = useMemo(() => {
    const map = new Map<number, CompetitionFixtureRow[]>();
    for (const f of fixtures) {
      const arr = map.get(f.gw) ?? [];
      arr.push(f);
      map.set(f.gw, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [fixtures]);

  const gwFixtures = useMemo(
    () => fixtures.filter((f) => f.gw === scoreGw),
    [fixtures, scoreGw],
  );
  const _gwPending = useMemo(
    () => gwFixtures.filter((f) => f.status !== "scored"),
    [gwFixtures],
  );

  async function autoScore() {
    if (!id) return;
    setScoring(true);
    setScoreMsg("");
    try {
      const res = await fetch(`/api/tournaments/${id}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gw: scoreGw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScoreMsg(data.error ?? "Scoring failed.");
        return;
      }
      const reasons = Object.values(
        (data.manualReasons ?? {}) as Record<string, string>,
      );
      setScoreMsg(
        `Scored ${data.scored} fixture(s). ${data.manual > 0 ? `${data.manual} need manual entry.` : ""}${reasons.length > 0 ? ` ${reasons[0]}` : ""}`,
      );
      await reloadData();
    } finally {
      setScoring(false);
    }
  }

  async function saveManualScores() {
    if (!id) return;
    const entries = Object.entries(manualScores)
      .map(([fixtureId, v]) => ({
        fixtureId,
        homePoints: parseInt(v.home, 10),
        awayPoints: parseInt(v.away, 10),
      }))
      .filter((e) => Number.isInteger(e.homePoints) && Number.isInteger(e.awayPoints));
    if (entries.length === 0) {
      setScoreMsg("Enter both FPL point totals before saving.");
      return;
    }
    setScoring(true);
    setScoreMsg("");
    try {
      const res = await fetch(`/api/tournaments/${id}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gw: scoreGw, manualScores: entries }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScoreMsg(data.error ?? "Saving manual scores failed.");
        return;
      }
      setManualScores({});
      setScoreMsg(`Saved ${entries.length} manual score(s).`);
      await reloadData();
    } finally {
      setScoring(false);
    }
  }

  async function reloadData() {
    const [compRes, fixRes] = await Promise.all([
      supabase.from("competitions").select("*").eq("id", id).single(),
      supabase.from("competition_fixtures").select("*").eq("competition_id", id).order("gw"),
    ]);
    if (compRes.data) {
      setCompetition(compRes.data as CompetitionRow);
      setNewName(compRes.data.name);
    }
    setFixtures((fixRes.data ?? []) as CompetitionFixtureRow[]);
  }

  /** Applies a locally-updated fixture after an override save/clear. */
  const handleOverrideSaved = useCallback((updated: CompetitionFixtureRow) => {
    setFixtures((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setEditingOverrideId(null);
    setScoreMsg("Score override saved.");
  }, []);

  async function rename() {
    if (!id || !newName.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/tournaments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setScoreMsg(data.error ?? "Rename failed.");
      else setScoreMsg("Tournament renamed.");
    } finally {
      setSavingName(false);
    }
  }

  async function refreshManagers() {
    if (!id) return;
    setRefreshingManagers(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/managers`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setScoreMsg(data.error ?? "Refresh failed.");
      else setScoreMsg(`Refreshed ${data.refreshed ?? 0} manager link(s).`);
      await reloadData();
    } finally {
      setRefreshingManagers(false);
    }
  }

  async function remove() {
    if (!id || !confirmDelete) return;
    const res = await fetch(`/api/tournaments/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/tournaments");
    else {
      const data = await res.json().catch(() => ({}));
      setScoreMsg(data.error ?? "Delete failed.");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        <div className="h-8 w-64 rounded-xl bg-muted animate-pulse" />
        <div className="h-4 w-40 rounded-lg bg-muted/60 animate-pulse" />
        <div className="h-64 rounded-2xl bg-card border border-border/60 animate-pulse" />
      </div>
    );
  }

  if (notFound || !competition) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center text-muted-foreground">
        <p className="text-lg font-semibold text-foreground mb-2">Tournament not found.</p>
        <Button
          variant="outline"
          className="rounded-full border-border/80 text-foreground hover:bg-muted/70"
          onClick={() => router.push("/tournaments")}
        >
          Back to tournaments
        </Button>
      </div>
    );
  }

  const competitionStatus =
    STATUS_LABELS[competition.status] ?? { label: "Setup", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" };

  const gameweekLabel = liveGameweek
    ? `Live GW${liveGameweek}`
    : scoreGw
      ? `GW${scoreGw}`
      : `Starts GW${competition.start_gw}`;

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "fixtures", label: "Fixtures" },
    { key: "standings", label: "Standings" },
    { key: "bracket", label: "Bracket" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
              {competition.name}
            </h1>
            <Badge className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${competitionStatus.cls}`}>
              {competitionStatus.label}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            <span className="tabular-nums font-medium text-foreground/80">{teams.filter((t) => t.group_label === "A").length}</span> teams in Group A ·{" "}
            <span className="tabular-nums font-medium text-foreground/80">{teams.filter((t) => t.group_label === "B").length}</span> teams in Group B · starts GW
            <span className="tabular-nums font-semibold text-foreground/90">{competition.start_gw}</span>
          </p>
        </div>
        <a href={`/tournaments/${id}/public`} target="_blank" rel="noreferrer" className="shrink-0 self-end sm:self-auto">
          <motion.div whileTap={{ scale: 0.96 }}>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-border/80 text-foreground hover:bg-muted/70 flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium"
            >
              <span>View public</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </Button>
          </motion.div>
        </a>
      </div>

      {/* Tab strip — Apple Segmented Capsule Rail */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/50 backdrop-blur-md overflow-x-auto no-scrollbar max-w-full">
          {tabs.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`relative px-4 py-1.5 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 shrink-0 ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="admin-tournament-active-tab"
                    transition={{ type: "spring", bounce: 0, duration: 0.26 }}
                    className="absolute inset-0 rounded-full bg-primary shadow-xs"
                  />
                )}
                <span className="relative z-10">{t.label}</span>
              </button>
            );
          })}
        </div>
        {tab === "standings" && (
          <div className="shrink-0 self-end sm:self-auto">
            <StandingsExport
              competitionName={competition.name}
              gameweekLabel={gameweekLabel}
              standings={standings}
              teams={teams}
            />
          </div>
        )}
      </div>

      {tab === "fixtures" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-5 sm:p-6 space-y-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Gameweek
                  </label>
                  <Select value={String(scoreGw)} onValueChange={(v) => v && setScoreGw(parseInt(v, 10))}>
                    <SelectTrigger className="rounded-xl bg-muted/40 border-border/70 text-foreground h-9 min-w-[100px] px-3 focus:ring-2 focus:ring-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/70 bg-card/95 backdrop-blur-xl text-foreground shadow-2xl">
                      {fixturesByGw.map(([gw]) => (
                        <SelectItem key={gw} value={String(gw)} className="text-xs rounded-lg">
                          <span className="flex items-center gap-2">
                            <span>GW{gw}</span>
                            {gw === liveGameweek && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-primary/15 text-emerald-800 dark:text-primary border border-primary/30">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-slow shadow-[0_0_6px_rgba(0,228,120,0.8)]" />
                                Live
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <motion.div whileTap={{ scale: 0.96 }}>
                  <Button
                    onClick={autoScore}
                    disabled={scoring || gwFixtures.length === 0}
                    className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-4 h-9 shadow-xs"
                  >
                    {scoring ? "Scoring..." : `Auto-score GW${scoreGw}`}
                  </Button>
                </motion.div>
                {scoreMsg && <p className="text-xs text-muted-foreground font-medium pb-1.5">{scoreMsg}</p>}
              </div>

              {scoreGw === liveGameweek && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-emerald-800 dark:text-primary border border-primary/30 shadow-xs self-start sm:self-center ml-auto">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse-slow shadow-[0_0_8px_rgba(0,228,120,0.8)]" />
                  Live Matchday
                </span>
              )}
            </div>

            {gwFixtures.some((f) => f.chip_notes) && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Chips are not allowed in the league phase
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300/80 leading-relaxed">
                  Scores below already exclude the chip effect. Use &quot;Edit score&quot; to pin a
                  different result if the league decides otherwise.
                </p>
              </div>
            )}

            <div className="grid gap-2.5">
              {gwFixtures.map((f) => {
                const label = statusInfo(f.status);
                const chipNotes = (f.chip_notes ?? null) as unknown as FixtureChipNotes | null;
                const manual = manualScores[f.id];
                const hTeam = f.home_team_id ? teamById.get(f.home_team_id) : null;
                const aTeam = f.away_team_id ? teamById.get(f.away_team_id) : null;
                const hName = teamName(f.home_team_id);
                const aName = teamName(f.away_team_id);

                return (
                  <div key={f.id} className="space-y-2">
                    <div className="rounded-xl border border-border/60 bg-muted/30 hover:border-primary/30 p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 transition-colors">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-muted/60 text-muted-foreground border border-border/50 shrink-0">
                        {fixtureGroupLabel(f)}
                      </span>

                      <div className="flex-1 min-w-[240px] flex items-center gap-3 text-xs sm:text-sm text-foreground">
                        <span className="inline-flex items-center gap-2 min-w-0 font-medium">
                          <TeamAvatar
                            name={hName}
                            src={hTeam?.avatar_url ?? null}
                            color={hTeam?.color ?? null}
                            size="sm"
                          />
                          <span className="truncate">{hName}</span>
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0 font-normal">vs</span>
                        <span className="inline-flex items-center gap-2 min-w-0 font-medium">
                          <TeamAvatar
                            name={aName}
                            src={aTeam?.avatar_url ?? null}
                            color={aTeam?.color ?? null}
                            size="sm"
                          />
                          <span className="truncate">{aName}</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2.5 min-w-0">
                        {f.status === "scored" && (
                          <span className="text-xs sm:text-sm text-foreground tabular-nums font-bold px-2.5 py-1 rounded-lg bg-card border border-border/70 shadow-xs">
                            <span className="text-emerald-700 dark:text-primary">{f.home_points}</span>
                            <span className="text-muted-foreground mx-1.5">–</span>
                            <span className="text-emerald-700 dark:text-primary">{f.away_points}</span>
                          </span>
                        )}
                        <FixtureChipBadges notes={chipNotes} />
                        <Badge className={`text-[10px] font-medium border rounded-full px-2 py-0.2 ${label.cls}`}>{label.label}</Badge>
                        {f.status !== "scored" && (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              placeholder="Home"
                              value={manual?.home ?? ""}
                              onChange={(e) =>
                                setManualScores((m) => ({ ...m, [f.id]: { home: e.target.value, away: m[f.id]?.away ?? "" } }))
                              }
                              className="w-16 h-8 rounded-lg bg-card border-border/70 text-foreground text-xs text-center font-bold tabular-nums"
                            />
                            <Input
                              type="number"
                              placeholder="Away"
                              value={manual?.away ?? ""}
                              onChange={(e) =>
                                setManualScores((m) => ({ ...m, [f.id]: { home: m[f.id]?.home ?? "", away: e.target.value } }))
                              }
                              className="w-16 h-8 rounded-lg bg-card border-border/70 text-foreground text-xs text-center font-bold tabular-nums"
                            />
                          </div>
                        )}
                        {f.status === "scored" && (
                          <ScoreOverrideButton
                            fixture={f}
                            onEdit={() => setEditingOverrideId(f.id)}
                          />
                        )}
                      </div>
                    </div>

                    {editingOverrideId === f.id && (
                      <ScoreOverridePanel
                        competitionId={id}
                        fixture={f}
                        homeName={hName}
                        awayName={aName}
                        onSaved={handleOverrideSaved}
                        onCancel={() => setEditingOverrideId(null)}
                        onError={setScoreMsg}
                      />
                    )}
                  </div>
                );
              })}
              {gwFixtures.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No fixtures scheduled for this gameweek.</p>
              )}
            </div>

            {Object.keys(manualScores).length > 0 && (
              <motion.div whileTap={{ scale: 0.96 }}>
                <Button
                  onClick={saveManualScores}
                  disabled={scoring}
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-4 h-9 shadow-xs"
                >
                  {scoring ? "Saving..." : "Save manual scores"}
                </Button>
              </motion.div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              All Matchdays
            </h3>
            <TournamentFixtures
              fixtures={fixtures}
              teams={teams}
              liveGameweek={liveGameweek}
              currentGameweek={scoreGw || liveGameweek}
              onSelectGw={(gw) => setScoreGw(gw)}
              activeAdminGw={scoreGw}
            />
          </div>
        </div>
      )}

      {tab === "standings" && (
        <div className="space-y-6">
          {(["A", "B"] as const).map((g) => (
            <div key={g} className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-border/60 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-sm font-semibold tracking-tight text-foreground">Group {g}</span>
                <span className="flex items-center gap-3.5 text-[11px] flex-wrap">
                  <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs" /> Qualifiers (1-4)
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                    <span className="h-2 w-2 rounded-full bg-amber-500 shadow-xs" /> Eliminators (5-8)
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-rose-700 dark:text-rose-400">
                    <span className="h-2 w-2 rounded-full bg-rose-500 shadow-xs" /> Out (9-10)
                  </span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-left border-b border-border/50">
                      <th className="px-4 py-2.5 font-semibold">#</th>
                      <th className="px-3 py-2.5 font-semibold">Team</th>
                      <th className="px-2.5 py-2.5 font-semibold text-center">P</th>
                      <th className="px-2.5 py-2.5 font-semibold text-center">W</th>
                      <th className="px-2.5 py-2.5 font-semibold text-center">D</th>
                      <th className="px-2.5 py-2.5 font-semibold text-center">L</th>
                      <th className="px-2.5 py-2.5 font-semibold text-center">SD</th>
                      <th className="px-2.5 py-2.5 font-semibold text-center">PS</th>
                      <th className="px-2.5 py-2.5 font-semibold text-center">PC</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings
                      .filter((s) => s.group === g)
                      .map((s, i) => {
                        const zoneBg =
                          i < 4 ? "bg-emerald-500" : i < 8 ? "bg-amber-500" : "bg-rose-500";
                        const team = teams.find((t) => t.id === s.teamId);
                        return (
                          <tr key={s.teamId} className="border-b border-border/40 hover:bg-muted/30 transition-colors text-foreground">
                            <td className="px-4 py-2.5 text-muted-foreground relative tabular-nums font-medium">
                              <span
                                aria-hidden
                                className={`pointer-events-none absolute left-0 top-[2px] bottom-[2px] w-[3px] rounded-r ${zoneBg}`}
                              />
                              {i + 1}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="flex items-center gap-2.5 min-w-0">
                                <TeamAvatar
                                  name={s.name}
                                  src={team?.avatar_url ?? null}
                                  color={team?.color ?? null}
                                  size="sm"
                                />
                                <span className="truncate max-w-[220px] font-medium">{s.name}</span>
                              </span>
                            </td>
                            <td className="px-2.5 py-2.5 text-center text-muted-foreground tabular-nums">{s.played}</td>
                            <td className="px-2.5 py-2.5 text-center tabular-nums">{s.won}</td>
                            <td className="px-2.5 py-2.5 text-center tabular-nums">{s.drawn}</td>
                            <td className="px-2.5 py-2.5 text-center tabular-nums">{s.lost}</td>
                            <td className="px-2.5 py-2.5 text-center tabular-nums font-medium">
                              {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                            </td>
                            <td className="px-2.5 py-2.5 text-center tabular-nums">{s.pointsFor}</td>
                            <td className="px-2.5 py-2.5 text-center tabular-nums">{s.pointsAgainst}</td>
                            <td className="px-4 py-2.5 text-right font-bold tabular-nums text-emerald-700 dark:text-primary">
                              {s.points}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "bracket" && (
        <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-4 sm:p-6 shadow-sm overflow-x-auto">
          <TournamentBracket teams={teams} fixtures={fixtures} />
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-xl space-y-6">
          <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-5 sm:p-6 space-y-3.5 shadow-sm">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">Rename Tournament</p>
              <p className="text-xs text-muted-foreground mt-0.5">Change the display name of this tournament.</p>
            </div>
            <div className="flex gap-2.5">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="rounded-xl bg-muted/40 border-border/70 text-foreground h-10 px-3.5 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
              <motion.div whileTap={{ scale: 0.96 }}>
                <Button
                  onClick={rename}
                  disabled={savingName || !newName.trim()}
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-10 px-5 shadow-xs"
                >
                  {savingName ? "Saving..." : "Save"}
                </Button>
              </motion.div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-5 sm:p-6 space-y-3.5 shadow-sm">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">Refresh Manager Links</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Re-sync fpl_manager_id from the source league participants for all {teams.length} teams.
              </p>
            </div>
            <motion.div whileTap={{ scale: 0.96 }}>
              <Button
                onClick={refreshManagers}
                disabled={refreshingManagers}
                variant="outline"
                className="rounded-full border-border/80 text-foreground hover:bg-muted/70 h-9 px-4 text-xs font-semibold gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshingManagers ? "animate-spin" : ""}`} />
                <span>{refreshingManagers ? "Refreshing..." : "Refresh Links"}</span>
              </Button>
            </motion.div>
          </div>

          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:p-6 space-y-3.5">
            <div>
              <p className="text-sm font-semibold tracking-tight text-destructive">Delete Tournament</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Removes the tournament, its team snapshot, and all fixtures. Source leagues are completely untouched.
              </p>
            </div>
            {confirmDelete ? (
              <div className="flex gap-2.5">
                <motion.div whileTap={{ scale: 0.96 }}>
                  <Button
                    onClick={remove}
                    className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold h-9 px-4 text-xs shadow-xs"
                  >
                    Confirm delete
                  </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.96 }}>
                  <Button
                    variant="outline"
                    className="rounded-full border-border/80 text-muted-foreground hover:bg-muted/70 h-9 px-4 text-xs"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </motion.div>
              </div>
            ) : (
              <motion.div whileTap={{ scale: 0.96 }}>
                <Button
                  onClick={() => setConfirmDelete(true)}
                  variant="outline"
                  className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 h-9 px-4 text-xs font-semibold gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Tournament</span>
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
