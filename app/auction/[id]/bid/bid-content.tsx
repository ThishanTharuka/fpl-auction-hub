"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { PlayerStatsBar } from "@/components/player-stats-bar";
import Counter from "@/components/counter";
import { TeamAvatar } from "@/components/team-avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";
import { resolveBidAmountWithTiers } from "@/lib/bid-increment";
import type { BidIncrementTier } from "@/lib/bid-increment";
import { useServerClock } from "@/lib/use-server-clock";
import { toast } from "sonner";
import { ChatDrawer } from "@/components/auction-chat/chat-drawer";
import type { EnrichedPlayer } from "@/lib/fpl-types";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import type { BidLeague, BidNomination } from "./bid-loader";

const supabase = createSupabaseBrowserClient();

function normalizeNomination(raw: Record<string, unknown>): BidNomination {
  return {
    ...(raw as unknown as BidNomination),
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

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  DEF: "bg-green-500/20 text-green-400 border-green-500/30",
  MID: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  FWD: "bg-red-500/20 text-red-400 border-red-500/30",
};

export interface Participant {
  id: string;
  name: string;
  color: string | null;
  avatar_url: string | null;
}

export interface SquadPlayer {
  id: number;
  name: string;
  position: string;
  price: number;
  team: string;
}

export interface TeamMeta {
  budget_per_team: number;
  spent: number;
  squad: SquadPlayer[];
}

interface AuctionEvent {
  type: "sold" | "unsold" | "cancelled";
  playerName: string;
  playerTeam: string | null;
  position: string;
  winnerName: string | null;
  winnerId: string | null;
  price: number;
  fplPlayerId: number;
  fullName: string;
}

interface BidEntry {
  id: string;
  nomination_id: string;
  participant_name: string;
  amount: number;
  created_at: string | null;
}

function dedupeRecentBids(bids: BidEntry[]): BidEntry[] {
  const seen = new Set<string>();
  const unique: BidEntry[] = [];
  for (const bid of bids) {
    if (seen.has(bid.id)) continue;
    seen.add(bid.id);
    unique.push(bid);
    if (unique.length === 10) break;
  }
  return unique;
}

interface CanBidArgs {
  nomination: BidNomination | null;
  myTeamId: string;
  myBid: number;
  maxBid: number;
  secondsLeft: number;
  remaining: number;
  myPosCount: number;
  posLimit: number;
  squadSize: number;
  maxSquad: number;
  clubCount: number;
  maxClub: number;
}

function checkCanBid(a: CanBidArgs): boolean {
  if (a.nomination?.status !== "open") return false;
  if (a.nomination.is_paused) return false;
  if (a.secondsLeft <= 0) return false;
  if (a.nomination.current_bidder_id === a.myTeamId) return false;
  if (a.nomination.current_bidder_id && a.myBid <= a.nomination.current_bid)
    return false;
  if (a.myBid > a.maxBid || a.myPosCount >= a.posLimit) return false;
  if (a.squadSize >= a.maxSquad) return false;
  if (a.clubCount >= a.maxClub) return false;
  return true;
}

export function BidContent({
  league: initialLeague,
  nomination: initialNomination,
  initialMyTeam,
  initialTeamMeta,
  initialAllParticipants,
  initialAllResults,
  initialPlayers,
}: {
  league: BidLeague;
  nomination: BidNomination | null;
  leagueId: string;
  initialMyTeam?: Participant | null;
  initialTeamMeta?: TeamMeta | null;
  initialAllParticipants: Participant[];
  initialAllResults: {
    fpl_player_id: number;
    participant_id: string | null;
    price_paid: number;
    position_slot: string | null;
    player_name: string | null;
    player_team: string | null;
  }[];
  initialPlayers: EnrichedPlayer[];
}) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [league] = useState<BidLeague>(initialLeague);
  const [myTeam, setMyTeam] = useState<Participant | null>(
    initialMyTeam ?? null,
  );
  const [teamMeta, setTeamMeta] = useState<TeamMeta | null>(
    initialTeamMeta ?? null,
  );
  const [nomination, setNomination] = useState<BidNomination | null>(
    initialNomination,
  );
  const [fplPlayer, setFplPlayer] = useState<EnrichedPlayer | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [bidding, setBidding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [auctionEvent, setAuctionEvent] = useState<AuctionEvent | null>(null);
  const [recentBids, setRecentBids] = useState<BidEntry[]>([]);
  const [allParticipants, setAllParticipants] = useState<Participant[]>(
    initialAllParticipants,
  );
  const [allResults, setAllResults] = useState(initialAllResults);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const serverClock = useServerClock();
  const fplPlayersMapRef = useRef<Map<number, EnrichedPlayer>>(new Map());

  useEffect(() => {
    fplPlayersMapRef.current = new Map(initialPlayers.map((p) => [p.id, p]));
  }, [initialPlayers]);

  useEffect(() => {
    if (nomination) {
      const p = fplPlayersMapRef.current.get(nomination.fpl_player_id) ?? null;
      setFplPlayer(p);
    }
  }, [nomination]);

  const loadMySquad = useCallback(
    async (
      participantId: string,
      lg: BidLeague | null,
      playerMap?: Map<number, EnrichedPlayer>,
    ) => {
      const { data: results } = await supabase
        .from("auction_results")
        .select(
          "fpl_player_id,price_paid,position_slot,player_name,player_team",
        )
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

  const loadBids = async (nominationId: string) => {
    const { data } = await supabase
      .from("auction_bids")
      .select("id,nomination_id,participant_name,amount,created_at")
      .eq("nomination_id", nominationId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setRecentBids(dedupeRecentBids(data as BidEntry[]));
  };

  const loadAllTeamData = useCallback(async () => {
    const [psRes, rsRes] = await Promise.all([
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
        .order("created_at", { ascending: true }),
    ]);
    if (psRes.data) setAllParticipants(psRes.data as Participant[]);
    if (rsRes.data) setAllResults(rsRes.data);
  }, [id]);

  // Auth-dependent setup: find my team membership (only if server didn't provide it)
  useEffect(() => {
    if (myTeam) return;
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const setup = async () => {
      const { data: membership } = await supabase
        .from("team_members")
        .select("participant_id")
        .eq("league_id", id)
        .eq("user_id", user.id)
        .eq("status", "approved")
        .single();

      if (!membership) {
        router.replace(`/auction/${id}`);
        return;
      }

      const { data: participant } = await supabase
        .from("participants")
        .select("id,name,color,avatar_url")
        .eq("id", membership.participant_id)
        .single();

      if (!participant) {
        setLoadError("Auction not found.");
        return;
      }

      setMyTeam(participant as Participant);
      await loadMySquad(
        membership.participant_id,
        league,
        fplPlayersMapRef.current,
      );
    };

    setup().catch(() => {});
  }, [myTeam, authLoading, user, router, id, league, loadMySquad]);

  // ── Auto-dismiss auction event ──────────────────────────────────────────────
  useEffect(() => {
    if (!auctionEvent) return;
    const id = setTimeout(() => setAuctionEvent(null), 10000);
    return () => clearTimeout(id);
  }, [auctionEvent]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!myTeam) return;

    const handleNominationChange = (
      payload: RealtimePostgresChangesPayload<BidNomination>,
    ) => {
      const row = normalizeNomination(payload.new as Record<string, unknown>);
      if (row.status === "open") {
        setNomination(row);
        setFplPlayer(fplPlayersMapRef.current.get(row.fpl_player_id) ?? null);
        setAuctionEvent(null);
        loadBids(row.id);
        return;
      }

      if (
        row.status === "sold" ||
        row.status === "unsold" ||
        row.status === "cancelled"
      ) {
        const player = fplPlayersMapRef.current.get(row.fpl_player_id);
        setAuctionEvent({
          type: row.status,
          playerName: row.player_name,
          playerTeam: row.player_team,
          position: row.position,
          winnerName: row.current_bidder_name,
          winnerId: row.current_bidder_id,
          price: row.current_bid,
          fplPlayerId: row.fpl_player_id,
          fullName: player?.full_name ?? row.player_name,
        });
      }

      setNomination(null);
      setFplPlayer(null);
      setSecondsLeft(0);
      setRecentBids([]);
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

  // ── Realtime: refresh team budget tracker on auction_results changes ─────────
  useEffect(() => {
    const channel = supabase
      .channel(`budgets-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auction_results",
          filter: `league_id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const r = payload.new as Record<string, unknown>;
            setAllResults((prev) =>
              prev.some(
                (x) =>
                  x.fpl_player_id === (r.fpl_player_id as number) &&
                  x.participant_id === (r.participant_id as string | null),
              )
                ? prev
                : [
                    ...prev,
                    {
                      fpl_player_id: r.fpl_player_id as number,
                      participant_id: r.participant_id as string | null,
                      price_paid: r.price_paid as number,
                      position_slot: r.position_slot as string | null,
                      player_name: r.player_name as string | null,
                      player_team: r.player_team as string | null,
                    },
                  ],
            );
          } else {
            loadAllTeamData().catch(() => {});
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [id, loadAllTeamData]);

  // ── Realtime: bid history ─────────────────────────────────────────────────
  useEffect(() => {
    if (!nomination) return;

    supabase
      .from("auction_bids")
      .select("id,nomination_id,participant_name,amount,created_at")
      .eq("nomination_id", nomination.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setRecentBids(dedupeRecentBids(data as BidEntry[]));
      });

    const channel = supabase
      .channel(`bid-history-${id}-${nomination.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "auction_bids",
          filter: `nomination_id=eq.${nomination.id}`,
        },
        (payload) => {
          const bid = payload.new as BidEntry;
          setRecentBids((prev) => dedupeRecentBids([bid, ...prev]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, nomination?.id]);

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
    const tiers = league.bid_increment_tiers as
      | BidIncrementTier[]
      | null
      | undefined;
    const bidAmount = resolveBidAmountWithTiers(
      nomination.current_bid,
      nomination.current_bidder_id,
      nomination.starting_price,
      tiers,
    );
    if (nomination.current_bidder_id && bidAmount <= nomination.current_bid) {
      setBidding(false);
      return;
    }
    const endTime = serverClock.toISO(
      serverClock.getServerNow() + (league.timer_seconds ?? 45) * 1000,
    );

    const nowIso = serverClock.toISO(serverClock.getServerNow());
    const { data: updatedRow, error: updateError } = await supabase
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
      .or(
        `current_bidder_id.is.null,current_bidder_id.neq.${myTeam.id}`,
      )
      .gt("bid_end_time", nowIso)
      .select("id")
      .maybeSingle();

    if (!updatedRow) {
      setBidding(false);
      if (updateError) {
        // Rejected by the DB monotonic guard — another bid arrived first.
        // Resync so the UI shows the true current price.
        const { data: fresh } = await supabase
          .from("auction_nominations")
          .select(
            "id,fpl_player_id,player_name,player_team,position,starting_price,current_bid,current_bidder_id,current_bidder_name,bid_end_time,is_paused,paused_seconds,status",
          )
          .eq("id", nomination.id)
          .single();
        if (fresh) {
          setNomination(
            normalizeNomination(fresh as Record<string, unknown>),
          );
          setFplPlayer(
            fplPlayersMapRef.current.get(
              (fresh as Record<string, unknown>).fpl_player_id as number,
            ) ?? null,
          );
          loadBids(nomination.id);
        }
        toast.warning("Bid rejected — the price moved. See the latest bid.");
      }
      return;
    }

    // Optimistically reflect the new bid so the button disables immediately
    // instead of waiting for the realtime echo.
    setNomination((prev) =>
      prev
        ? {
            ...prev,
            current_bid: bidAmount,
            current_bidder_id: myTeam.id,
            current_bidder_name: myTeam.name,
            is_paused: false,
            paused_seconds: null,
            bid_end_time: endTime,
          }
        : prev,
    );

    await supabase.from("auction_bids").insert({
      nomination_id: nomination.id,
      participant_id: myTeam.id,
      participant_name: myTeam.name,
      amount: bidAmount,
    });
    setBidding(false);
  }

  // ── Derived values (use fallbacks for pending team) ──────────────────────
  const allTeams = useMemo(() => {
    const budget = league.budget_per_team;
    return allParticipants.map((p) => {
      const teamResults = allResults.filter((r) => r.participant_id === p.id);
      const squad: SquadPlayer[] = teamResults.map((r) => ({
        id: r.fpl_player_id,
        name: r.player_name ?? "Unknown",
        position: r.position_slot ?? "?",
        price: r.price_paid,
        team: r.player_team ?? "",
      }));
      const spent = teamResults.reduce((s, r) => s + r.price_paid, 0);
      return { ...p, spent, remaining: budget - spent, squad };
    });
  }, [allParticipants, allResults, league.budget_per_team]);

  const derivedTeamMeta = useMemo<TeamMeta | null>(() => {
    if (!myTeam) return teamMeta;
    const playerMap = new Map(initialPlayers.map((p) => [p.id, p]));
    const myResults = allResults.filter(
      (r) => r.participant_id === myTeam.id,
    );
    const squad: SquadPlayer[] = myResults.map((r) => {
      const fpl = playerMap.get(r.fpl_player_id);
      return {
        id: r.fpl_player_id,
        name: r.player_name ?? fpl?.web_name ?? "Unknown",
        position: r.position_slot ?? fpl?.position ?? "?",
        price: r.price_paid,
        team: r.player_team ?? fpl?.team_short ?? "",
      };
    });
    const spent = myResults.reduce((s, r) => s + r.price_paid, 0);
    return {
      budget_per_team: league.budget_per_team,
      spent,
      squad,
    };
  }, [myTeam, allResults, initialPlayers, league.budget_per_team, teamMeta]);

  const soldPlayers = useMemo(() => {
    const participantMap = new Map(allParticipants.map((p) => [p.id, p]));
    const playerMap = new Map(initialPlayers.map((p) => [p.id, p]));
    return allResults
      .filter((r) => r.participant_id)
      .map((r) => {
        const fpl = playerMap.get(r.fpl_player_id);
        const buyer = r.participant_id
          ? participantMap.get(r.participant_id)
          : undefined;
        return {
          playerName: r.player_name ?? fpl?.web_name ?? "Unknown",
          playerTeam: r.player_team ?? fpl?.team_short ?? "",
          position: r.position_slot ?? fpl?.position ?? "?",
          price: r.price_paid,
          buyerName: buyer?.name ?? "Unknown",
          buyerColor: buyer?.color ?? null,
          fplPlayerId: r.fpl_player_id,
        };
      })
      .reverse();
  }, [allResults, allParticipants, initialPlayers]);

  // ── Error state ─────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        {loadError}
      </div>
    );
  }

  const pendingTeam = !myTeam;
  const remaining = derivedTeamMeta
    ? derivedTeamMeta.budget_per_team - derivedTeamMeta.spent
    : league.budget_per_team;
  const squadSize = derivedTeamMeta?.squad.length ?? 0;
  const maxSquad = league.squad_size ?? 15;
  const tiers = league.bid_increment_tiers as
    | BidIncrementTier[]
    | null
    | undefined;
  const myBid = nomination
    ? resolveBidAmountWithTiers(
        nomination.current_bid,
        nomination.current_bidder_id,
        nomination.starting_price,
        tiers,
      )
    : 0;
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
    ? (derivedTeamMeta?.squad.filter((p) => p.position === nomination.position)
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
  for (const p of derivedTeamMeta?.squad ?? []) {
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

  const nominatedClub = nomination?.player_team ?? "";
  const clubCount =
    nominatedClub && derivedTeamMeta
      ? derivedTeamMeta.squad.filter((p) => p.team === nominatedClub).length
      : 0;
  const maxClub = league.max_per_club ?? 3;

  const canBid = myTeam
    ? checkCanBid({
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
        clubCount,
        maxClub,
      })
    : false;

  let timerColor = "text-red-400";
  let timerHexColor = "#f87171";
  if (secondsLeft > 15) { timerColor = "text-[#00e478]"; timerHexColor = "#00e478"; }
  else if (secondsLeft > 5) { timerColor = "text-yellow-400"; timerHexColor = "#facc15"; }

  return (
    <BidUI
      league={league}
      myTeam={myTeam}
      teamMeta={derivedTeamMeta}
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
      timerHexColor={timerHexColor}
      posRequirements={posRequirements}
      totalMinAllocation={totalMinAllocation}
      totalRemainingSlots={totalRemainingSlots}
      totalMinAllocationAfterBid={totalMinAllocationAfterBid}
      totalRemainingSlotsAfterBid={totalRemainingSlotsAfterBid}
      clubCount={clubCount}
      maxClub={maxClub}
      auctionEvent={auctionEvent}
      pendingTeam={pendingTeam}
      leagueId={id}
      userId={user!.id}
      userName={
        myTeam && user
          ? `${myTeam.name} - ${user.user_metadata?.display_name ?? user.user_metadata?.["full_name"] ?? user.email ?? "Unknown"}`
          : "Unknown"
      }
      participantId={myTeam?.id ?? null}
      allParticipants={allParticipants}
      onBid={() => placeBid().catch(() => {})}
      allTeams={allTeams}
      expandedTeamId={expandedTeamId}
      onToggleTeam={(id) => setExpandedTeamId(id)}
      recentBids={recentBids}
      soldPlayers={soldPlayers}
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

export interface TeamBudget {
  id: string;
  name: string;
  color: string | null;
  avatar_url: string | null;
  spent: number;
  remaining: number;
  squad: SquadPlayer[];
}

interface SoldPlayer {
  playerName: string;
  playerTeam: string;
  position: string;
  price: number;
  buyerName: string;
  buyerColor: string | null;
  fplPlayerId: number;
}

type BidUIProps = Readonly<{
  league: BidLeague;
  myTeam: Participant | null;
  teamMeta: TeamMeta | null;
  nomination: BidNomination | null;
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
  clubCount: number;
  maxClub: number;
  timerColor: string;
  timerHexColor: string;
  posRequirements: PositionRequirement[];
  totalMinAllocation: number;
  totalRemainingSlots: number;
  totalMinAllocationAfterBid: number;
  totalRemainingSlotsAfterBid: number;
  auctionEvent: AuctionEvent | null;
  pendingTeam: boolean;
  onBid: () => void;
  allTeams: TeamBudget[];
  expandedTeamId: string | null;
  onToggleTeam: (id: string | null) => void;
  recentBids: BidEntry[];
  soldPlayers: SoldPlayer[];
  leagueId: string;
  userId: string;
  userName: string;
  participantId: string | null;
  allParticipants: Participant[];
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
  clubCount,
  maxClub,
  timerColor,
  timerHexColor,
  posRequirements,
  totalMinAllocation,
  totalRemainingSlots,
  totalMinAllocationAfterBid,
  totalRemainingSlotsAfterBid,
  auctionEvent,
  pendingTeam,
  onBid,
  allTeams,
  expandedTeamId,
  onToggleTeam,
  recentBids,
  soldPlayers,
  leagueId,
  userId,
  userName,
  participantId,
  allParticipants,
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
        {/* ── Centre: Bidding ──────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col gap-4 overflow-hidden lg:order-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#849585] pb-1">{league.name}</p>
              <h1 className="text-lg font-bold text-[#d6e4f9] flex items-center gap-2">
                {pendingTeam ? (
                  <span className="text-[#849585] text-base font-normal">
                    Loading team info...
                  </span>
                ) : (
                  <>
                    <TeamAvatar
                      name={myTeam!.name}
                      color={myTeam!.color}
                      src={myTeam!.avatar_url}
                      size="sm"
                    />
                    {myTeam!.name}
                  </>
                )}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <ChatDrawer
                leagueId={leagueId}
                userId={userId}
                userName={userName}
                participantId={participantId}
                participants={allParticipants}
                auctioneerId={league.created_by}
              />
              <div className="text-right">
                <div className="text-2xl font-mono font-bold text-[#00e478]">
                  {pendingTeam ? "\u2014" : `\u00a3${remaining.toFixed(1)}m`}
                </div>
                <div className="text-xs text-[#849585]">remaining</div>
              </div>
            </div>
          </div>

          {/* Live nomination */}
          {nomination ? (
            <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5">
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
                  <div className="font-mono font-bold">
                    {typeof timerDisplayValue === "number" ? (
                      <Counter
                        value={timerDisplayValue}
                        fontSize={36}
                        textColor={timerHexColor}
                        fontWeight={700}
                        gradientHeight={8}
                        gradientFrom="#132030"
                        gap={2}
                        horizontalPadding={0}
                        places={[...String(timerDisplayValue)].map(
                          (_, i, a) => 10 ** (a.length - i - 1),
                        )}
                      />
                    ) : (
                      <span className={`text-4xl ${timerColor}`}>
                        {timerDisplayValue}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#849585]">
                    {nomination.is_paused ? "paused" : "secs"}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                {fplPlayer ? (
                  <PlayerStatsBar player={fplPlayer} />
                ) : (
                  <div className="rounded-2xl border border-[#1e3248] bg-[linear-gradient(160deg,#0f2236_0%,#0a1724_100%)] p-4 animate-pulse">
                    <div className="flex gap-4 flex-wrap items-start">
                      <div className="w-[120px] h-[148px] rounded-xl bg-[#0a1724]" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-5 w-44 rounded bg-[#0a1724]" />
                        <div className="h-3 w-24 rounded bg-[#0a1724]" />
                        <div className="h-5 w-16 rounded-full bg-[#102133]" />
                        <div className="h-3 w-16 rounded bg-[#0a1724]" />
                        <div className="h-3 w-20 rounded bg-[#0a1724]" />
                      </div>
                      <div className="shrink-0 grid grid-cols-1 gap-2">
                        <div className="h-[68px] w-[76px] rounded-xl bg-[#0a1724]" />
                        <div className="h-[68px] w-[76px] rounded-xl bg-[#0a1724]" />
                      </div>
                    </div>
                    <div className="my-3 border-t border-[#1a2e42]" />
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-[52px] rounded-xl bg-[#0a1724]"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#132030] rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-[#849585] uppercase tracking-wider">
                    {nomination.current_bidder_id === null
                      ? "Starting Price"
                      : "Current Bid"}
                  </div>
                  <Drawer direction="left">
                    <DrawerTrigger asChild>
                      <Button
                        variant="outline"
                        className="border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b] text-xs py-1.5 h-auto px-3"
                      >
                        Bid History ({recentBids.length})
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <DrawerHeader>
                        <DrawerTitle className="text-xs font-semibold text-[#849585] uppercase tracking-wider">
                          Bid History
                        </DrawerTitle>
                      </DrawerHeader>
                      <div className="space-y-1 overflow-y-auto flex-1 px-4 pb-4">
                        {recentBids.map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between text-sm bg-[#132030] rounded px-3 py-2"
                          >
                            <span className="text-[#d6e4f9]">
                              {b.participant_name}
                            </span>
                            <span className="font-mono text-[#00e478]">
                              £{b.amount}m
                            </span>
                          </div>
                        ))}
                        {recentBids.length === 0 && (
                          <p className="text-xs text-[#849585] italic text-center py-4">
                            No bids yet
                          </p>
                        )}
                      </div>
                    </DrawerContent>
                  </Drawer>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div className="text-3xl font-mono font-bold text-[#00e478] inline-flex items-center">
                    &pound;
                    <Counter
                      value={nomination.current_bid}
                      fontSize={34}
                      textColor="#00e478"
                      fontWeight={700}
                      gradientHeight={5}
                      gradientFrom="#132030"
                      gap={0}
                      horizontalPadding={2}
                    />
                    m
                  </div>
                  {nomination.current_bidder_name && (
                    <div className="text-sm text-[#b9cbb9] text-right">
                      {nomination.current_bidder_id === myTeam?.id ? (
                        <span className="text-[#00e478] font-semibold">
                          You are the highest bidder
                        </span>
                      ) : (
                        <span>
                          by{" "}
                          <span className="font-semibold text-[#d6e4f9]">
                            {nomination.current_bidder_name}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#849585] mb-2">
                <span>
                  Maximum bid for the player: &pound;{maxBid.toFixed(1)}m
                </span>
                {myBid > maxBid && nomination && (
                  <span className="text-yellow-400">
                    Must reserve &pound;
                    {totalMinAllocationAfterBid.toFixed(1)}m for remaining slots
                  </span>
                )}
              </div>

              <Button
                onClick={onBid}
                disabled={!canBid || bidding}
                className="w-full bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-bold text-xl py-7 disabled:opacity-40"
              >
                {bidding ? "Placing..." : `Bid \u00a3${myBid}m`}
              </Button>

              {nomination.current_bidder_id === myTeam?.id && (
                <p className="text-xs text-[#849585] text-center mt-2">
                  You are already the highest bidder
                </p>
              )}
              {myPosCount >= posLimit && (
                <p className="text-xs text-red-400 text-center mt-2">
                  Position limit reached ({posLimit} {nomination.position})
                </p>
              )}
              {nomination && clubCount >= maxClub && (
                <p className="text-xs text-red-400 text-center mt-2">
                  Club limit reached ({maxClub} {nomination.player_team})
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
          ) : auctionEvent ? (
            <AuctionEventDisplay
              event={auctionEvent}
              myTeamId={myTeam?.id ?? ""}
            />
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-[#3b4b3d] bg-[#0f1c2c] min-h-[300px]">
              <div className="text-center">
                <div className="text-4xl mb-3">
                  {/* hourglass placeholder */}
                </div>
                <p className="text-[#849585]">Waiting for next nomination...</p>
              </div>
            </div>
          )}
        </main>

        {/* ── Right: Team Requirement ────────────────────────────────────── */}
        <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-3 lg:order-3">
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

          {/* Sold Players */}
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4">
            <h3 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-3">
              Sold Players ({soldPlayers.length})
            </h3>
            <div className="space-y-1 max-h-87 overflow-y-auto">
              {soldPlayers.length === 0 ? (
                <p className="text-xs text-[#849585] italic text-center py-2">
                  No sales yet
                </p>
              ) : (
                soldPlayers.map((s, i) => (
                  <div
                    key={`${s.fplPlayerId}-${i}`}
                    className="text-xs bg-[#132030] rounded px-2.5 py-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        <span className="text-[#d6e4f9] font-medium">
                          {s.playerName}
                        </span>
                        <span className="text-[#849585] ml-1">
                          {s.position}
                        </span>
                      </span>
                      <span className="font-mono text-[#00e478] shrink-0 ml-2">
                        &pound;{s.price}m
                      </span>
                    </div>
                    <div className="mt-0.5 text-[#849585] truncate">
                      {s.buyerName}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* ── Left: My Squad ────────────────────────────────────────────── */}
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

          {/* ── All Teams Budget ───────────────────────────────────────── */}
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4">
            <h3 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-3">
              All Teams
            </h3>
            <div className="space-y-1 max-h-[40vh] overflow-y-auto">
              {allTeams.map((t) => (
                <div key={t.id}>
                  <button
                    onClick={() =>
                      onToggleTeam(expandedTeamId === t.id ? null : t.id)
                    }
                    className="w-full flex items-center justify-between gap-2 rounded bg-[#132030] px-3 py-1.5 text-xs hover:bg-[#1a2e42] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamAvatar
                        name={t.name}
                        color={t.color}
                        src={t.avatar_url}
                        size="sm"
                      />
                      <Tooltip>
                        <TooltipTrigger render={<span />} className="text-[#d6e4f9] truncate">
                          {t.name}
                        </TooltipTrigger>
                        <TooltipContent>{t.name}</TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono ${t.remaining >= 0 ? "text-[#b9cbb9]" : "text-red-400"}`}
                      >
                        &pound;{t.remaining.toFixed(1)}m
                      </span>
                      <span className="text-[#849585]">{t.squad.length}</span>
                    </div>
                  </button>
                  {expandedTeamId === t.id && (
                    <div className="ml-4 mt-1 mb-1 space-y-0.5">
                      {t.squad.length === 0 && (
                        <p className="text-[10px] text-[#849585] italic px-2 py-1">
                          No players yet
                        </p>
                      )}
                      {(["GKP", "DEF", "MID", "FWD"] as const).map((pos) => {
                        const players = t.squad.filter(
                          (p) => p.position === pos,
                        );
                        if (players.length === 0) return null;
                        return (
                          <div key={pos}>
                            <div className="text-[10px] text-[#849585] font-semibold uppercase px-2 py-0.5">
                              {pos} ({players.length})
                            </div>
                            {players.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between text-[11px] bg-[#0f1c2c] rounded px-2 py-0.5"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-[#d6e4f9] truncate">
                                    {p.name}
                                  </span>
                                  <span className="text-[#849585] shrink-0">
                                    {p.team}
                                  </span>
                                </div>
                                <span className="font-mono text-[#b9cbb9] shrink-0 ml-1">
                                  &pound;{p.price}m
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function AuctionEventDisplay({
  event,
  myTeamId,
}: {
  event: AuctionEvent;
  myTeamId: string;
}) {
  const isWinner = event.type === "sold" && event.winnerId === myTeamId;

  const borderColor =
    event.type === "sold"
      ? "border-[#00e478]"
      : event.type === "unsold"
        ? "border-yellow-500/50"
        : "border-red-500/50";

  const badgeLabel =
    event.type === "sold"
      ? "SOLD"
      : event.type === "unsold"
        ? "UNSOLD"
        : "CANCELLED";

  const badgeColor =
    event.type === "sold"
      ? "text-[#00e478]"
      : event.type === "unsold"
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div
      className={`rounded-lg border-2 ${borderColor} bg-[#0f1c2c] p-6 min-h-[300px] flex flex-col items-center justify-center text-center space-y-3`}
    >
      <div className={`text-4xl font-bold leading-none ${badgeColor}`}>
        {badgeLabel}
      </div>
      <h2 className="text-2xl font-bold text-[#d6e4f9]">
        {event.fullName}
      </h2>
      <p className="text-sm">
        {event.type === "sold" && isWinner ? (
          <span className="text-[#00e478] font-semibold">
            Won by your team for &pound;{event.price}m
          </span>
        ) : event.type === "sold" ? (
          <span className="text-[#b9cbb9]">
            Sold to{" "}
            <span className="font-semibold text-[#d6e4f9]">
              {event.winnerName}
            </span>{" "}
            for{" "}
            <span className="font-mono text-[#00e478] font-bold">
              &pound;{event.price}m
            </span>
          </span>
        ) : event.type === "unsold" ? (
          <span className="text-yellow-400">Player went unsold</span>
        ) : (
          <span className="text-red-400">Nomination was cancelled</span>
        )}
      </p>
      <p className="text-xs text-[#849585] pt-2">
        Waiting for next nomination...
      </p>
    </div>
  );
}
