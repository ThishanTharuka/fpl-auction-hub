import { supabase } from "@/lib/supabase";
import { getFplData } from "@/lib/fpl-data";
import { SpectateContent } from "./spectate-content";
import type { EnrichedPlayer } from "@/lib/fpl-types";

export type SpectateLeague = {
  id: string;
  name: string;
  status: string | null;
  budget_per_team: number;
  created_by: string | null;
};

export type SpectateParticipant = {
  id: string;
  name: string;
  color: string | null;
  avatar_url: string | null;
};

export type SpectateNomination = {
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

export type SpectateResult = {
  fpl_player_id: number;
  participant_id: string | null;
  price_paid: number;
  position_slot: string | null;
  player_name: string | null;
  player_team: string | null;
};

export type SpectateBid = {
  id: string;
  nomination_id: string;
  participant_id: string | null;
  participant_name: string;
  amount: number;
  created_at: string | null;
};

function normalizeNomination(raw: Record<string, unknown>): SpectateNomination {
  return {
    ...(raw as unknown as SpectateNomination),
    starting_price: Number(raw.starting_price),
    current_bid: Number(raw.current_bid),
    current_bidder_id:
      typeof raw.current_bidder_id === "string" ? raw.current_bidder_id : null,
    current_bidder_name:
      typeof raw.current_bidder_name === "string"
        ? raw.current_bidder_name
        : null,
    is_paused: Boolean(raw.is_paused),
    paused_seconds:
      typeof raw.paused_seconds === "number" ? raw.paused_seconds : null,
  };
}

export async function SpectateLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [leagueRes, nomRes, fplData, participantsRes, resultsRes] =
    await Promise.all([
      supabase
        .from("leagues")
        .select("id,name,status,budget_per_team,created_by")
        .eq("id", id)
        .single(),
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
      supabase
        .from("participants")
        .select("id,name,color,avatar_url")
        .eq("league_id", id)
        .order("name"),
      supabase
        .from("auction_results")
        .select(
          "fpl_player_id,participant_id,price_paid,position_slot,player_name,player_team",
        )
        .eq("league_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const initialPlayers = fplData?.players ?? ([] as EnrichedPlayer[]);

  if (!leagueRes.data) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        Auction not found.
      </div>
    );
  }

  const nomination = nomRes.data
    ? normalizeNomination(nomRes.data as Record<string, unknown>)
    : null;

  return (
    <SpectateContent
      league={leagueRes.data as unknown as SpectateLeague}
      nomination={nomination}
      initialParticipants={(participantsRes.data ?? []) as SpectateParticipant[]}
      initialResults={(resultsRes.data ?? []) as SpectateResult[]}
      initialPlayers={initialPlayers}
    />
  );
}
