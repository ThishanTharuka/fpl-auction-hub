import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TournamentControls } from "@/components/tournament/tournament-controls";
import { ScoreControls } from "@/components/tournament/score-controls";
import { KnockoutBracket } from "@/components/tournament/knockout-bracket";
import type { Database } from "@/lib/database.types";

type Stage = Database["public"]["Tables"]["tournament_stages"]["Row"];
type Match = Database["public"]["Tables"]["tournament_matches"]["Row"];
type Standing = Database["public"]["Tables"]["tournament_standings"]["Row"];

function stageTypeLabel(type: Stage["type"]): string {
  const labels: Record<string, string> = {
    league: "League",
    round_robin: "Round Robin",
    swiss: "Swiss",
    knockout: "Knockout",
  };
  return labels[type] ?? type;
}

function roundLabel(label: string): string {
  const labels: Record<string, string> = {
    league: "League",
    swiss: "Swiss",
    r32: "R32",
    r16: "R16",
    qf: "QF",
    sf: "SF",
    third_place: "3rd Place",
    final: "Final",
  };
  return labels[label] ?? label;
}

export default async function TournamentViewPage({
  params,
}: {
  params: Promise<{ id: string; tournamentId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id, tournamentId } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isCreator = user?.id === tournament.created_by;

  const { data: stages } = await supabase
    .from("tournament_stages")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("stage_order", { ascending: true });

  const { data: allMatches } = await supabase
    .from("tournament_matches")
    .select("*")
    .in("stage_id", stages?.map((s) => s.id) ?? [])
    .order("gw", { ascending: true })
    .order("round_number", { ascending: true });

  const { data: allStandings } = await supabase
    .from("tournament_standings")
    .select("*")
    .in("stage_id", stages?.map((s) => s.id) ?? [])
    .order("position", { ascending: true });

  const { data: participants } = await supabase
    .from("participants")
    .select("id, name, color")
    .eq("league_id", id);

  const participantMap = new Map(participants?.map((p) => [p.id, p]) ?? []);

  const matchesByStage = new Map<string, Match[]>();
  for (const m of allMatches ?? []) {
    const list = matchesByStage.get(m.stage_id) ?? [];
    list.push(m);
    matchesByStage.set(m.stage_id, list);
  }

  const standingsByStage = new Map<string, Standing[]>();
  for (const s of allStandings ?? []) {
    const list = standingsByStage.get(s.stage_id) ?? [];
    list.push(s);
    standingsByStage.set(s.stage_id, list);
  }

  const statusColor: Record<string, string> = {
    draft: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    active: "bg-green-500/20 text-green-400 border-green-500/50",
    completed: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  };

  const statusBg: Record<string, string> = {
    draft: "bg-yellow-500/10",
    active: "bg-green-500/10",
    completed: "bg-blue-500/10",
  };

  const matchStatusColor: Record<string, string> = {
    scheduled: "text-[#3b4b3d]",
    completed: "text-[#d6e4f9]",
    bye: "text-[#849585]",
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 lg:py-10 space-y-8">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href={`/auction/${id}`}>
          <Button variant="outline" size="sm" className="border-[#3b4b3d] text-[#849585]">
            <ArrowLeft size={16} className="mr-1" /> Lobby
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#d6e4f9]">{tournament.name}</h1>
          <p className="text-sm text-[#849585] mt-1">
            {participants?.length ?? 0} teams &middot; GW {tournament.start_gw}-{tournament.end_gw}
          </p>
        </div>
        <Badge className={`${statusColor[tournament.status] ?? ""}`}>
          {tournament.status}
        </Badge>
        {isCreator && (
          <TournamentControls
            tournamentId={tournament.id}
            auctionId={id}
            tournamentName={tournament.name}
            tournamentStatus={tournament.status}
          />
        )}
        {isCreator && tournament.status === "active" && (
          <ScoreControls
            tournamentId={tournament.id}
            startGw={tournament.start_gw}
            endGw={tournament.end_gw}
          />
        )}
      </div>

      {stages?.map((stage) => {
        const stageMatches = matchesByStage.get(stage.id) ?? [];
        const stageStandings = standingsByStage.get(stage.id) ?? [];
        const matchesByGw = new Map<number, Match[]>();
        for (const m of stageMatches) {
          const list = matchesByGw.get(m.gw) ?? [];
          list.push(m);
          matchesByGw.set(m.gw, list);
        }

        return (
          <div key={stage.id} className={`rounded-lg border border-[#3b4b3d] ${statusBg[stage.status] ?? "bg-[#0f1c2c]"} p-5 space-y-5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#849585] font-mono">#{stage.stage_order}</span>
                <h2 className="text-lg font-semibold text-[#d6e4f9]">{stage.name}</h2>
                <Badge variant="outline" className="text-[10px] border-[#3b4b3d] text-[#849585]">
                  {stageTypeLabel(stage.type)}
                </Badge>
                <span className="text-xs text-[#849585]">
                  {stage.scoring_mode === "head_to_head" ? "H2H" : "Total Pts"}
                  &nbsp;GW {stage.start_gw}&ndash;{stage.end_gw}
                </span>
              </div>
              {isCreator && tournament.status === "draft" && (
                <div className="flex gap-2">
                  <form action={`/api/tournament/${tournament.id}`} method="POST">
                    <input type="hidden" name="status" value="draft" />
                  </form>
                </div>
              )}
            </div>

            {stageMatches.length > 0 && stage.type === "knockout" && (
              <div>
                <h3 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-2">
                  Bracket
                </h3>
                <KnockoutBracket
                  matches={stageMatches.map((m) => ({
                    id: m.id,
                    gw: m.gw,
                    roundLabel: m.round_label,
                    homeTeamId: m.home_team_id,
                    awayTeamId: m.away_team_id,
                    homeFplPts: m.home_fpl_pts,
                    awayFplPts: m.away_fpl_pts,
                    status: m.status,
                    winnerTeamId: m.winner_team_id,
                  }))}
                  participantMap={participantMap}
                />
              </div>
            )}

            {stageMatches.length > 0 && stage.type !== "knockout" && (
              <div>
                <h3 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-2">
                  Matches ({stageMatches.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[#849585] border-b border-[#3b4b3d]">
                        <th className="text-left py-2 pr-3">GW</th>
                        <th className="text-left py-2 pr-3">Round</th>
                        <th className="text-left py-2 pr-3">Home</th>
                        <th className="text-center py-2 pr-3">Score</th>
                        <th className="text-left py-2 pr-3">Away</th>
                        <th className="text-left py-2 pr-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stageMatches.map((m) => (
                        <tr key={m.id} className="border-b border-[#3b4b3d]/50">
                          <td className="py-2 pr-3 text-[#849585] font-mono">GW{m.gw}</td>
                          <td className="py-2 pr-3 text-[#849585]">{roundLabel(m.round_label)}</td>
                          <td className="py-2 pr-3 text-[#d6e4f9]">
                            <span
                              className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                              style={{ backgroundColor: participantMap.get(m.home_team_id ?? "")?.color ?? "#3b4b3d" }}
                            />
                            {participantMap.get(m.home_team_id ?? "")?.name ?? "—"}
                          </td>
                          <td className="py-2 pr-3 text-center font-mono">
                            {m.status === "completed" ? (
                              <span className="text-[#d6e4f9]">
                                {m.home_fpl_pts ?? 0} &ndash; {m.away_fpl_pts ?? 0}
                              </span>
                            ) : (
                              <span className="text-[#3b4b3d]">vs</span>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-[#d6e4f9]">
                            <span
                              className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                              style={{ backgroundColor: participantMap.get(m.away_team_id ?? "")?.color ?? "#3b4b3d" }}
                            />
                            {participantMap.get(m.away_team_id ?? "")?.name ?? "—"}
                          </td>
                          <td className="py-2">
                            <span className={`${matchStatusColor[m.status] ?? ""}`}>
                              {m.status === "scheduled" && "Scheduled"}
                              {m.status === "completed" && <CheckCircle2 size={14} className="text-green-500" />}
                              {m.status === "bye" && "Bye"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {stageStandings.length > 0 && stage.scoring_mode === "head_to_head" && (
              <div>
                <h3 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-2">
                  Standings
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[#849585] border-b border-[#3b4b3d]">
                        <th className="text-left py-2 pr-3">#</th>
                        <th className="text-left py-2 pr-3">Team</th>
                        <th className="text-center py-2 pr-3">P</th>
                        <th className="text-center py-2 pr-3">W</th>
                        <th className="text-center py-2 pr-3">D</th>
                        <th className="text-center py-2 pr-3">L</th>
                        <th className="text-center py-2 pr-3">GF</th>
                        <th className="text-center py-2 pr-3">GA</th>
                        <th className="text-center py-2 pr-3">GD</th>
                        <th className="text-center py-2 pr-3 font-bold text-[#00e478]">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stageStandings.map((s) => (
                        <tr key={s.team_id} className="border-b border-[#3b4b3d]/50">
                          <td className="py-2 pr-3 text-[#849585]">{s.position}</td>
                          <td className="py-2 pr-3 text-[#d6e4f9]">
                            <span
                              className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                              style={{ backgroundColor: participantMap.get(s.team_id)?.color ?? "#3b4b3d" }}
                            />
                            {participantMap.get(s.team_id)?.name ?? "—"}
                          </td>
                          <td className="py-2 pr-3 text-center text-[#d6e4f9]">{s.played}</td>
                          <td className="py-2 pr-3 text-center text-[#d6e4f9]">{s.won}</td>
                          <td className="py-2 pr-3 text-center text-[#d6e4f9]">{s.drawn}</td>
                          <td className="py-2 pr-3 text-center text-[#d6e4f9]">{s.lost}</td>
                          <td className="py-2 pr-3 text-center text-[#d6e4f9]">{s.fpl_pts_for}</td>
                          <td className="py-2 pr-3 text-center text-[#d6e4f9]">{s.fpl_pts_against}</td>
                          <td className="py-2 pr-3 text-center text-[#d6e4f9]">{s.fpl_pts_diff}</td>
                          <td className="py-2 pr-3 text-center font-bold text-[#00e478]">{s.match_points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {stageStandings.length > 0 && stage.scoring_mode === "total_points" && (
              <div>
                <h3 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-2">
                  Standings
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[#849585] border-b border-[#3b4b3d]">
                        <th className="text-left py-2 pr-3">#</th>
                        <th className="text-left py-2 pr-3">Team</th>
                        <th className="text-center py-2 pr-3">GW</th>
                        <th className="text-center py-2 pr-3 font-bold text-[#00e478]">Total Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stageStandings.map((s) => (
                        <tr key={s.team_id} className="border-b border-[#3b4b3d]/50">
                          <td className="py-2 pr-3 text-[#849585]">{s.position}</td>
                          <td className="py-2 pr-3 text-[#d6e4f9]">
                            <span
                              className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                              style={{ backgroundColor: participantMap.get(s.team_id)?.color ?? "#3b4b3d" }}
                            />
                            {participantMap.get(s.team_id)?.name ?? "—"}
                          </td>
                          <td className="py-2 pr-3 text-center text-[#d6e4f9]">{s.played}</td>
                          <td className="py-2 pr-3 text-center font-bold text-[#00e478]">{s.fpl_pts_for}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
