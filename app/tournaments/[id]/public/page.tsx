import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getFplGameweekInfo } from "@/lib/fpl-data";
import { PublicTournamentClient } from "./public-tournament-client";
import type {
  CompetitionFixtureRow,
  CompetitionRow,
  CompetitionTeamRow,
} from "@/lib/tournament/types";

export const metadata = { title: "Tournament" };

export default async function TournamentPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const initialTab = sp?.tab;

  const [compRes, teamsRes, fixRes, gwInfo] = await Promise.all([
    supabase.from("competitions").select("*").eq("id", id).single(),
    supabase.from("competition_teams").select("*").eq("competition_id", id).order("team_number"),
    supabase.from("competition_fixtures").select("*").eq("competition_id", id).order("gw"),
    getFplGameweekInfo().catch(() => ({ currentGameweek: null, liveGameweek: null })),
  ]);

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
  const liveGameweek = gwInfo.liveGameweek ?? gwInfo.currentGameweek ?? null;
  const currentGameweek = gwInfo.currentGameweek ?? liveGameweek ?? null;

  return (
    <PublicTournamentClient
      competition={competition}
      teams={teams}
      initialFixtures={fixtures}
      liveGameweek={liveGameweek}
      currentGameweek={currentGameweek}
      initialTab={initialTab}
    />
  );
}