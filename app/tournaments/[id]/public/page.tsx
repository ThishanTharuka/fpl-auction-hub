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

  // The team snapshot stores avatars only at creation time, so overlay the
  // current participant avatars to keep logos in sync on screen and in exports.
  const participantIds = teams.map((t) => t.participant_id).filter(Boolean);
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
  const teamsWithAvatars = teams.map((t) => {
    const live = participantAvatars.get(t.participant_id);
    if (!live) return t;
    return {
      ...t,
      avatar_url: live.avatar_url ?? t.avatar_url,
      color: live.color ?? t.color,
    };
  });

  return (
    <PublicTournamentClient
      competition={competition}
      teams={teamsWithAvatars}
      initialFixtures={fixtures}
      liveGameweek={liveGameweek}
      currentGameweek={currentGameweek}
      initialTab={initialTab}
    />
  );
}