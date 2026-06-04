"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";
import { useServerClock } from "@/lib/use-server-clock";
import { PlayerStatsBar } from "@/components/player-stats-bar";
import type { EnrichedPlayer } from "@/lib/fpl-types";
import type { RealtimeChannel } from "@supabase/supabase-js";

const supabase = createSupabaseBrowserClient();

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

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  DEF: "bg-green-500/20 text-green-400 border-green-500/30",
  MID: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  FWD: "bg-red-500/20 text-red-400 border-red-500/30",
};

interface League {
  id: string;
  name: string;
  created_by: string | null;
  budget_per_team: number;
  timer_seconds: number | null;
  bid_increment: number | null;
  base_price_gkp: number | null;
  base_price_def: number | null;
  base_price_mid: number | null;
  base_price_fwd: number | null;
  status: string | null;
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

interface TeamBudget {
  id: string;
  name: string;
  color: string | null;
  spent: number;
  squad: number;
}

export default function AuctioneerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [league, setLeague] = useState<League | null>(null);
  const [soldIds, setSoldIds] = useState<Set<number>>(new Set());
  const [teams, setTeams] = useState<TeamBudget[]>([]);
  const [nomination, setNomination] = useState<Nomination | null>(null);
  const [recentBids, setRecentBids] = useState<BidEntry[]>([]);
  const [soldLog, setSoldLog] = useState<
    { name: string; team: string; price: number; pos: string; playerId: number; participantId: string }[]
  >([]);

  const [players, setPlayers] = useState<EnrichedPlayer[]>([]);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");

  // Staged = player selected but bidding not yet started
  const [stagedPlayer, setStagedPlayer] = useState<EnrichedPlayer | null>(null);
  const [startTimerInput, setStartTimerInput] = useState("45");
  const [extendInput, setExtendInput] = useState("30");

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<"sold" | "budgets">("sold");
  const [confirmRebid, setConfirmRebid] = useState<{
    name: string; team: string; price: number; pos: string; playerId: number; participantId: string
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lock body scroll when bottom sheet is open
  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const serverClock = useServerClock();

  // ── Load initial data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    async function load() {
      const [{ data: lg }, { data: ps }, playersRes, { data: results }] =
        await Promise.all([
          supabase.from("leagues").select("*").eq("id", id).single(),
          supabase.from("participants").select("*").eq("league_id", id).order("name"),
          fetch("/api/fpl/bootstrap").then((r) => r.json()),
          supabase
            .from("auction_results")
            .select("fpl_player_id, price_paid, participant_id, position_slot, player_name, player_team")
            .eq("league_id", id),
        ]);

      if (lg) {
        if (user?.id !== (lg as League).created_by) {
          router.replace(`/auction/${id}`);
          return;
        }
        setLeague(lg as League);
      }
      if (playersRes?.players) setPlayers(playersRes.players as EnrichedPlayer[]);

      if (ps && results) {
        const spentMap: Record<string, number> = {};
        const squadMap: Record<string, number> = {};
        const teamMap = new Map(ps.map((p) => [p.id, p.name]));
        const playersById = new Map<number, EnrichedPlayer>((playersRes?.players ?? []).map((p: EnrichedPlayer) => [p.id, p]));
        const soldSet = new Set<number>();
        const restoredSoldLog: { name: string; team: string; price: number; pos: string; playerId: number; participantId: string }[] = [];
        for (const r of results) {
          soldSet.add(r.fpl_player_id);
          if (r.participant_id) {
            spentMap[r.participant_id] = (spentMap[r.participant_id] ?? 0) + r.price_paid;
            squadMap[r.participant_id] = (squadMap[r.participant_id] ?? 0) + 1;
            const playerInfo = playersById.get(r.fpl_player_id);
            restoredSoldLog.push({
              name: r.player_name ?? playerInfo?.web_name ?? "Unknown",
              team: teamMap.get(r.participant_id) ?? "Unknown",
              price: r.price_paid,
              pos: r.position_slot ?? playerInfo?.position ?? "?",
              playerId: r.fpl_player_id,
              participantId: r.participant_id,
            });
          }
        }
        const soldLogDescending = [...restoredSoldLog].reverse();
        setSoldIds(soldSet);
        setSoldLog(soldLogDescending);
        setTeams(
          ps.map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            spent: spentMap[p.id] ?? 0,
            squad: squadMap[p.id] ?? 0,
          })),
        );
      }

      // Load any open nomination
      const { data: nom } = await supabase
        .from("auction_nominations")
        .select("*")
        .eq("league_id", id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (nom) {
        setNomination(normalizeNomination(nom as Record<string, unknown>));
        loadBids(nom.id);
      }
    }
    void load();
  }, [id, authLoading, router, user?.id]);

  async function loadBids(nominationId: string) {
    const { data } = await supabase
      .from("auction_bids")
      .select("*")
      .eq("nomination_id", nominationId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setRecentBids(dedupeRecentBids(data as BidEntry[]));
  }

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    channelRef.current = supabase
      .channel(`auctioneer-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "auction_nominations", filter: `league_id=eq.${id}` },
        (payload) => {
          const row = normalizeNomination(payload.new as Record<string, unknown>);
          if (row.status === "open") {
            setNomination(row);
            loadBids(row.id);
          } else if (row.status === "sold" || row.status === "cancelled" || row.status === "unsold") {
            setNomination(null);
            setRecentBids([]);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "auction_bids" },
        (payload) => {
          const bid = payload.new as BidEntry;
          setRecentBids((prev) => dedupeRecentBids([bid, ...prev]));
          setNomination((prev) =>
            prev
              ? {
                  ...prev,
                  current_bid: bid.amount,
                  current_bidder_name: bid.participant_name,
                }
              : prev,
          );
        },
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current).catch(() => {});
    };
  }, [id]);

  // ── Timer countdown ────────────────────────────────────────────────────────
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
      Math.round((new Date(nomination.bid_end_time).getTime() - serverClock.getServerNow()) / 1000),
    );
    setSecondsLeft(remaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomination]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (nomination?.bid_end_time && nomination.status === "open" && nomination.is_paused === false) {
      timerRef.current = setInterval(tickTimer, 500);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nomination?.bid_end_time, nomination?.status, nomination?.is_paused, nomination?.paused_seconds, tickTimer]);

  // ── Actions ────────────────────────────────────────────────────────────────
  function stagePlayer(player: EnrichedPlayer) {
    setStagedPlayer(player);
    setStartTimerInput(String(Math.min(60, Math.max(5, Math.round((league?.timer_seconds ?? 45) / 5) * 5))));
    setSearch("");
  }

  async function startBidding() {
    if (!stagedPlayer) return;
    const posKey = stagedPlayer.position.toLowerCase() as "gkp" | "def" | "mid" | "fwd";
    const basePriceMap = {
      gkp: league?.base_price_gkp ?? 4,
      def: league?.base_price_def ?? 4.5,
      mid: league?.base_price_mid ?? 5,
      fwd: league?.base_price_fwd ?? 5,
    };
    const startingPrice = basePriceMap[posKey] ?? 4;
    const timerSecs = Math.max(5, Number(startTimerInput) || (league?.timer_seconds ?? 45));
    const endTime = serverClock.toISO(serverClock.getServerNow() + timerSecs * 1000);

    const { data } = await supabase
      .from("auction_nominations")
      .insert({
        league_id: id,
        fpl_player_id: stagedPlayer.id,
        player_name: stagedPlayer.web_name,
        player_team: stagedPlayer.team_short,
        position: stagedPlayer.position,
        starting_price: startingPrice,
        current_bid: startingPrice,
        status: "open",
        is_paused: false,
        paused_seconds: null,
        bid_end_time: endTime,
      })
      .select()
      .single();

    if (data) {
      setNomination(normalizeNomination(data as Record<string, unknown>));
      setRecentBids([]);
      setStagedPlayer(null);
    }
  }

  async function gavel() {
    if (!nomination) return;
    if (!nomination.current_bidder_id) {
      await cancelNomination();
      return;
    }

    const winnerTeam = teams.find((t) => t.id === nomination.current_bidder_id);

    await Promise.all([
      supabase
        .from("auction_nominations")
        .update({
          status: "sold",
          winning_participant_id: nomination.current_bidder_id,
          winning_price: nomination.current_bid,
        })
        .eq("id", nomination.id),
      supabase.from("auction_results").insert({
        league_id: id,
        participant_id: nomination.current_bidder_id,
        fpl_player_id: nomination.fpl_player_id,
        price_paid: nomination.current_bid,
        player_name: nomination.player_name,
        player_team: nomination.player_team,
        position_slot: nomination.position,
      }),
    ]);

    setSoldIds((prev) => new Set([...prev, nomination.fpl_player_id]));
    setTeams((prev) =>
      prev.map((t) =>
        t.id === nomination.current_bidder_id
          ? { ...t, spent: t.spent + nomination.current_bid, squad: t.squad + 1 }
          : t,
      ),
    );
    setSoldLog((prev) => [
      {
        name: nomination.player_name,
        team: winnerTeam?.name ?? nomination.current_bidder_name ?? "?",
        price: nomination.current_bid,
        pos: nomination.position,
        playerId: nomination.fpl_player_id,
        participantId: nomination.current_bidder_id ?? "",
      },
      ...(prev ?? []),
    ]);
    setNomination(null);
    setRecentBids([]);
    setSecondsLeft(0);
  }

  async function handleConfirmRebid(stage: boolean) {
    if (!confirmRebid) return;
    const player = players.find((p) => p.id === confirmRebid.playerId);
    await supabase
      .from("auction_results")
      .delete()
      .eq("league_id", id)
      .eq("fpl_player_id", confirmRebid.playerId);
    setSoldIds((prev) => { const next = new Set(prev); next.delete(confirmRebid.playerId); return next; });
    setSoldLog((prev) => (prev ?? []).filter((s) => s.playerId !== confirmRebid.playerId));
    setTeams((prev) =>
      prev.map((t) =>
        t.id === confirmRebid.participantId
          ? { ...t, spent: t.spent - confirmRebid.price, squad: t.squad - 1 }
          : t,
      ),
    );
    setConfirmRebid(null);
    if (stage && player) stagePlayer(player);
  }

  async function cancelNomination() {
    if (!nomination) return;
    await supabase
      .from("auction_nominations")
      .update({ status: "cancelled" })
      .eq("id", nomination.id);
    setNomination(null);
    setRecentBids([]);
    setSecondsLeft(0);
  }

  async function extendTimer() {
    if (!nomination) return;
    const secs = Math.max(5, Number(extendInput) || (league?.timer_seconds ?? 45));
    if (nomination.is_paused) {
      const pausedSeconds = (nomination.paused_seconds ?? 0) + secs;
      await supabase
        .from("auction_nominations")
        .update({ paused_seconds: pausedSeconds })
        .eq("id", nomination.id);
      setNomination((prev) => (prev ? { ...prev, paused_seconds: pausedSeconds } : prev));
      return;
    }
    const newEnd = serverClock.toISO(serverClock.getServerNow() + secs * 1000);
    await supabase
      .from("auction_nominations")
      .update({ bid_end_time: newEnd })
      .eq("id", nomination.id);
    setNomination((prev) => (prev ? { ...prev, bid_end_time: newEnd } : prev));
  }

  async function pauseTimer() {
    if (!nomination || nomination.is_paused) return;
    const remaining = nomination.bid_end_time
      ? Math.max(0, Math.round((new Date(nomination.bid_end_time).getTime() - serverClock.getServerNow()) / 1000))
      : 0;
    await supabase
      .from("auction_nominations")
      .update({ is_paused: true, paused_seconds: remaining, bid_end_time: null })
      .eq("id", nomination.id);
    setNomination((prev) => (prev ? { ...prev, is_paused: true, paused_seconds: remaining, bid_end_time: null } : prev));
  }

  async function resumeTimer() {
    if (!nomination || nomination.is_paused === false) return;
    const secs = Math.max(1, nomination.paused_seconds ?? (league?.timer_seconds ?? 45));
    const newEnd = serverClock.toISO(serverClock.getServerNow() + secs * 1000);
    await supabase
      .from("auction_nominations")
      .update({ is_paused: false, paused_seconds: null, bid_end_time: newEnd })
      .eq("id", nomination.id);
    setNomination((prev) => (prev ? { ...prev, is_paused: false, paused_seconds: null, bid_end_time: newEnd } : prev));
  }

  async function markUnsold() {
    if (!nomination) return;
    await supabase
      .from("auction_nominations")
      .update({ status: "unsold" })
      .eq("id", nomination.id);
    setNomination(null);
    setRecentBids([]);
    setSecondsLeft(0);
  }

  const filteredPlayers = players.filter((p) => {
    if (soldIds.has(p.id)) return false;
    if (posFilter !== "ALL" && p.position !== posFilter) return false;
    if (!search) return false;
    const q = search.toLowerCase();
    return (
      p.web_name.toLowerCase().includes(q) ||
      p.team_short.toLowerCase().includes(q)
    );
  });

  let timerColor = "text-red-400";
  if (secondsLeft > 15) timerColor = "text-[#00e478]";
  else if (secondsLeft > 5) timerColor = "text-yellow-400";
  let timerDisplayValue: number | string = "—";
  if (nomination) {
    if (nomination.is_paused) {
      timerDisplayValue = nomination.paused_seconds ?? 0;
    } else if (nomination.bid_end_time) {
      timerDisplayValue = secondsLeft;
    }
  }
  const timerDisplayUnit = nomination?.is_paused ? "paused" : "seconds";

  return (
    <div className="min-h-screen lg:h-screen overflow-y-auto lg:overflow-hidden">
      <div className="mx-auto max-w-[1440px] flex flex-col lg:flex-row gap-4 h-full px-4 py-4">
        {/* ── Left: Player search (always) + sold log (desktop) ─────────────── */}
        <aside className="w-full lg:w-72 flex flex-col gap-4 overflow-hidden">
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#849585] uppercase tracking-wider">
                Nominate Player
              </h2>
              {/* Mobile: bottom sheet toggle */}
              <div className="flex items-center gap-2 lg:hidden">
                <button
                  onClick={() => {
                    setSheetTab("sold");
                    setSheetOpen(true);
                  }}
                  className="text-[10px] text-[#849585] hover:text-[#d6e4f9] border border-[#3b4b3d] rounded px-2 py-1"
                >
                  Sold ({soldIds.size})
                </button>
                <button
                  onClick={() => {
                    setSheetTab("budgets");
                    setSheetOpen(true);
                  }}
                  className="text-[10px] text-[#849585] hover:text-[#d6e4f9] border border-[#3b4b3d] rounded px-2 py-1"
                >
                  Budgets
                </button>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              {["ALL", "GKP", "DEF", "MID", "FWD"].map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPosFilter(pos)}
                  className={`flex-1 text-[10px] font-bold rounded py-1 border ${
                    posFilter === pos
                      ? "bg-[#00e478] text-[#003919] border-[#00e478]"
                      : "border-[#3b4b3d] text-[#849585] hover:text-[#d6e4f9]"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
            <Input
              placeholder="Search player or club…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] placeholder:text-[#849585] h-8 text-xs"
            />
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {search.length > 0 && filteredPlayers.length === 0 && (
                <p className="text-xs text-[#849585] italic text-center py-2">
                  No players found
                </p>
              )}
              {filteredPlayers.slice(0, 20).map((p) => (
                <button
                  key={p.id}
                  disabled={!!nomination || !!stagedPlayer}
                  onClick={() => stagePlayer(p)}
                  className="w-full flex items-center justify-between rounded bg-[#132030] hover:bg-[#1e2b3b] disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-left"
                >
                  <div>
                    <div className="text-xs font-medium text-[#d6e4f9]">
                      {p.web_name}
                    </div>
                    <div className="text-[10px] text-[#849585]">
                      {p.team_short}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] ${POSITION_COLORS[p.position] ?? ""}`}
                  >
                    {p.position}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Sold log (desktop only) */}
          <div className="hidden lg:flex rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4 flex-1 overflow-hidden flex-col">
            <h2 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-2">
              Sold ({soldIds.size})
            </h2>
            <div className="space-y-1 overflow-y-auto flex-1">
              {(soldLog ?? []).map((s, i) => (
                <div
                  key={`sold-${i}-${s.name}`}
                  className="flex items-center justify-between text-xs bg-[#132030] rounded px-2.5 py-1.5"
                >
                  <div>
                    <span className="text-[#d6e4f9] font-medium">{s.name}</span>
                    <span className="text-[#849585] ml-1">→ {s.team}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[#00e478]">
                      £{s.price}m
                    </span>
                    <button
                      onClick={() => setConfirmRebid(s)}
                      className="text-[10px] text-[#849585] hover:text-yellow-400 border border-[#3b4b3d] rounded px-1 py-0.5"
                      title="Rebid this player"
                    >
                      ↩
                    </button>
                  </div>
                </div>
              ))}
              {(soldLog ?? []).length === 0 && (
                <p className="text-xs text-[#849585] italic text-center py-2">
                  No sales yet
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* ── Centre: Live nomination ─────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Staged: player selected, not yet started */}
          {!nomination && stagedPlayer && (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-950/20 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={POSITION_COLORS[stagedPlayer.position] ?? ""}
                    >
                      {stagedPlayer.position}
                    </Badge>
                    <span className="text-xs text-[#849585]">
                      {stagedPlayer.team_name}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#d6e4f9]">
                    {stagedPlayer.full_name}
                  </h2>
                  <p className="text-sm text-[#849585] mt-1">
                    Ready to nominate — set timer and start
                  </p>
                </div>
                <button
                  onClick={() => setStagedPlayer(null)}
                  className="text-xs text-[#849585] hover:text-red-400 border border-[#3b4b3d] rounded px-2 py-1"
                >
                  ✕ Cancel
                </button>
              </div>
              <PlayerStatsBar player={stagedPlayer} wide />
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#849585] whitespace-nowrap">
                    Timer
                  </span>
                  <select
                    aria-label="Timer in seconds"
                    value={startTimerInput}
                    onChange={(e) => setStartTimerInput(e.target.value)}
                    className="bg-[#132030] border border-[#3b4b3d] text-[#d6e4f9] rounded-md h-9 text-sm px-2 outline-none focus:border-[#00e478] cursor-pointer"
                  >
                    {[10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((s) => (
                      <option key={s} value={String(s)}>
                        {s}s
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={() => startBidding().catch(() => {})}
                  className="flex-1 bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-bold text-base py-5"
                >
                  ▶ Start Bidding
                </Button>
              </div>
            </div>
          )}
          {nomination ? (
            <>
              {/* Player card */}
              <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
                  <div>
                    {(() => {
                      const player = players.find(
                        (pl) => pl.id === nomination.fpl_player_id,
                      );
                      const clubName =
                        player?.team_name ?? nomination.player_team;
                      const playerName =
                        player?.full_name ?? nomination.player_name;
                      return (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className={`${POSITION_COLORS[nomination.position] ?? ""}`}
                            >
                              {nomination.position}
                            </Badge>
                            <span className="text-xs text-[#849585]">
                              {clubName}
                            </span>
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-bold text-[#d6e4f9]">
                            {playerName}
                          </h2>
                          <p className="text-sm text-[#849585] mt-1">
                            Starting price: £{nomination.starting_price}m
                          </p>
                        </>
                      );
                    })()}
                  </div>
                  {/* Timer */}
                  <div className="text-right">
                    <div
                      className={`text-3xl sm:text-5xl font-mono font-bold ${timerColor}`}
                    >
                      {timerDisplayValue}
                    </div>
                    <div className="text-xs text-[#849585] mt-1">
                      {timerDisplayUnit}
                    </div>
                  </div>
                </div>

                {/* Stats for nominated player */}
                {(() => {
                  const p = players.find(
                    (pl) => pl.id === nomination.fpl_player_id,
                  );
                  return p ? (
                    <PlayerStatsBar player={p} className="mb-4" wide />
                  ) : null;
                })()}

                {/* Current bid */}
                <div className="bg-[#132030] rounded-lg p-4 mb-4">
                  <div className="text-xs text-[#849585] uppercase tracking-wider mb-1">
                    {nomination.current_bidder_id === null
                      ? "Starting Price"
                      : "Current Bid"}
                  </div>
                  <div className="text-3xl sm:text-4xl font-mono font-bold text-[#00e478]">
                    £{nomination.current_bid}m
                  </div>
                  {nomination.current_bidder_name && (
                    <div className="text-sm text-[#b9cbb9] mt-1">
                      by{" "}
                      <span className="font-semibold text-[#d6e4f9]">
                        {nomination.current_bidder_name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={gavel}
                    disabled={!nomination.current_bidder_id}
                    className="flex-1 min-w-[200px] bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-bold text-lg py-6"
                  >
                    <span className="hidden sm:inline">
                      🔨 SOLD — £{nomination.current_bid}m
                    </span>
                    <span className="sm:hidden">
                      🔨 £{nomination.current_bid}m
                    </span>
                  </Button>
                  {/* Unsold: only shown when timer expired and nobody bid */}
                  {secondsLeft === 0 && !nomination.current_bidder_id && (
                    <Button
                      onClick={markUnsold}
                      variant="outline"
                      className="border-yellow-700 text-yellow-400 hover:bg-yellow-950/30 py-6 px-4"
                    >
                      Unsold
                    </Button>
                  )}
                  {/* Extend with seconds dropdown */}
                  <div className="flex items-stretch gap-1">
                    <Button
                      onClick={nomination.is_paused ? resumeTimer : pauseTimer}
                      variant="outline"
                      className="border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b] py-6 px-3 text-xs"
                    >
                      {nomination.is_paused ? "Resume" : "Pause"}
                    </Button>
                    <select
                      value={extendInput}
                      onChange={(e) => setExtendInput(e.target.value)}
                      className="bg-[#132030] border border-[#3b4b3d] text-[#d6e4f9] text-xs rounded-md px-2 outline-none focus:border-[#00e478] cursor-pointer"
                    >
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(
                        (s) => (
                          <option key={s} value={String(s)}>
                            {s}s
                          </option>
                        ),
                      )}
                    </select>
                    <Button
                      onClick={extendTimer}
                      variant="outline"
                      className="border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b] py-6 px-3 text-xs"
                    >
                      +s
                    </Button>
                  </div>
                  <Button
                    onClick={cancelNomination}
                    variant="outline"
                    className="border-red-900 text-red-400 hover:bg-red-950/30 py-6 px-4"
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              {/* Bid history */}
              <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4 flex-1 overflow-hidden flex flex-col">
                <h3 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-2">
                  Bid History
                </h3>
                <div className="space-y-1 overflow-y-auto flex-1">
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
              </div>
            </>
          ) : (
            !stagedPlayer && (
              <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-[#3b4b3d] bg-[#0f1c2c]">
                <div className="text-center">
                  <div className="text-4xl mb-3">🔨</div>
                  <p className="text-[#849585]">
                    Search and nominate a player to start
                  </p>
                </div>
              </div>
            )
          )}
        </main>

        {/* ── Right: Teams budgets (desktop only) ─────────────────────────────── */}
        <aside className="hidden lg:block w-full lg:w-60 rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4 overflow-y-auto">
          <h2 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-3">
            Budgets
          </h2>
          <BudgetList teams={teams} budget={league?.budget_per_team ?? 200} />
        </aside>

        {/* ── Rebid confirmation modal ────────────────────────────────────────── */}
        {confirmRebid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setConfirmRebid(null)}
            />
            <div className="relative bg-[#0f1c2c] border border-[#3b4b3d] rounded-xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
              <h3 className="text-sm font-semibold text-[#d6e4f9]">
                Rebid Player?
              </h3>
              <p className="text-sm text-[#849585]">
                Clear{" "}
                <span className="font-semibold text-[#d6e4f9]">
                  {confirmRebid.name}
                </span>{" "}
                (sold for{" "}
                <span className="font-mono text-[#00e478]">
                  £{confirmRebid.price}m
                </span>{" "}
                to {confirmRebid.team}) and stage them for nomination?
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button
                  onClick={() => setConfirmRebid(null)}
                  variant="outline"
                  className="border-[#3b4b3d] text-[#849585] hover:bg-[#1e2b3b]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleConfirmRebid(false).catch(() => {});
                  }}
                  variant="outline"
                  className="border-yellow-700 text-yellow-400 hover:bg-yellow-950/30"
                >
                  Clear
                </Button>
                <Button
                  onClick={() => {
                    handleConfirmRebid(true).catch(() => {});
                  }}
                  className="bg-yellow-500 text-black hover:bg-yellow-500/90 font-semibold"
                >
                  Yes, Rebid
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile bottom sheet: Sold + Budgets (tabs) ────────────────────── */}
        {sheetOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setSheetOpen(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-[#0a1522] rounded-t-xl border-t border-[#3b4b3d] flex flex-col overflow-hidden animate-slide-up">
              {/* Tab bar */}
              <div className="flex border-b border-[#3b4b3d] shrink-0">
                <button
                  onClick={() => setSheetTab("sold")}
                  className={`flex-1 text-xs font-semibold uppercase tracking-wider py-3 transition-colors ${
                    sheetTab === "sold"
                      ? "text-[#00e478] border-b-2 border-[#00e478]"
                      : "text-[#849585]"
                  }`}
                >
                  Sold ({soldIds.size})
                </button>
                <button
                  onClick={() => setSheetTab("budgets")}
                  className={`flex-1 text-xs font-semibold uppercase tracking-wider py-3 transition-colors ${
                    sheetTab === "budgets"
                      ? "text-[#00e478] border-b-2 border-[#00e478]"
                      : "text-[#849585]"
                  }`}
                >
                  Budgets
                </button>
              </div>
              {/* Tab content */}
              <div className="overflow-y-auto overscroll-contain flex-1 p-4">
                {sheetTab === "sold" ? (
                  <div className="space-y-1">
                    {(soldLog ?? []).map((s, i) => (
                      <div
                        key={`sold-mobile-${i}-${s.name}`}
                        className="flex items-center justify-between text-xs bg-[#132030] rounded px-2.5 py-1.5"
                      >
                        <div>
                          <span className="text-[#d6e4f9] font-medium">
                            {s.name}
                          </span>
                          <span className="text-[#849585] ml-1">
                            → {s.team}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[#00e478]">
                            £{s.price}m
                          </span>
                          <button
                            onClick={() => {
                              setSheetOpen(false);
                              setConfirmRebid(s);
                            }}
                            className="text-[10px] text-[#849585] hover:text-yellow-400 border border-[#3b4b3d] rounded px-1 py-0.5"
                            title="Rebid this player"
                          >
                            ↩
                          </button>
                        </div>
                      </div>
                    ))}
                    {(soldLog ?? []).length === 0 && (
                      <p className="text-xs text-[#849585] italic text-center py-2">
                        No sales yet
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <BudgetList
                      teams={teams}
                      budget={league?.budget_per_team ?? 200}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BudgetList({ teams, budget }: { teams: TeamBudget[]; budget: number }) {
  return (
    <div className="space-y-2">
      {[...teams]
        .sort((a, b) => b.spent - a.spent)
        .map((t) => {
          const remaining = budget - t.spent;
          const pct = Math.round((t.spent / budget) * 100);
          return (
            <div key={t.id} className="bg-[#132030] rounded p-2.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: t.color ?? "#888" }}
                  />
                  <span className="text-xs text-[#d6e4f9] truncate max-w-[90px]">
                    {t.name}
                  </span>
                </div>
                <span className="text-xs font-mono text-[#00e478]">
                  £{remaining}m
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#1e2b3b] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#00e478] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[10px] text-[#849585] mt-1">
                {t.squad} players · £{t.spent}m spent
              </div>
            </div>
          );
        })}
    </div>
  );
}
