"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";
import { DEFAULT_FORMAT_CONFIG } from "@/lib/tournament/types";
import type { FixtureDraft } from "@/lib/tournament/types";
import type { TeamMatch } from "@/lib/tournament/parser";
import { buildKnockoutFixtures } from "@/lib/tournament/schedule";
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
      const [leagueRes, bootstrapRes] = await Promise.all([
        supabase.from("leagues").select("id,name,status").eq("created_by", user.id).order("name"),
        fetch("/api/fpl/bootstrap").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      setLeagues((leagueRes.data ?? []) as LeagueOption[]);
      const gw = (bootstrapRes as { currentGameweek?: number } | null)?.currentGameweek;
      if (typeof gw === "number" && gw > 0) setStartGw(gw);
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

  async function createCompetition() {
    setError("");
    if (!name.trim()) return setError("Give the tournament a name.");
    if (!leagueA || !leagueB || leagueA === leagueB) return setError("Pick two different leagues.");
    if (!Number.isInteger(startGw) || startGw < 1) return setError("Enter a starting gameweek.");
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
      const drafts = resolution.map((line, i) => {
        const pick = picks[i];
        const homeId = matchId(line.homeMatch, pick?.home);
        const awayId = matchId(line.awayMatch, pick?.away);
        return {
          competition_id: competitionId,
          stage: "group" as const,
          phase: "import",
          tie_index: i + 1,
          leg: 1,
          gw: line.matchday,
          home_team_id: homeId,
          away_team_id: awayId,
        };
      });
      if (drafts.some((d) => d.home_team_id === null || d.away_team_id === null)) {
        return setSaveError("Resolve every team before saving (pick from the dropdowns).");
      }
      // Append KO fixtures (bye GW after group stage, then GW30-38 bracket).
      const bracket = buildTwoPathBracket();
      const koStartGw = startGw + 29; // 28 group GWs + 1 bye
      const koDrafts = buildKnockoutFixtures(competitionId, bracket, koStartGw, drafts.length + 1);
      const allDrafts = [...drafts, ...koDrafts];
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
      const arr = map.get(f.gw) ?? [];
      arr.push(f);
      map.set(f.gw, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [preview]);

  const teamName = (id: string | null, roster: ParticipantRow[]) =>
    roster.find((t) => t.id === id)?.name ?? "TBD";

  const missingManagers = (roster: ParticipantRow[]) =>
    roster.filter((t) => t.fpl_manager_id === null);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#d6e4f9]">New Tournament</h1>
        <p className="text-sm text-[#849585] mt-1">
          Combine two of your leagues into a competition with real FPL gameweek scoring.
        </p>
      </div>

      {!competitionId ? (
        <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-[#849585]">League A (Group A)</label>
              <Select value={leagueA} onValueChange={(v) => v && selectLeague("A", v)}>
                <SelectTrigger className="w-full bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] h-9">
                  <SelectValue placeholder="Pick a league" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9]">
                  {pickableLeagues.map((id) => (
                    <SelectItem key={id} value={id} className="text-xs" disabled={id === leagueB}>
                      {selectedName(id)} ({leagues.find((l) => l.id === id)?.status ?? ""})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rosterA.length > 0 && (
                <p className="text-xs text-[#849585]">
                  {rosterA.length} teams
                  {missingManagers(rosterA).length > 0 && (
                    <span className="text-yellow-400"> · {missingManagers(rosterA).length} missing FPL link</span>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs text-[#849585]">League B (Group B)</label>
              <Select value={leagueB} onValueChange={(v) => v && selectLeague("B", v)}>
                <SelectTrigger className="w-full bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] h-9">
                  <SelectValue placeholder="Pick a league" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9]">
                  {pickableLeagues.map((id) => (
                    <SelectItem key={id} value={id} className="text-xs" disabled={id === leagueA}>
                      {selectedName(id)} ({leagues.find((l) => l.id === id)?.status ?? ""})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rosterB.length > 0 && (
                <p className="text-xs text-[#849585]">
                  {rosterB.length} teams
                  {missingManagers(rosterB).length > 0 && (
                    <span className="text-yellow-400"> · {missingManagers(rosterB).length} missing FPL link</span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-[#849585]">Tournament name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Golden Boot Showdown"
                className="bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] placeholder:text-[#849585]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#849585]">Starting FPL gameweek</label>
              <Input
                type="number"
                min={1}
                max={38}
                value={startGw}
                onChange={(e) => setStartGw(parseInt(e.target.value, 10))}
                className="bg-[#132030] border-[#3b4b3d] text-[#d6e4f9]"
              />
            </div>
          </div>

          <div className="rounded-lg border border-[#3b4b3d] bg-[#132030] p-4">
            <p className="text-xs text-[#849585] uppercase tracking-wide mb-2">Format</p>
            <p className="text-sm text-[#d6e4f9]">
              Group stage (28 MDs for 10-team groups): two intra-group
              round-robins (MD1–9 &amp; MD10–18), then a full cross-group
              round-robin (MD19–28) · top 8 per group qualify · two-path
              knockout runs the final nine gameweeks (GW30–38)
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end">
            <Button
              onClick={createCompetition}
              disabled={creating}
              className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-semibold"
            >
              {creating ? "Creating..." : "Create tournament"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#849585]">Tournament created</p>
              <p className="text-lg font-semibold text-[#d6e4f9]">{name || "Untitled"}</p>
            </div>
            <Badge className="text-xs border bg-[#1e2b3b] text-[#849585] border-[#3b4b3d]">
              Starting GW{startGw}
            </Badge>
          </div>

          {!mode && (
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={generateFixtures}
                disabled={busy}
                className="rounded-lg border border-[#00e478]/40 bg-[#132030] p-5 text-left hover:bg-[#1e2b3b] transition-colors disabled:opacity-50"
              >
                <p className="font-semibold text-[#00e478]">Generate fixtures</p>
                <p className="text-xs text-[#849585] mt-1">
                  Build the full schedule automatically from the format config.
                </p>
              </button>
              <button
                onClick={() => setMode("import")}
                className="rounded-lg border border-[#3b4b3d] bg-[#132030] p-5 text-left hover:bg-[#1e2b3b] transition-colors"
              >
                <p className="font-semibold text-[#d6e4f9]">Paste fixture list</p>
                <p className="text-xs text-[#849585] mt-1">
                  Import an existing schedule (MDx headers + Team A - Team B lines).
                </p>
              </button>
            </div>
          )}

          {mode === "generate" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#849585]">
                  Preview generated schedule ({preview?.length ?? 0} fixtures)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#3b4b3d] text-[#849585] hover:bg-[#132030]"
                    onClick={() => setMode(null)}
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={saveFixtures}
                    className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-semibold"
                  >
                    Save fixtures
                  </Button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                {previewByGw.map(([gw, rows]) => (
                  <div key={gw} className="rounded-lg border border-[#3b4b3d] bg-[#132030] p-3">
                    <p className="text-xs text-[#849585] mb-2">Gameweek {gw}</p>
                    <div className="space-y-1">
                      {rows.map((f) => (
                        <div key={`${f.tie_index}-${f.leg}`} className="flex items-center justify-between text-sm text-[#d6e4f9]">
                          <span className="truncate">
                            {teamName(f.home_team_id, [...rosterA, ...rosterB])}
                            <span className="text-[#849585]"> vs </span>
                            {teamName(f.away_team_id, [...rosterA, ...rosterB])}
                          </span>
                          <Badge className="text-[10px] border bg-[#1e2b3b] text-[#849585] border-[#3b4b3d]">
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#849585]">
                  {resolution
                    ? "Resolve any unmatched teams, then save."
                    : "Paste your fixture list below."}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#3b4b3d] text-[#849585] hover:bg-[#132030]"
                    onClick={() => setMode(null)}
                  >
                    Back
                  </Button>
                  {!resolution ? (
                    <Button
                      size="sm"
                      disabled={busy || !importText.trim()}
                      onClick={resolveImport}
                      className="bg-[#132030] border border-[#00e478]/40 text-[#00e478] hover:bg-[#1e2b3b]"
                    >
                      {busy ? "Parsing..." : "Parse"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={saveFixtures}
                      className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-semibold"
                    >
                      Save fixtures
                    </Button>
                  )}
                </div>
              </div>

              {!resolution && (
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={"MD1\nTeam A - Team B\nTeam C vs Team D\nMD2\n..."}
                  className="w-full h-56 rounded-lg border border-[#3b4b3d] bg-[#132030] p-3 text-sm text-[#d6e4f9] placeholder:text-[#849585] outline-none focus:border-[#00e478]"
                />
              )}

              {resolution && (
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {resolution.map((line, i) => {
                    const pick = picks[i] ?? { home: "", away: "" };
                    const homeResolved = matchId(line.homeMatch, pick.home);
                    const awayResolved = matchId(line.awayMatch, pick.away);
                    return (
                      <div key={i} className="rounded-lg border border-[#3b4b3d] bg-[#132030] p-3 space-y-2">
                        <div className="flex items-center justify-between text-sm text-[#d6e4f9]">
                          <span className="text-xs text-[#849585]">MD{line.matchday}</span>
                          <span className="truncate px-2">
                            {line.home}
                            <span className="text-[#849585]"> vs </span>
                            {line.away}
                          </span>
                          <span className="text-xs">
                            {homeResolved && awayResolved ? (
                              <Badge className="text-[10px] border bg-green-500/20 text-green-400 border-green-500/30">
                                Resolved
                              </Badge>
                            ) : (
                              <Badge className="text-[10px] border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
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
                            <SelectTrigger className="w-full bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9] h-8 text-xs">
                              <SelectValue placeholder={`Pick home team for "${line.home}"`} />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9]">
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
                            <SelectTrigger className="w-full bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9] h-8 text-xs">
                              <SelectValue placeholder={`Pick away team for "${line.away}"`} />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9]">
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

              {saveError && <p className="text-sm text-red-400">{saveError}</p>}
            </div>
          )}

          {mode === "import" && !resolution && saveError && (
            <p className="text-sm text-red-400">{saveError}</p>
          )}
        </div>
      )}
    </div>
  );
}