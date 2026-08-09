import { supabase } from "@/lib/supabase";
import { LobbyContent } from "./lobby-content";

export async function LobbyLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [leagueRes, participantsRes, membersRes] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", id).single(),
    supabase.from("participants").select("id,name,color").eq("league_id", id).order("name"),
    supabase.from("team_members").select("id,participant_id,user_id,user_email,user_name,status").eq("league_id", id),
  ]);

  if (!leagueRes.data) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 lg:py-10">
        <div className="flex items-center justify-center h-64 text-red-400">
          Auction not found.
        </div>
      </div>
    );
  }

  return (
    <LobbyContent
      league={leagueRes.data as unknown as LobbyLeague}
      participants={participantsRes.data as LobbyParticipant[] ?? []}
      members={membersRes.data as LobbyMember[] ?? []}
      leagueId={id}
    />
  );
}

export type LobbyLeague = {
  id: string;
  name: string;
  allow_spectator_chat: boolean;
  budget_per_team: number;
  timer_seconds: number;
  bid_increment: number;
  bid_increment_tiers?: unknown;
  status: string | null;
  created_by: string | null;
  room_password: string | null;
  base_price_gkp: number;
  base_price_def: number;
  base_price_mid: number;
  base_price_fwd: number;
  max_per_club: number;
  squad_size: number;
  max_gkp: number;
  max_def: number;
  max_mid: number;
  max_fwd: number;
};

export type LobbyParticipant = {
  id: string;
  name: string;
  color: string | null;
};

export type LobbyMember = {
  id: string;
  participant_id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  status: string;
};
