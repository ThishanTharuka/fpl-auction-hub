import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getFplData } from "@/lib/fpl-data";
import { BidContent } from "./bid-content";
import type { EnrichedPlayer } from "@/lib/fpl-types";

export type BidLeague = {
  id: string;
  name: string;
  created_by: string | null;
  budget_per_team: number;
  timer_seconds: number | null;
  bid_increment: number | null;
  bid_increment_tiers?: unknown;
  max_per_club: number | null;
  squad_size: number | null;
  max_gkp: number | null;
  max_def: number | null;
  max_mid: number | null;
  max_fwd: number | null;
  base_price_gkp: number | null;
  base_price_def: number | null;
  base_price_mid: number | null;
  base_price_fwd: number | null;
};

interface BidParticipant {
  id: string;
  name: string;
  color: string | null;
  avatar_url: string | null;
}

interface BidSquadPlayer {
  id: number;
  name: string;
  position: string;
  price: number;
  team: string;
}

interface BidTeamMeta {
  budget_per_team: number;
  spent: number;
  squad: BidSquadPlayer[];
}

export type BidNomination = {
  id: string;
  fpl_player_id: number;
  player_name: string;
  player_team: string | null;
  position: string;
  starting_price: number;
  current_bid: number;
  current_bidder_id: string | null;
  current_bidder_name: string | null;
  bid_end_time: string | null;
  is_paused: boolean;
  paused_seconds: number | null;
  status: string;
};

function normalizeNomination(raw: Record<string, unknown>): BidNomination | null {
  if (!raw) return null;
  return {
    ...(raw as unknown as BidNomination),
    starting_price: Number(raw.starting_price),
    current_bid: Number(raw.current_bid),
    current_bidder_id: typeof raw.current_bidder_id === "string" ? raw.current_bidder_id : null,
    current_bidder_name: typeof raw.current_bidder_name === "string" ? raw.current_bidder_name : null,
    is_paused: Boolean(raw.is_paused),
    paused_seconds: typeof raw.paused_seconds === "number" ? raw.paused_seconds : null,
  };
}

export async function BidLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [leagueRes, nomRes, fplData] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", id).single(),
    supabase
      .from("auction_nominations")
      .select("id,fpl_player_id,player_name,player_team,position,starting_price,current_bid,current_bidder_id,current_bidder_name,bid_end_time,is_paused,paused_seconds,status")
      .eq("league_id", id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getFplData().catch(() => null) as Promise<{
      players: EnrichedPlayer[];
      teams: unknown[];
      currentGameweek: number;
    } | null>,
  ]);
  const initialPlayers = fplData?.players ?? ([] as EnrichedPlayer[]);

  if (!leagueRes.data) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        Auction not found.
      </div>
    );
  }

  const league = leagueRes.data as unknown as BidLeague;
  const nomination = nomRes.data
    ? normalizeNomination(nomRes.data as Record<string, unknown>)
    : null;

  // Fetch all participants + results for the team budget tracker
  const [participantsRes, allResultsRes] = await Promise.all([
    supabase.from("participants").select("id,name,color,avatar_url").eq("league_id", id).order("name"),
    supabase.from("auction_results").select("fpl_player_id,participant_id,price_paid,position_slot,player_name,player_team").eq("league_id", id).order("created_at", { ascending: true }),
  ]);

  const allParticipants = (participantsRes.data ?? []) as BidParticipant[];
  const allResults = (allResultsRes.data ?? []) as {
    fpl_player_id: number;
    participant_id: string | null;
    price_paid: number;
    position_slot: string | null;
    player_name: string | null;
    player_team: string | null;
  }[];

  let initialMyTeam: BidParticipant | null = null;
  let initialTeamMeta: BidTeamMeta | null = null;

  try {
    const serverSupabase = await createSupabaseServerClient();
    const { data: authData } = await serverSupabase.auth.getUser();
    const user = authData?.user;

    if (user) {
      const { data: membership } = await supabase
        .from("team_members")
        .select("participant_id")
        .eq("league_id", id)
        .eq("user_id", user.id)
        .eq("status", "approved")
        .single();

      if (membership) {
        const { data: participant } = await supabase
          .from("participants")
          .select("id,name,color,avatar_url")
          .eq("id", membership.participant_id)
          .single();

        if (participant) {
          initialMyTeam = participant as BidParticipant;

          const { data: results } = await supabase
            .from("auction_results")
            .select("fpl_player_id,price_paid,position_slot,player_name,player_team")
            .eq("league_id", id)
            .eq("participant_id", membership.participant_id);

          if (results) {
            const squad: BidSquadPlayer[] = results.map((r) => ({
              id: r.fpl_player_id,
              name: r.player_name ?? "Unknown",
              position: r.position_slot ?? "?",
              price: r.price_paid,
              team: r.player_team ?? "",
            }));
            const spent = results.reduce((s, r) => s + r.price_paid, 0);
            initialTeamMeta = {
              budget_per_team: league.budget_per_team,
              spent,
              squad,
            };
          }
        }
      }
    }
  } catch {
    // Auth or team lookup failed — client will resolve on its own
  }

  return (
    <BidContent
      league={league}
      nomination={nomination}
      leagueId={id}
      initialMyTeam={initialMyTeam}
      initialTeamMeta={initialTeamMeta}
      initialAllParticipants={allParticipants}
      initialAllResults={allResults}
      initialPlayers={initialPlayers}
    />
  );
}
