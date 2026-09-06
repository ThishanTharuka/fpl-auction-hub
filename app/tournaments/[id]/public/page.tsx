import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getFplData } from "@/lib/fpl-data";
import { computeGroupStandings } from "@/lib/tournament/standings";
import { computeTieOutcomes, resolveKnockoutPlacement } from "@/lib/tournament/knockout";
import { buildTwoPathBracket } from "@/lib/tournament/knockout-two-path";
import { TeamAvatar } from "@/components/team-avatar";
import { TournamentBracket } from "@/components/tournament-bracket";
import type {
  CompetitionConfig,
  CompetitionFixtureRow,
  CompetitionRow,
  CompetitionTeamRow,
} from "@/lib/tournament/types";

const STATUS_LABELS: Record<string, string> = {
  setup: "Setup",
  active: "Live",
  complete: "Complete",
};

export const metadata = { title: "Tournament" };

export default async function TournamentPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [compRes, teamsRes, fixRes, fplData] = await Promise.all([
    supabase.from("competitions").select("*").eq("id", id).single(),
    supabase.from("competition_teams").select("*").eq("competition_id", id).order("team_number"),
    supabase.from("competition_fixtures").select("*").eq("competition_id", id).order("gw"),
    getFplData().catch(() => null),
  ]);

  const liveGameweek = fplData?.liveGameweek ?? fplData?.currentGameweek ?? null;

  const competition = compRes.data as CompetitionRow | null;
  if (!competition) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center text-[#849585]">
        <p className="text-lg mb-2">Tournament not found.</p>
        <Link href="/" className="text-[#00e478] hover:underline">
          Back home
        </Link>
      </div>
    );
  }

  const teams = (teamsRes.data ?? []) as CompetitionTeamRow[];
  const fixtures = (fixRes.data ?? []) as CompetitionFixtureRow[];
  const config = competition.format_config as unknown as CompetitionConfig;

  const teamById = new Map(teams.map((t) => [t.id, t]));

  const teamName = (teamId: string | null) =>
    (teamId ? teamById.get(teamId)?.name ?? "TBD" : "TBD");

  const fixtureGroupLabel = (f: CompetitionFixtureRow) => {
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
  };

  const standings = computeGroupStandings(teams, fixtures, config);

  const _bracketSlots =
    config.knockout.template === "two_path_v1"
      ? (() => {
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
        })()
      : [];

  const fixturesByGw = new Map<number, CompetitionFixtureRow[]>();
  for (const f of fixtures) {
    const arr = fixturesByGw.get(f.gw) ?? [];
    arr.push(f);
    fixturesByGw.set(f.gw, arr);
  }
  const gwList = [...fixturesByGw.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-10">
      <header className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-[#d6e4f9]">{competition.name}</h1>
          <span className="rounded-full border border-[#00e478]/40 bg-[#00e478]/10 px-3 py-1 text-xs text-[#00e478]">
            {STATUS_LABELS[competition.status] ?? "Setup"}
          </span>
        </div>
        <p className="text-sm text-[#849585]">
          {teams.filter((t) => t.group_label === "A").length} teams in Group A ·{" "}
          {teams.filter((t) => t.group_label === "B").length} teams in Group B · season starts GW
          {competition.start_gw} · scored on real FPL gameweek points
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#d6e4f9]">Standings</h2>
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
                        const zoneBg = i < 4 ? "bg-[#00e478]" : i < 8 ? "bg-amber-500" : "bg-red-500";
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
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#d6e4f9]">Bracket</h2>
        <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4">
          <TournamentBracket teams={teams} fixtures={fixtures} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#d6e4f9]">Fixtures & Results</h2>
        <div className="space-y-3">
          {gwList.map(([gw, rows]) => (
            <div key={gw} className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[#849585]">Gameweek {gw}</p>
                {gw === liveGameweek && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#00e478]/15 text-[#00e478] border border-[#00e478]/30 shadow-[0_0_10px_rgba(0,228,120,0.15)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00e478] animate-pulse-slow shadow-[0_0_6px_rgba(0,228,120,0.8)]" />
                    Live
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {rows.map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-sm text-[#d6e4f9]">
                    <span className="truncate flex items-center gap-2">
                      <span className="text-xs text-[#849585] shrink-0">
                        {fixtureGroupLabel(f)}
                      </span>
                      <span>
                        {teamName(f.home_team_id)}
                        <span className="text-[#849585]"> vs </span>
                        {teamName(f.away_team_id)}
                      </span>
                    </span>
                    <span className="text-xs text-[#849585]">
                      {f.status === "scored" ? `${f.home_points}–${f.away_points}` : fixtureGroupLabel(f)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}