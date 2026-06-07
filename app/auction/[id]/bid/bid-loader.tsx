import { supabase } from "@/lib/supabase";
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
      .select("*")
      .eq("league_id", id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getFplData().catch(() => null),
  ]);

  if (!leagueRes.data) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        Auction not found.
      </div>
    );
  }

  const players: EnrichedPlayer[] = fplData?.players ?? [];
  const nomination = nomRes.data
    ? normalizeNomination(nomRes.data as Record<string, unknown>)
    : null;

  return (
    <BidContent
      league={leagueRes.data as BidLeague}
      players={players}
      nomination={nomination}
      leagueId={id}
    />
  );
}
