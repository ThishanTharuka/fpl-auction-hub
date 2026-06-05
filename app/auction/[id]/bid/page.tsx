"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayerStatsBar } from "@/components/player-stats-bar";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";
import { useServerClock } from "@/lib/use-server-clock";
import type { EnrichedPlayer } from "@/lib/fpl-types";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

const supabase = createSupabaseBrowserClient();

// Supabase numeric columns can arrive as strings; uuid nulls can arrive as
// undefined (omitted) in realtime payloads. Normalise before storing in state.
function normalizeNomination(raw: Record<string, unknown>): Nomination {
  return {
    ...(raw as unknown as Nomination),
    starting_price: Number(raw.starting_price),
    current_bid: Number(raw.current_bid),
    current_bidder_id: typeof raw.current_bidder_id === "string" ? raw.current_bidder_id : null,
    current_bidder_name: typeof raw.current_bidder_name === "string" ? raw.current_bidder_name : null,
    is_paused: Boolean(raw.is_paused),
    paused_seconds: typeof raw.paused_seconds === "number" ? raw.paused_seconds : null,
  };
}

function resolveBidAmount(nomination: Nomination, increment: number): number {
  if (!nomination.current_bidder_id) return nomination.starting_price;
  return Number((nomination.current_bid + increment).toFixed(1));
}

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  DEF: "bg-green-500/20 text-green-400 border-green-500/30",
  MID: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  FWD: "bg-red-500/20 text-red-400 border-red-500/30",
};

interface League {
  id: string;
  name: string;
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
}

interface Participant {
  id: string;
  name: string;
  color: string | null;
}

interface Nomination {
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
}

interface SquadPlayer {
  id: number;
  name: string;
  position: string;
  price: number;
  team: string;
}

interface TeamMeta {
  budget_per_team: number;
  spent: number;
  squad: SquadPlayer[];
}

interface CanBidArgs {
  nomination: Nomination | null;
  myTeamId: string;
  myBid: number;
  maxBid: number;
  secondsLeft: number;
  remaining: number;
  myPosCount: number;
  posLimit: number;
  squadSize: number;
  maxSquad: number;
}

function checkCanBid(a: CanBidArgs): boolean {
  if (a.nomination?.status !== "open") return false;
  if (a.nomination.is_paused) return false;
  if (a.secondsLeft <= 0) return false;
  if (a.nomination.current_bidder_id === a.myTeamId) return false;
  if (a.myBid > a.maxBid || a.myPosCount >= a.posLimit) return false;
  if (a.squadSize >= a.maxSquad) return false;
  return true;
}

export default function BidPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [league, setLeague] = useState<League | null>(null);
  const [myTeam, setMyTeam] = useState<Participant | null>(null);
  const [teamMeta, setTeamMeta] = useState<TeamMeta | null>(null);
  const [nomination, setNomination] = useState<Nomination | null>(null);
  const [fplPlayer, setFplPlayer] = useState<EnrichedPlayer | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [bidding, setBidding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const serverClock = useServerClock();
  const fplPlayersMapRef = useRef<Map<number, EnrichedPlayer>>(new Map());

  const loadMySquad = useCallback(
    async (
      participantId: string,
      lg: League | null,
      playerMap?: Map<number, EnrichedPlayer>,
    ) => {
      const { data: results } = await supabase
        .from("auction_results")
        .select("*")
        .eq("league_id", id)
        .eq("participant_id", participantId);

      if (!results) return;

      const effectiveMap = playerMap ?? fplPlayersMapRef.current;
      const squad: SquadPlayer[] = results.map((r) => {
        const fpl = effectiveMap.get(r.fpl_player_id);
        return {
          id: r.fpl_player_id,
          name: r.player_name ?? fpl?.web_name ?? "Unknown",
          position: r.position_slot ?? fpl?.position ?? "?",
          price: r.price_paid,
          team: r.player_team ?? fpl?.team_short ?? "",
        };
      });
      const spent = results.reduce((s, r) => s + r.price_paid, 0);
      setTeamMeta({
        budget_per_team: lg?.budget_per_team ?? 200,
        spent,
        squad,
      });
    },
    [id],
  );

  const loadAll = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;

    // Find my approved team membership
    const { data: membership } = await supabase
      .from("team_members")
      .select("participant_id")
      .eq("league_id", id)
      .eq("user_id", userId)
      .eq("status", "approved")
      .single();

    if (!membership) {
      // No approved membership — send back to lobby
      router.replace(`/auction/${id}`);
      return;
    }

    const [{ data: lg }, { data: participant }, { data: nom }, bootstrapRes] =
      await Promise.all([
        supabase.from("leagues").select("*").eq("id", id).single(),
        supabase
          .from("participants")
          .select("id,name,color")
          .eq("id", membership.participant_id)
          .single(),
        supabase
          .from("auction_nominations")
          .select("*")
          .eq("league_id", id)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
        fetch("/api/fpl/bootstrap")
          .then((r) => r.json())
          .catch(() => ({})),
      ]);

    if (!lg || !participant) {
      setLoadError("Auction not found.");
      return;
    }

    const playersArr: EnrichedPlayer[] = bootstrapRes?.players ?? [];
    const pMap = new Map<number, EnrichedPlayer>(
      playersArr.map((p) => [p.id, p]),
    );
    fplPlayersMapRef.current = pMap;

    setLeague(lg as League);
    setMyTeam(participant as Participant);
    if (nom) {
      const n = normalizeNomination(nom as Record<string, unknown>);
      setNomination(n);
      setFplPlayer(pMap.get(n.fpl_player_id) ?? null);
    }

    await loadMySquad(membership.participant_id, lg as League, pMap);
  }, [id, router, user?.id, loadMySquad]);

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const timeoutId = setTimeout(() => {
      loadAll().catch(() => {});
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [authLoading, user, router, loadAll]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!myTeam) return;

    const handleNominationChange = (
      payload: RealtimePostgresChangesPayload<Nomination>,
    ) => {
      const row = normalizeNomination(payload.new as Record<string, unknown>);
      if (row.status === "open") {
        setNomination(row);
        setFplPlayer(fplPlayersMapRef.current.get(row.fpl_player_id) ?? null);
        return;
      }
      setNomination(null);
      setFplPlayer(null);
      setSecondsLeft(0);
      if (row.status === "sold" && row.current_bidder_id === myTeam.id) {
        loadMySquad(myTeam.id, league, fplPlayersMapRef.current).catch(
          () => {},
        );
      }
    };

    channelRef.current = supabase
      .channel(`bid-${id}-${myTeam.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auction_nominations",
          filter: `league_id=eq.${id}`,
        },
        handleNominationChange,
      )
      .subscribe();

    return () => {
      if (channelRef.current)
        supabase.removeChannel(channelRef.current).catch(() => {});
    };
  }, [id, myTeam, league, loadMySquad]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const tickTimer = useCallback(() => {
    if (!nomination) {
      setSecondsLeft(0);
      return;
    }
    if (nomination.is_paused) {
      setSecondsLeft(nomination.paused_seconds ?? 0);
      return;
    }
    if (!nomination.bid_end_time) {
      setSecondsLeft(0);
      return;
    }
    const remaining = Math.max(
      0,
      Math.round(
        (new Date(nomination.bid_end_time).getTime() -
          serverClock.getServerNow()) /
          1000,
      ),
    );
    setSecondsLeft(remaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomination]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (
      nomination?.bid_end_time &&
      nomination.status === "open" &&
      nomination.is_paused === false
    ) {
      timerRef.current = setInterval(tickTimer, 500);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [
    nomination?.bid_end_time,
    nomination?.status,
    nomination?.is_paused,
    nomination?.paused_seconds,
    tickTimer,
  ]);

  // ── Bid ───────────────────────────────────────────────────────────────────
  async function placeBid() {
    if (!nomination || !myTeam || !league) return;
    if (nomination.is_paused || secondsLeft <= 0) return;
    setBidding(true);
    const inc = league.bid_increment ?? 0.5;
    const bidAmount = resolveBidAmount(nomination, inc);
    const endTime = serverClock.toISO(
      serverClock.getServerNow() + (league.timer_seconds ?? 45) * 1000,
    );

    const nowIso = serverClock.toISO(serverClock.getServerNow());
    const { data: updatedRow } = await supabase
      .from("auction_nominations")
      .update({
        current_bid: bidAmount,
        current_bidder_id: myTeam.id,
        current_bidder_name: myTeam.name,
        is_paused: false,
        paused_seconds: null,
        bid_end_time: endTime,
      })
      .eq("id", nomination.id)
      .eq("status", "open")
      .eq("is_paused", false)
      .gt("bid_end_time", nowIso)
      .select("id")
      .maybeSingle();

    if (!updatedRow) {
      setBidding(false);
      return;
    }

    await supabase.from("auction_bids").insert({
      nomination_id: nomination.id,
      participant_id: myTeam.id,
      participant_name: myTeam.name,
      amount: bidAmount,
    });
    setBidding(false);
  }

  // ── Render guards ─────────────────────────────────────────────────────────
  if (authLoading || (!myTeam && !loadError)) {
    return (
      <div className="flex items-center justify-center h-64 text-[#849585]">
        Loading…
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        {loadError}
      </div>
    );
  }
  if (!myTeam || !league) {
    return (
      <div className="flex items-center justify-center h-64 text-[#849585]">
        Redirecting…
      </div>
    );
  }

  const remaining = teamMeta
    ? teamMeta.budget_per_team - teamMeta.spent
    : league.budget_per_team;
  const squadSize = teamMeta?.squad.length ?? 0;
  const maxSquad = league.squad_size ?? 15;
  const increment = league.bid_increment ?? 0.5;
  const myBid = nomination ? resolveBidAmount(nomination, increment) : 0;
  const posKey = nomination?.position.toLowerCase() as
    | "gkp"
    | "def"
    | "mid"
    | "fwd";
  const posLimits = {
    gkp: league.max_gkp ?? 2,
    def: league.max_def ?? 5,
    mid: league.max_mid ?? 5,
    fwd: league.max_fwd ?? 3,
  };
  const myPosCount = nomination
    ? (teamMeta?.squad.filter((p) => p.position === nomination.position)
        .length ?? 0)
    : 0;
  const posLimit = posLimits[posKey] ?? 99;

  const startPrices: Record<string, number> = {
    GKP: league.base_price_gkp ?? 4,
    DEF: league.base_price_def ?? 4.5,
    MID: league.base_price_mid ?? 5,
    FWD: league.base_price_fwd ?? 5,
  };

  const posCounts: Record<string, number> = {};
  const posSpent: Record<string, number> = {};
  for (const p of teamMeta?.squad ?? []) {
    posCounts[p.position] = (posCounts[p.position] ?? 0) + 1;
    posSpent[p.position] = (posSpent[p.position] ?? 0) + p.price;
  }

  const posRequirements = ["GKP", "DEF", "MID", "FWD"].map((pos) => {
    const have = posCounts[pos] ?? 0;
    const limit =
      {
        GKP: league.max_gkp,
        DEF: league.max_def,
        MID: league.max_mid,
        FWD: league.max_fwd,
      }[pos] ?? maxSquad;
    const need = Math.max(0, limit - have);
    return {
      position: pos,
      have,
      need,
      spent: posSpent[pos] ?? 0,
      minAllocation: need * (startPrices[pos] ?? 0),
      startPrice: startPrices[pos] ?? 0,
    };
  });

  const totalMinAllocation = posRequirements.reduce(
    (s, r) => s + r.minAllocation,
    0,
  );
  const totalRemainingSlots = posRequirements.reduce((s, r) => s + r.need, 0);
  const surplus = Math.max(0, remaining - totalMinAllocation);

  const nomStartPrice = nomination
    ? (startPrices[nomination.position] ?? 0)
    : 0;
  const totalMinAllocationAfterBid = Math.max(
    0,
    totalMinAllocation - nomStartPrice,
  );
  const totalRemainingSlotsAfterBid = nomination
    ? Math.max(0, totalRemainingSlots - 1)
    : totalRemainingSlots;
  const maxBid = Math.max(0, surplus + nomStartPrice);

  const canBid = checkCanBid({
    nomination,
    myTeamId: myTeam.id,
    myBid,
    maxBid,
    secondsLeft,
    remaining,
    myPosCount,
    posLimit,
    squadSize,
    maxSquad,
  });

  let timerColor = "text-red-400";
  if (secondsLeft > 15) timerColor = "text-[#00e478]";
  else if (secondsLeft > 5) timerColor = "text-yellow-400";

  return (
    <BidUI
      league={league}
      myTeam={myTeam}
      teamMeta={teamMeta}
      nomination={nomination}
      fplPlayer={fplPlayer}
      secondsLeft={secondsLeft}
      bidding={bidding}
      canBid={canBid}
      myBid={myBid}
      surplus={surplus}
      maxBid={maxBid}
      remaining={remaining}
      squadSize={squadSize}
      maxSquad={maxSquad}
      myPosCount={myPosCount}
      posLimit={posLimit}
      timerColor={timerColor}
      posRequirements={posRequirements}
      totalMinAllocation={totalMinAllocation}
      totalRemainingSlots={totalRemainingSlots}
      totalMinAllocationAfterBid={totalMinAllocationAfterBid}
      totalRemainingSlotsAfterBid={totalRemainingSlotsAfterBid}
      onBid={() => placeBid().catch(() => {})}
    />
  );
}

// ── Position requirement data ──────────────────────────────────────────────────

interface PositionRequirement {
  position: string;
  have: number;
  need: number;
  spent: number;
  minAllocation: number;
  startPrice: number;
}

// ── BidUI ─────────────────────────────────────────────────────────────────────

type BidUIProps = Readonly<{
  league: League;
  myTeam: Participant;
  teamMeta: TeamMeta | null;
  nomination: Nomination | null;
  fplPlayer: EnrichedPlayer | null;
  secondsLeft: number;
  bidding: boolean;
  canBid: boolean;
  myBid: number;
  surplus: number;
  maxBid: number;
  remaining: number;
  squadSize: number;
  maxSquad: number;
  myPosCount: number;
  posLimit: number;
  timerColor: string;
  posRequirements: PositionRequirement[];
  totalMinAllocation: number;
  totalRemainingSlots: number;
  totalMinAllocationAfterBid: number;
  totalRemainingSlotsAfterBid: number;
  onBid: () => void;
}>;

function BidUI({
  league,
  myTeam,
  teamMeta,
  nomination,
  fplPlayer,
  secondsLeft,
  bidding,
  canBid,
  myBid,
  surplus,
  maxBid,
  remaining,
  squadSize,
  maxSquad,
  myPosCount,
  posLimit,
  timerColor,
  posRequirements,
  totalMinAllocation,
  totalRemainingSlots,
  totalMinAllocationAfterBid,
  totalRemainingSlotsAfterBid,
  onBid,
}: BidUIProps) {
  let timerDisplayValue: number | string = "\u2014";
  if (nomination) {
    if (nomination.is_paused) {
      timerDisplayValue = nomination.paused_seconds ?? 0;
    } else if (nomination.bid_end_time) {
      timerDisplayValue = secondsLeft;
    }
  }

  return (
    <div className="min-h-screen lg:h-screen overflow-y-auto lg:overflow-hidden">
      <div className="mx-auto max-w-[1440px] flex flex-col lg:flex-row gap-4 h-full px-4 py-4">
        {/* ── Centre: Bidding (first on mobile, center on desktop) ──────── */}
        <main className="flex-1 flex flex-col gap-4 overflow-hidden lg:order-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#849585]">{league.name}</p>
              <h1 className="text-lg font-bold text-[#d6e4f9] flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: myTeam.color ?? "#888" }}
                />
                {myTeam.name}
              </h1>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-[#00e478]">
                &pound;{remaining.toFixed(1)}m
              </div>
              <div className="text-xs text-[#849585]">remaining</div>
            </div>
          </div>

          {/* Live nomination */}
          {nomination ? (
            <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5 min-h-[300px]">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={POSITION_COLORS[nomination.position] ?? ""}
                    >
                      {nomination.position}
                    </Badge>
                    <span className="text-xs text-[#849585]">
                      {fplPlayer?.team_name ?? nomination.player_team}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#d6e4f9]">
                    {fplPlayer?.full_name ?? nomination.player_name}
                  </h2>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-mono font-bold ${timerColor}`}>
                    {timerDisplayValue}
                  </div>
                  <div className="text-xs text-[#849585]">
                    {nomination.is_paused ? "paused" : "secs"}
                  </div>
                </div>
              </div>

              {fplPlayer && (
                <PlayerStatsBar player={fplPlayer} className="mb-4" />
              )}

              <div className="bg-[#132030] rounded-lg p-4 mb-4">
                <div className="text-xs text-[#849585] uppercase tracking-wider mb-1">
                  {nomination.current_bidder_id === null
                    ? "Starting Price"
                    : "Current Bid"}
                </div>
                <div className="text-3xl font-mono font-bold text-[#00e478]">
                  &pound;{nomination.current_bid}m
                </div>
                {nomination.current_bidder_name && (
                  <div className="text-xs text-[#849585] mt-1">
                    {nomination.current_bidder_id === myTeam.id ? (
                      <span className="text-[#00e478] font-semibold">
                        You are the highest bidder
                      </span>
                    ) : (
                      <span>by {nomination.current_bidder_name}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-[#849585] mb-2">
                <span>
                  Maximum bid for the player: &pound;{maxBid.toFixed(1)}m
                </span>
                {myBid > maxBid && nomination && (
                  <span className="text-yellow-400">
                    Must reserve &pound;{totalMinAllocationAfterBid.toFixed(1)}m
                    for remaining slots
                  </span>
                )}
              </div>

              <Button
                onClick={onBid}
                disabled={!canBid || bidding}
                className="w-full bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-bold text-xl py-7 disabled:opacity-40"
              >
                {bidding ? "Placing\u2026" : `Bid \u00a3${myBid}m`}
              </Button>

              {nomination.current_bidder_id === myTeam.id && (
                <p className="text-xs text-[#849585] text-center mt-2">
                  You are already the highest bidder
                </p>
              )}
              {myPosCount >= posLimit && (
                <p className="text-xs text-red-400 text-center mt-2">
                  Position limit reached ({posLimit} {nomination.position})
                </p>
              )}
              {myBid > remaining && (
                <p className="text-xs text-red-400 text-center mt-2">
                  Insufficient budget
                </p>
              )}
              {myBid > maxBid && myBid <= remaining && (
                <p className="text-xs text-yellow-400 text-center mt-2">
                  Must reserve &pound;{totalMinAllocationAfterBid.toFixed(1)}m
                  for remaining {totalRemainingSlotsAfterBid} slot
                  {totalRemainingSlotsAfterBid === 1 ? "" : "s"}
                </p>
              )}
              {nomination.is_paused && (
                <p className="text-xs text-yellow-400 text-center mt-2">
                  Bidding is paused by the auctioneer
                </p>
              )}
              {secondsLeft <= 0 && (
                <p className="text-xs text-yellow-400 text-center mt-2">
                  Timer expired. Waiting for auctioneer action.
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-[#3b4b3d] bg-[#0f1c2c] min-h-[300px]">
              <div className="text-center">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-[#849585]">
                  Waiting for next nomination…
                </p>
              </div>
            </div>
          )}
        </main>

        {/* ── Right: Team Requirement ────────────────────────────────────── */}
        <aside className="w-full lg:w-72 shrink-0 lg:order-3">
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4">
            <h3 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-3">
              Team Requirement
            </h3>

            {/* Position rows */}
            <div className="space-y-2 mb-4">
              <div className="grid grid-cols-5 gap-1 text-[10px] text-[#849585] font-semibold uppercase pb-1 border-b border-[#3b4b3d]">
                <span>Pos</span>
                <span className="text-center">Have</span>
                <span className="text-center">Need</span>
                <span className="text-right">Spent</span>
                <span className="text-right">Min</span>
              </div>
              {posRequirements.map((r) => (
                <div
                  key={r.position}
                  className="grid grid-cols-5 gap-1 text-xs"
                >
                  <Badge
                    variant="outline"
                    className={`text-[9px] w-fit ${POSITION_COLORS[r.position] ?? ""}`}
                  >
                    {r.position}
                  </Badge>
                  <span className="text-center text-[#d6e4f9] self-center">
                    {r.have}
                  </span>
                  <span className="text-center text-[#d6e4f9] self-center">
                    {r.need}
                  </span>
                  <span className="text-right font-mono text-[#b9cbb9] self-center">
                    &pound;{r.spent.toFixed(1)}m
                  </span>
                  <span className="text-right font-mono text-[#849585] self-center">
                    &pound;{r.minAllocation.toFixed(1)}m
                  </span>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="border-t border-[#3b4b3d] pt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#849585]">Remaining budget</span>
                <span className="font-mono text-[#d6e4f9]">
                  &pound;{remaining.toFixed(1)}m
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#849585]">
                  Min. reserve for {totalRemainingSlots} slot
                  {totalRemainingSlots === 1 ? "" : "s"}
                </span>
                <span className="font-mono text-[#849585]">
                  -&pound;{totalMinAllocation.toFixed(1)}m
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#3b4b3d]">
                <span className="text-[#00e478] font-semibold">Surplus</span>
                <span className="font-mono font-bold text-[#00e478]">
                  &pound;{surplus.toFixed(1)}m
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Left: My Squad (last on mobile, first on desktop) ────────────── */}
        <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-4 order-3 lg:order-1">
          {teamMeta && (
            <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-[#849585] uppercase tracking-wider">
                  My Squad
                </h3>
                <span className="text-xs text-[#849585]">
                  {squadSize} / {maxSquad}
                </span>
              </div>
              {teamMeta.squad.length > 0 ? (
                <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                  {(["GKP", "DEF", "MID", "FWD"] as const).map((pos) => {
                    const players = teamMeta.squad.filter(
                      (p) => p.position === pos,
                    );
                    if (players.length === 0) return null;
                    return (
                      <div key={pos} className="mb-2">
                        <div className="text-[10px] text-[#849585] font-semibold uppercase mb-1">
                          {pos} ({players.length})
                        </div>
                        {players.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between text-xs bg-[#132030] rounded px-3 py-1.5 mb-0.5"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[#d6e4f9] truncate">
                                {p.name}
                              </span>
                              <span className="text-[#849585] shrink-0">
                                {p.team}
                              </span>
                            </div>
                            <span className="font-mono text-[#b9cbb9] shrink-0 ml-2">
                              &pound;{p.price}m
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#849585] italic text-center py-2">
                  No players yet
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-[#3b4b3d] grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs text-[#849585]">Budget</div>
                  <div className="text-sm font-mono text-[#d6e4f9]">
                    &pound;{teamMeta.budget_per_team}m
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#849585]">Spent</div>
                  <div className="text-sm font-mono text-[#d6e4f9]">
                    &pound;{teamMeta.spent}m
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#849585]">Left</div>
                  <div className="text-sm font-mono text-[#00e478]">
                    &pound;{remaining.toFixed(1)}m
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

