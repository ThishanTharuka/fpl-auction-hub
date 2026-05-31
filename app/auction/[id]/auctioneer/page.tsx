"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";
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
  status: string;
}

interface BidEntry {
  id: string;
  participant_name: string;
  amount: number;
  created_at: string | null;
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

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
            .select("fpl_player_id, price_paid, participant_id")
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
        const soldSet = new Set<number>();
        for (const r of results) {
          soldSet.add(r.fpl_player_id);
          if (r.participant_id) {
            spentMap[r.participant_id] = (spentMap[r.participant_id] ?? 0) + r.price_paid;
            squadMap[r.participant_id] = (squadMap[r.participant_id] ?? 0) + 1;
          }
        }
        setSoldIds(soldSet);
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
  }, [id, authLoading]);

  async function loadBids(nominationId: string) {
    const { data } = await supabase
      .from("auction_bids")
      .select("*")
      .eq("nomination_id", nominationId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setRecentBids(data as BidEntry[]);
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
          setRecentBids((prev) => [bid, ...prev.slice(0, 9)]);
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
    if (!nomination?.bid_end_time) {
      setSecondsLeft(0);
      return;
    }
    const remaining = Math.max(
      0,
      Math.round((new Date(nomination.bid_end_time).getTime() - Date.now()) / 1000),
    );
    setSecondsLeft(remaining);
  }, [nomination?.bid_end_time]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    tickTimer();
    if (nomination?.bid_end_time && nomination.status === "open") {
      timerRef.current = setInterval(tickTimer, 500);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nomination?.bid_end_time, nomination?.status, tickTimer]);

  // ── Actions ────────────────────────────────────────────────────────────────
  function stagePlayer(player: EnrichedPlayer) {
    setStagedPlayer(player);
    setStartTimerInput(String(Math.min(60, Math.max(10, Math.round((league?.timer_seconds ?? 45) / 10) * 10))));
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
    const endTime = new Date(Date.now() + timerSecs * 1000).toISOString();

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

  async function rebid(entry: { name: string; team: string; price: number; pos: string; playerId: number; participantId: string }) {
    await supabase
      .from("auction_results")
      .delete()
      .eq("league_id", id)
      .eq("fpl_player_id", entry.playerId);
    setSoldIds((prev) => { const next = new Set(prev); next.delete(entry.playerId); return next; });
    setSoldLog((prev) => (prev ?? []).filter((s) => s.playerId !== entry.playerId));
    setTeams((prev) =>
      prev.map((t) =>
        t.id === entry.participantId
          ? { ...t, spent: t.spent - entry.price, squad: t.squad - 1 }
          : t,
      ),
    );
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
    const newEnd = new Date(Date.now() + secs * 1000).toISOString();
    await supabase
      .from("auction_nominations")
      .update({ bid_end_time: newEnd })
      .eq("id", nomination.id);
    setNomination((prev) => (prev ? { ...prev, bid_end_time: newEnd } : prev));
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

  return (
    <div className="flex gap-4 h-screen overflow-hidden px-4 py-4">
      {/* ── Left: Player search + sold log ─────────────────────────────────── */}
      <aside className="w-72 flex flex-col gap-4 overflow-hidden">
        {/* Player search */}
        <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4 flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-[#849585] uppercase tracking-wider">
            Nominate Player
          </h2>
          <div className="flex gap-1">
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
                  <div className="text-[10px] text-[#849585]">{p.team_short}</div>
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

        {/* Sold log */}
        <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4 flex-1 overflow-hidden flex flex-col">
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
                  <span className="font-mono text-[#00e478]">£{s.price}m</span>
                  <button
                    onClick={() => rebid(s).catch(() => {})}
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
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={POSITION_COLORS[stagedPlayer.position] ?? ""}>{stagedPlayer.position}</Badge>
                  <span className="text-xs text-[#849585]">{stagedPlayer.team_short}</span>
                </div>
                <h2 className="text-3xl font-bold text-[#d6e4f9]">{stagedPlayer.web_name}</h2>
                <p className="text-sm text-[#849585] mt-1">Ready to nominate — set timer and start</p>
              </div>
              <button
                onClick={() => setStagedPlayer(null)}
                className="text-xs text-[#849585] hover:text-red-400 border border-[#3b4b3d] rounded px-2 py-1"
              >
                ✕ Cancel
              </button>
            </div>
            <PlayerStatsBar player={stagedPlayer} />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                  <span className="text-xs text-[#849585] whitespace-nowrap">Timer</span>
                  <select
                    aria-label="Timer in seconds"
                    value={startTimerInput}
                    onChange={(e) => setStartTimerInput(e.target.value)}
                    className="bg-[#132030] border border-[#3b4b3d] text-[#d6e4f9] rounded-md h-9 text-sm px-2 outline-none focus:border-[#00e478] cursor-pointer"
                  >
                    {[10, 20, 30, 40, 50, 60].map((s) => (
                      <option key={s} value={String(s)}>{s}s</option>
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
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={`${POSITION_COLORS[nomination.position] ?? ""}`}
                    >
                      {nomination.position}
                    </Badge>
                    <span className="text-xs text-[#849585]">
                      {nomination.player_team}
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold text-[#d6e4f9]">
                    {nomination.player_name}
                  </h2>
                  <p className="text-sm text-[#849585] mt-1">
                    Starting price: £{nomination.starting_price}m
                  </p>
                </div>
                {/* Timer */}
                <div className="text-right">
                  <div className={`text-5xl font-mono font-bold ${timerColor}`}>
                    {nomination.bid_end_time ? secondsLeft : "—"}
                  </div>
                  <div className="text-xs text-[#849585] mt-1">seconds</div>
                </div>
              </div>

              {/* Stats for nominated player */}
              {(() => {
                const p = players.find((pl) => pl.id === nomination.fpl_player_id);
                return p ? <PlayerStatsBar player={p} className="mb-4" /> : null;
              })()}

              {/* Current bid */}
              <div className="bg-[#132030] rounded-lg p-4 mb-4">
                <div className="text-xs text-[#849585] uppercase tracking-wider mb-1">
                  {nomination.current_bidder_id === null ? "Starting Price" : "Current Bid"}
                </div>
                <div className="text-4xl font-mono font-bold text-[#00e478]">
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
              <div className="flex gap-3">
                <Button
                  onClick={gavel}
                  disabled={!nomination.current_bidder_id}
                  className="flex-1 bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-bold text-lg py-6"
                >
                  🔨 SOLD — £{nomination.current_bid}m
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
                  <select
                    value={extendInput}
                    onChange={(e) => setExtendInput(e.target.value)}
                    className="bg-[#132030] border border-[#3b4b3d] text-[#d6e4f9] text-xs rounded-md px-2 outline-none focus:border-[#00e478] cursor-pointer"
                  >
                    {[10, 20, 30, 40, 50, 60].map((s) => (
                      <option key={s} value={String(s)}>{s}s</option>
                    ))}
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
                    <span className="text-[#d6e4f9]">{b.participant_name}</span>
                    <span className="font-mono text-[#00e478]">£{b.amount}m</span>
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
                <p className="text-[#849585]">Search and nominate a player to start</p>
              </div>
            </div>
          )
        )}
      </main>

      {/* ── Right: Teams budgets ────────────────────────────────────────────── */}
      <aside className="w-60 rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4 overflow-y-auto">
        <h2 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-3">
          Budgets
        </h2>
        <div className="space-y-2">
          {[...teams]
            .sort((a, b) => b.spent - a.spent)
            .map((t) => {
              const budget = league?.budget_per_team ?? 200;
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
      </aside>
    </div>
  );
}
