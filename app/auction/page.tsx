"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import type { EnrichedPlayer, Participant } from "@/lib/fpl-types";

const SLOT_OPTIONS = ["GKP", "DEF", "MID", "FWD", "BENCH"] as const;
type Slot = (typeof SLOT_OPTIONS)[number];

interface AuctionEntry {
  id: string;
  player: EnrichedPlayer;
  participant: Participant;
  price: number;
  slot: Slot;
  sold_at: number;
}

interface BudgetMap {
  [participantId: string]: { spent: number; squad: number };
}

export default function AuctionPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<EnrichedPlayer[]>([]);
  const [leagueName, setLeagueName] = useState("");
  const [budget, setBudget] = useState(100);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [newParticipant, setNewParticipant] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);

  // Live auction
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState<EnrichedPlayer | null>(
    null,
  );
  const [currentBid, setCurrentBid] = useState(0.5);
  const [selectedBidder, setSelectedBidder] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot>("MID");
  const [feed, setFeed] = useState<AuctionEntry[]>([]);
  const [budgetMap, setBudgetMap] = useState<BudgetMap>({});
  const [timerSec, setTimerSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/fpl/bootstrap")
      .then((r) => r.json())
      .then((d) => setPlayers(d.players ?? []));
  }, []);

  // ── League Setup ──────────────────────────────────────────────────────────
  async function createLeague() {
    if (!leagueName.trim() || participants.length === 0) return;
    setSetupError(null);
    const { data, error } = await supabase
      .from("leagues")
      .insert({
        name: leagueName.trim(),
        budget_per_team: budget,
        created_by: user?.id ?? null,
      })
      .select()
      .single();
    if (error || !data) {
      setSetupError("Error creating league. Please try again.");
      return;
    }
    const pRows = participants.map((p) => ({
      league_id: data.id,
      name: p.name,
      color: p.color,
    }));
    const { error: pe } = await supabase.from("participants").insert(pRows);
    if (pe) {
      setSetupError("Error adding participants. Please try again.");
      return;
    }
    setLeagueId(data.id);
    const bmap: BudgetMap = {};
    participants.forEach((p) => {
      bmap[p.id] = { spent: 0, squad: 0 };
    });
    setBudgetMap(bmap);
  }

  function removeParticipant(id: string) {
    setParticipants((prev) => prev.filter((x) => x.id !== id));
  }

  function addParticipant() {
    const name = newParticipant.trim();
    if (!name || participants.length >= 10) return;
    const colors = [
      "#4ade80",
      "#60a5fa",
      "#f472b6",
      "#fb923c",
      "#a78bfa",
      "#34d399",
      "#fbbf24",
      "#f87171",
      "#38bdf8",
      "#e879f9",
    ];
    setParticipants((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        league_id: "",
        name,
        color: colors[prev.length % colors.length] ?? "#888888",
        user_id: null,
      },
    ]);
    setNewParticipant("");
  }

  // ── Timer ──────────────────────────────────────────────────────────────────
  function startTimer() {
    setTimerSec(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimerSec((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current as ReturnType<typeof setInterval>);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function selectPlayer(p: EnrichedPlayer) {
    setCurrentPlayer(p);
    setCurrentBid(p.price);
    startTimer();
  }

  // ── Bid ───────────────────────────────────────────────────────────────────
  async function soldPlayer() {
    if (!currentPlayer || !selectedBidder || !leagueId) return;
    const participant = participants.find((p) => p.id === selectedBidder);
    if (!participant) return;

    await supabase.from("auction_results").insert({
      league_id: leagueId,
      participant_id: selectedBidder,
      fpl_player_id: currentPlayer.id,
      price_paid: currentBid,
      position_slot: selectedSlot,
    });

    setFeed((prev) => [
      {
        id: crypto.randomUUID(),
        player: currentPlayer,
        participant,
        price: currentBid,
        slot: selectedSlot,
        sold_at: Date.now(),
      },
      ...prev.slice(0, 9),
    ]);
    setBudgetMap((prev) => ({
      ...prev,
      [selectedBidder]: {
        spent: (prev[selectedBidder]?.spent ?? 0) + currentBid,
        squad: (prev[selectedBidder]?.squad ?? 0) + 1,
      },
    }));
    setCurrentPlayer(null);
    setCurrentBid(0.5);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerSec(0);
  }

  const filteredPlayers = players.filter((p) => {
    const soldIds = new Set(feed.map((f) => f.player.id));
    if (soldIds.has(p.id)) return false;
    if (!searchQuery) return false;
    return p.web_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const currentBidder = participants.find((p) => p.id === selectedBidder);

  // ── Render: Setup ─────────────────────────────────────────────────────────
  if (!leagueId) {
    return (
      <div className="mx-auto max-w-[800px] px-6 py-10">
        <h1 className="text-2xl font-bold text-[#d6e4f9] mb-6">League Setup</h1>
        <div className="space-y-5 rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-6">
          <div>
            <label
              htmlFor="league-name"
              className="block text-xs text-[#849585] uppercase tracking-wider mb-1.5"
            >
              League Name
            </label>
            <Input
              id="league-name"
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              placeholder="e.g. The Gaffer's League"
              className="bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] placeholder:text-[#849585]"
            />
          </div>
          <div>
            <label
              htmlFor="budget-display"
              className="block text-xs text-[#849585] uppercase tracking-wider mb-1.5"
            >
              Budget per Team (£m)
            </label>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                className="border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b]"
                onClick={() => setBudget((b) => Math.max(50, b - 5))}
              >
                −
              </Button>
              <span
                id="budget-display"
                className="font-mono font-bold text-xl text-[#00e478] w-16 text-center"
              >
                £{budget}m
              </span>
              <Button
                size="sm"
                variant="outline"
                className="border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b]"
                onClick={() => setBudget((b) => Math.min(200, b + 5))}
              >
                +
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#849585] uppercase tracking-wider mb-1.5">
              Participants ({participants.length}/10)
            </label>
            <div className="flex gap-2 mb-3">
              <Input
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addParticipant()}
                placeholder="Participant name…"
                className="bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] placeholder:text-[#849585]"
              />
              <Button
                onClick={addParticipant}
                className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90"
              >
                Add
              </Button>
            </div>
            {participants.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {participants.map((p) => (
                  <span
                    key={p.id}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm"
                    style={{
                      backgroundColor: `${p.color ?? "#888"}22`,
                      color: p.color ?? undefined,
                      border: `1px solid ${p.color ?? "#888"}44`,
                    }}
                  >
                    {p.name}
                    <button
                      className="opacity-60 hover:opacity-100"
                      onClick={() => removeParticipant(p.id)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={createLeague}
            disabled={!leagueName.trim() || participants.length === 0}
            className="w-full bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-bold"
          >
            Start Auction
          </Button>
          {setupError && (
            <p className="text-sm text-red-400 text-center">{setupError}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Render: Live Auction ───────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_260px] gap-6">
        {/* Current player card */}
        <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5">
          <h2 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-4">
            Current Player
          </h2>
          {currentPlayer ? (
            <div>
              <div className="text-2xl font-bold text-[#d6e4f9] mb-1">
                {currentPlayer.web_name}
              </div>
              <div className="text-sm text-[#849585] mb-4">
                {currentPlayer.team_name} · {currentPlayer.position}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <MiniStat
                  label="Price"
                  value={`£${currentPlayer.price.toFixed(1)}m`}
                />
                <MiniStat label="PPG" value={currentPlayer.points_per_game} />
                <MiniStat label="Form" value={currentPlayer.form} highlight />
                <MiniStat
                  label="ICT"
                  value={Number.parseFloat(currentPlayer.ict_index).toFixed(1)}
                />
                <MiniStat
                  label="xGI"
                  value={Number.parseFloat(
                    currentPlayer.expected_goal_involvements,
                  ).toFixed(2)}
                />
                <MiniStat label="FDR ×5" value={currentPlayer.avg_fdr_next5} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#849585]">No player selected yet.</p>
          )}

          {/* Player search */}
          <div className="mt-4">
            <Input
              placeholder="Search to nominate…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] placeholder:text-[#849585] mb-2"
            />
            {filteredPlayers.slice(0, 6).map((p) => (
              <button
                key={p.id}
                className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-[#1e2b3b] transition-colors text-sm"
                onClick={() => {
                  selectPlayer(p);
                  setSearchQuery("");
                }}
              >
                <span className="text-[#d6e4f9]">{p.web_name}</span>
                <span className="text-xs text-[#849585]">
                  {p.team_short} · {p.position} · £{p.price.toFixed(1)}m
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Center: bid controls + feed */}
        <div className="space-y-4">
          {/* Timer + bid */}
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-[#849585] uppercase tracking-wider">
                Live Auction
              </span>
              <span
                className={`font-mono text-2xl font-bold tabular-nums ${timerSec <= 5 ? "text-red-400 animate-pulse" : "text-[#00e478]"}`}
              >
                {String(timerSec).padStart(2, "0")}s
              </span>
            </div>

            <div className="mb-4">
              <div className="text-xs text-[#849585] mb-1">CURRENT BID</div>
              <div className="text-3xl font-bold font-mono text-[#d6e4f9]">
                £{currentBid.toFixed(1)}m
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <Button
                size="sm"
                variant="outline"
                className="border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b]"
                onClick={() =>
                  setCurrentBid((b) => Math.max(0.5, +(b + 0.5).toFixed(1)))
                }
              >
                +£0.5m
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b]"
                onClick={() => setCurrentBid((b) => +(b + 1).toFixed(1))}
              >
                +£1.0m
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label
                  htmlFor="bidder-select"
                  className="block text-xs text-[#849585] mb-1"
                >
                  Winning Bidder
                </label>
                <select
                  id="bidder-select"
                  value={selectedBidder}
                  onChange={(e) => setSelectedBidder(e.target.value)}
                  className="w-full bg-[#132030] border border-[#3b4b3d] text-[#d6e4f9] rounded px-2 py-1.5 text-sm"
                >
                  <option value="">Select bidder…</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="slot-select"
                  className="block text-xs text-[#849585] mb-1"
                >
                  Position Slot
                </label>
                <select
                  id="slot-select"
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value as Slot)}
                  className="w-full bg-[#132030] border border-[#3b4b3d] text-[#d6e4f9] rounded px-2 py-1.5 text-sm"
                >
                  {SLOT_OPTIONS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              onClick={soldPlayer}
              disabled={!currentPlayer || !selectedBidder}
              className="w-full bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-bold"
            >
              SOLD
              {currentBidder
                ? ` → ${currentBidder.name} for £${currentBid.toFixed(1)}m`
                : ""}
            </Button>
          </div>

          {/* Feed */}
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#3b4b3d] text-xs font-semibold text-[#849585] uppercase tracking-wider">
              Auction Feed
            </div>
            {feed.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[#849585]">No sales yet.</p>
            ) : (
              <ul>
                {feed.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-[#3b4b3d]/40 hover:bg-[#132030]"
                  >
                    <div>
                      <span className="font-medium text-[#d6e4f9]">
                        {entry.player.web_name}
                      </span>
                      <span className="text-xs text-[#849585] ml-2">
                        {entry.player.team_short} · {entry.slot}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-[#00e478]">
                        £{entry.price.toFixed(1)}m
                      </div>
                      <div
                        className="text-xs font-medium"
                        style={{ color: entry.participant.color ?? undefined }}
                      >
                        {entry.participant.name}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: Budget tracker */}
        <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5 h-fit">
          <h2 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-4">
            Team Budgets
          </h2>
          <div className="space-y-4">
            {participants.map((p) => {
              const spent = budgetMap[p.id]?.spent ?? 0;
              const squad = budgetMap[p.id]?.squad ?? 0;
              const remaining = budget - spent;
              const pct = Math.min(100, (spent / budget) * 100);
              return (
                <div key={p.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: p.color ?? undefined }}>
                      {p.name}
                    </span>
                    <span className="font-mono text-[#849585]">
                      £{remaining.toFixed(1)}m left
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#283646] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: p.color ?? undefined,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#849585] mt-0.5">
                    <span>Spent £{spent.toFixed(1)}m</span>
                    <span>{squad} players</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: Readonly<{ label: string; value: string | number; highlight?: boolean }>) {
  return (
    <div className="bg-[#132030] rounded p-2">
      <div className="text-[10px] text-[#849585] uppercase tracking-wider">
        {label}
      </div>
      <div
        className={`font-mono font-bold ${highlight ? "text-[#00e478]" : "text-[#d6e4f9]"}`}
      >
        {value}
      </div>
    </div>
  );
}
