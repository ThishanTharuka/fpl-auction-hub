"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import type {
  CompetitionConfig,
  CompetitionFixtureRow,
  CompetitionRow,
  CompetitionTeamRow,
} from "@/lib/tournament/types";

const supabase = createSupabaseBrowserClient();

const DEFAULT_STATUS = { label: "Scheduled", cls: "bg-[#1e2b3b] text-[#849585] border-[#3b4b3d]" };

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-[#1e2b3b] text-[#849585] border-[#3b4b3d]" },
  scored: { label: "Scored", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
  manual: { label: "Manual", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
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
  const [scoring, setScoring] = useState(false);
  const [scoreMsg, setScoreMsg] = useState("");
  const [manualScores, setManualScores] = useState<Record<string, { home: string; away: string }>>({});

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
      setTeams((teamsRes.data ?? []) as CompetitionTeamRow[]);
      setFixtures((fixRes.data ?? []) as CompetitionFixtureRow[]);
      const availableGws = [...new Set((fixRes.data ?? []).map((f) => f.gw as number))].sort(
        (a, b) => a - b,
      );
      const maxGw = availableGws.length ? availableGws[availableGws.length - 1]! : 0;
      let gwToSelect = maxGw || (compRes.data.start_gw ?? 1);
      try {
        const gwRes = await fetch("/api/fpl/bootstrap")
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        const cg = (gwRes as { currentGameweek?: number } | null)?.currentGameweek;
        if (typeof cg === "number" && availableGws.length) {
          if (availableGws.includes(cg)) gwToSelect = cg;
          else {
            const next = availableGws.find((g) => g >= cg);
            gwToSelect = next ?? availableGws[availableGws.length - 1] ?? maxGw;
          }
        }
      } catch {}
      setScoreGw(gwToSelect);
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [user, id]);

  const teamName = (teamId: string | null) =>
    teams.find((t) => t.id === teamId)?.name ?? "TBD";

  const standings = useMemo(() => {
    if (!config) return [];
    return computeGroupStandings(teams, fixtures, config);
  }, [config, teams, fixtures]);

  const bracketSlots = useMemo(() => {
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
      setScoreMsg(`Scored ${data.scored} fixture(s). ${data.manual > 0 ? `${data.manual} need manual entry.` : ""}`);
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
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-4">
        <div className="h-8 w-64 rounded bg-[#1e2b3b] animate-pulse" />
        <div className="h-4 w-40 rounded bg-[#1e2b3b] animate-pulse" />
        <div className="h-64 rounded-lg bg-[#0f1c2c] border border-[#3b4b3d] animate-pulse" />
      </div>
    );
  }

  if (notFound || !competition) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center text-[#849585]">
        <p className="text-lg mb-2">Tournament not found.</p>
        <Button variant="outline" className="border-[#3b4b3d] text-[#849585]" onClick={() => router.push("/tournaments")}>
          Back to tournaments
        </Button>
      </div>
    );
  }

  const competitionStatus =
    STATUS_LABELS[competition.status] ?? { label: "Setup", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "fixtures", label: "Fixtures" },
    { key: "standings", label: "Standings" },
    { key: "bracket", label: "Bracket" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#d6e4f9]">{competition.name}</h1>
            <Badge className={`text-xs border ${competitionStatus.cls}`}>{competitionStatus.label}</Badge>
          </div>
          <p className="text-sm text-[#849585] mt-1">
            {teams.filter((t) => t.group_label === "A").length} teams in Group A ·{" "}
            {teams.filter((t) => t.group_label === "B").length} teams in Group B · starts GW
            {competition.start_gw}
          </p>
        </div>
        <a href={`/tournaments/${id}/public`} target="_blank" rel="noreferrer">
          <Button size="sm" className="bg-[#132030] border border-[#00e478]/40 text-[#00e478] hover:bg-[#1e2b3b]">
            View public
          </Button>
        </a>
      </div>

      <div className="flex gap-1 border-b border-[#3b4b3d]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-[#00e478] text-[#00e478]"
                : "border-transparent text-[#849585] hover:text-[#d6e4f9]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "fixtures" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5 space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label className="text-xs text-[#849585]">Gameweek</label>
                <Select value={String(scoreGw)} onValueChange={(v) => v && setScoreGw(parseInt(v, 10))}>
                  <SelectTrigger className="bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9]">
                    {fixturesByGw.map(([gw]) => (
                      <SelectItem key={gw} value={String(gw)} className="text-xs">
                        GW{gw}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={autoScore}
                disabled={scoring || gwFixtures.length === 0}
                className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-semibold"
              >
                {scoring ? "Scoring..." : `Auto-score GW${scoreGw}`}
              </Button>
              {scoreMsg && <p className="text-sm text-[#849585] flex-1">{scoreMsg}</p>}
            </div>

            <div className="grid gap-2">
              {gwFixtures.map((f) => {
                const label = statusInfo(f.status);
                const manual = manualScores[f.id];
                return (
                  <div
                    key={f.id}
                    className="rounded-lg border border-[#3b4b3d] bg-[#132030] p-3 flex flex-wrap items-center gap-3"
                  >
                    <span className="text-xs text-[#849585] w-24">
                      {f.stage === "group" ? "Group" : f.phase}
                    </span>
                    <span className="flex-1 min-w-[180px] text-sm text-[#d6e4f9] truncate">
                      {teamName(f.home_team_id)}
                      <span className="text-[#849585]"> vs </span>
                      {teamName(f.away_team_id)}
                    </span>
                    {f.status === "scored" && (
                      <span className="text-sm text-[#d6e4f9]">
                        <b className="text-[#00e478]">{f.home_points}</b>
                        <span className="text-[#849585]"> – </span>
                        <b className="text-[#00e478]">{f.away_points}</b>
                      </span>
                    )}
                    <Badge className={`text-[10px] border ${label.cls}`}>{label.label}</Badge>
                    {f.status !== "scored" && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Home"
                          value={manual?.home ?? ""}
                          onChange={(e) =>
                            setManualScores((m) => ({ ...m, [f.id]: { home: e.target.value, away: m[f.id]?.away ?? "" } }))
                          }
                          className="w-20 h-8 bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9] text-xs"
                        />
                        <Input
                          type="number"
                          placeholder="Away"
                          value={manual?.away ?? ""}
                          onChange={(e) =>
                            setManualScores((m) => ({ ...m, [f.id]: { home: m[f.id]?.home ?? "", away: e.target.value } }))
                          }
                          className="w-20 h-8 bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9] text-xs"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {gwFixtures.length === 0 && (
                <p className="text-sm text-[#849585]">No fixtures scheduled for this gameweek.</p>
              )}
            </div>

            {Object.keys(manualScores).length > 0 && (
              <Button
                onClick={saveManualScores}
                disabled={scoring}
                variant="outline"
                className="border-[#00e478]/40 text-[#00e478] hover:bg-[#1e2b3b]"
              >
                {scoring ? "Saving..." : "Save manual scores"}
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {fixturesByGw.map(([gw, rows]) => (
              <div key={gw} className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-3">
                <button
                  className="text-sm font-semibold text-[#d6e4f9] mb-2 flex items-center gap-2"
                  onClick={() => setScoreGw(gw)}
                >
                  Gameweek {gw}
                  <span className="text-xs text-[#849585] font-normal">
                    {rows.filter((f) => f.status === "scored").length}/{rows.length} scored
                  </span>
                </button>
                <div className="space-y-1">
                  {rows.map((f) => (
                    <div key={f.id} className="flex items-center justify-between text-sm text-[#d6e4f9]">
                      <span className="truncate">
                        {teamName(f.home_team_id)}
                        <span className="text-[#849585]"> vs </span>
                        {teamName(f.away_team_id)}
                      </span>
                      <span className="text-xs text-[#849585]">
                        {f.status === "scored" ? `${f.home_points}–${f.away_points}` : f.phase}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "standings" && (
        <div className="space-y-6">
          {(["A", "B"] as const).map((g) => (
            <div key={g} className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#3b4b3d] flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[#d6e4f9]">Group {g}</span>
                <span className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1.5 text-[#849585]">
                    <span className="h-2 w-2 rounded-full bg-[#00e478]" /> Qualifiers (1-4)
                  </span>
                  <span className="flex items-center gap-1.5 text-[#849585]">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Eliminators (5-8)
                  </span>
                  <span className="flex items-center gap-1.5 text-[#849585]">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Out (9-10)
                  </span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-[#849585] text-left border-b border-[#3b4b3d]">
                      <th className="px-4 py-2 font-normal">#</th>
                      <th className="px-2 py-2 font-normal">Team</th>
                      <th className="px-2 py-2 font-normal text-center">P</th>
                      <th className="px-2 py-2 font-normal text-center">W</th>
                      <th className="px-2 py-2 font-normal text-center">D</th>
                      <th className="px-2 py-2 font-normal text-center">L</th>
                      <th className="px-2 py-2 font-normal text-center">SD</th>
                      <th className="px-2 py-2 font-normal text-center">PS</th>
                      <th className="px-2 py-2 font-normal text-center">PC</th>
                      <th className="px-4 py-2 font-normal text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings
                      .filter((s) => s.group === g)
                      .map((s, i) => {
                        const zoneBg =
                          i < 4 ? "bg-[#00e478]" : i < 8 ? "bg-amber-500" : "bg-red-500";
                        const team = teams.find((t) => t.id === s.teamId);
                        return (
                          <tr key={s.teamId} className="border-b border-[#3b4b3d]/50 text-[#d6e4f9]">
                            <td className="px-4 py-2 text-[#849585] relative">
                              <span
                                aria-hidden
                                className={`pointer-events-none absolute left-0 top-[1px] bottom-[1px] w-[3px] ${zoneBg}`}
                                style={{
                                  clipPath: "polygon(0 0, 100% 14%, 100% 86%, 0 100%)",
                                }}
                              />
                              {i + 1}
                            </td>
                            <td className="px-2 py-2">
                              <span className="flex items-center gap-2 min-w-0">
                                <TeamAvatar
                                  name={s.name}
                                  src={team?.avatar_url ?? null}
                                  color={team?.color ?? null}
                                  size="sm"
                                />
                                <span className="truncate max-w-[220px]">{s.name}</span>
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center text-[#849585]">{s.played}</td>
                            <td className="px-2 py-2 text-center">{s.won}</td>
                            <td className="px-2 py-2 text-center">{s.drawn}</td>
                            <td className="px-2 py-2 text-center">{s.lost}</td>
                            <td className="px-2 py-2 text-center">
                              {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                            </td>
                            <td className="px-2 py-2 text-center">{s.pointsFor}</td>
                            <td className="px-2 py-2 text-center">{s.pointsAgainst}</td>
                            <td className="px-4 py-2 text-right font-semibold text-[#00e478]">{s.points}</td>
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
        <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5 space-y-2">
          <p className="text-sm text-[#849585] mb-2">
            Two-path knockout. Group positions seed the Quarter-finals; bracket updates as
            gameweeks are scored.
          </p>
          {bracketSlots.map((slot, i) => (
            <div
              key={`${slot.phase}-${i}`}
              className="flex items-center justify-between rounded-lg border border-[#3b4b3d] bg-[#132030] px-4 py-2"
            >
              <span className="text-xs text-[#849585] w-24 uppercase">{slot.phase}</span>
              <span className="flex-1 text-sm text-[#d6e4f9] truncate">
                {teamName(slot.homeTeamId)}
                <span className="text-[#849585]"> vs </span>
                {teamName(slot.awayTeamId)}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-lg space-y-6">
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5 space-y-3">
            <p className="text-sm font-semibold text-[#d6e4f9]">Rename tournament</p>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-[#132030] border-[#3b4b3d] text-[#d6e4f9]"
              />
              <Button
                onClick={rename}
                disabled={savingName || !newName.trim()}
                className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-semibold"
              >
                {savingName ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5 space-y-3">
            <p className="text-sm font-semibold text-[#d6e4f9]">Refresh manager links</p>
            <p className="text-xs text-[#849585]">
              Re-sync fpl_manager_id from the source league participants for all {teams.length} teams.
            </p>
            <Button
              onClick={refreshManagers}
              disabled={refreshingManagers}
              variant="outline"
              className="border-[#3b4b3d] text-[#d6e4f9] hover:bg-[#132030]"
            >
              {refreshingManagers ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          <div className="rounded-lg border border-red-500/30 bg-[#0f1c2c] p-5 space-y-3">
            <p className="text-sm font-semibold text-red-400">Delete tournament</p>
            <p className="text-xs text-[#849585]">
              Removes the tournament, its team snapshot, and all fixtures. Source leagues are untouched.
            </p>
            {confirmDelete ? (
              <div className="flex gap-2">
                <Button onClick={remove} className="bg-red-500 text-white hover:bg-red-400 font-semibold">
                  Confirm delete
                </Button>
                <Button variant="outline" className="border-[#3b4b3d] text-[#849585]" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setConfirmDelete(true)}
                variant="outline"
                className="border-red-500/40 text-red-400 hover:bg-red-500/10"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}