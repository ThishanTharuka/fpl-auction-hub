"use client";

/* eslint-disable @next/next/no-img-element -- dynamic player photos with onError fallback, next/image incompatible */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Gavel } from "lucide-react";
import LottiePlayer from "lottie-react";
import gavelHitAnimation from "@/public/animations/gavel-hit.json";
import { Badge } from "@/components/ui/badge";
import Counter from "@/components/counter";
import { TeamAvatar } from "@/components/team-avatar";
import { ChatDrawer } from "@/components/auction-chat/chat-drawer";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useServerClock } from "@/lib/use-server-clock";
import { buildStats, metricTone } from "@/components/player-stats-bar";
import type { EnrichedPlayer } from "@/lib/fpl-types";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import type {
  SpectateLeague,
  SpectateNomination,
  SpectateParticipant,
  SpectateResult,
  SpectateBid,
} from "./spectate-loader";

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  DEF: "bg-green-500/20 text-green-400 border-green-500/30",
  MID: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  FWD: "bg-red-500/20 text-red-400 border-red-500/30",
};

interface StrikeState {
  kind: "sold" | "unsold" | "cancelled";
  playerName: string;
  playerTeam: string | null;
  position: string;
  winnerName: string | null;
  winnerColor: string | null;
  price: number;
  fplPlayerId: number;
}

interface SquadPlayer {
  id: number;
  name: string;
  team: string;
  position: string;
  price: number;
}

interface Standing {
  id: string;
  name: string;
  color: string | null;
  avatar_url: string | null;
  spent: number;
  remaining: number;
  squad: SquadPlayer[];
}

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

function dedupeBids(bids: SpectateBid[]): SpectateBid[] {
  const seen = new Set<string>();
  const unique: SpectateBid[] = [];
  for (const bid of bids) {
    if (seen.has(bid.id)) continue;
    seen.add(bid.id);
    unique.push(bid);
  }
  return unique;
}


export function SpectateContent({
  league,
  nomination: initialNomination,
  initialParticipants,
  initialResults,
  initialPlayers,
}: {
  league: SpectateLeague;
  nomination: SpectateNomination | null;
  initialParticipants: SpectateParticipant[];
  initialResults: SpectateResult[];
  initialPlayers: EnrichedPlayer[];
}) {
  const { id } = useParams<{ id: string }>();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const serverClock = useServerClock();
  const reduceMotion = useReducedMotion();

  const [nomination, setNomination] = useState<SpectateNomination | null>(
    initialNomination,
  );
  const [strike, setStrike] = useState<StrikeState | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [results, setResults] = useState<SpectateResult[]>(initialResults);
  const [recentBids, setRecentBids] = useState<SpectateBid[]>([]);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [spectator, setSpectator] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Identify the logged-in spectator so the chat can show their messages under
  // a "Viewer" label and let them post (RLS gated by allow_spectator_chat).
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const meta = u.user_metadata as Record<string, unknown> | undefined;
      setSpectator({
        id: u.id,
        name:
          `Viewer - ${meta?.display_name ?? meta?.["full_name"] ?? u.email ?? "Unknown"}`,
      });
    });
  }, [supabase]);

  const fplMap = useMemo(
    () => new Map(initialPlayers.map((p) => [p.id, p])),
    [initialPlayers],
  );
  const participantsById = useMemo(
    () => new Map(initialParticipants.map((p) => [p.id, p])),
    [initialParticipants],
  );

  const soldHistory = useMemo(() => {
    return results
      .filter((r) => r.participant_id)
      .map((r) => ({
        playerName: r.player_name ?? "Player",
        teamName: participantsById.get(r.participant_id!)?.name ?? "Unknown",
        teamColor: participantsById.get(r.participant_id!)?.color ?? null,
        amount: r.price_paid,
        fplPlayerId: r.fpl_player_id,
      }));
  }, [results, participantsById]);

  const loadBids = useCallback(
    async (nominationId: string) => {
      const { data } = await supabase
        .from("auction_bids")
        .select("id,nomination_id,participant_id,participant_name,amount,created_at")
        .eq("nomination_id", nominationId)
        .order("created_at", { ascending: false });
      if (data) setRecentBids(dedupeBids(data as SpectateBid[]));
    },
    [supabase],
  );

  const loadAllResults = useCallback(async () => {
    const { data } = await supabase
      .from("auction_results")
      .select(
        "fpl_player_id,participant_id,price_paid,position_slot,player_name,player_team",
      )
      .eq("league_id", id)
      .order("created_at", { ascending: false });
    if (data) setResults(data as SpectateResult[]);
  }, [id, supabase]);

  // ── Realtime: nominations ──────────────────────────────────────────────────
  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel(`spectate-nom-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auction_nominations",
          filter: `league_id=eq.${id}`,
        },
        (payload: RealtimePostgresChangesPayload<SpectateNomination>) => {
          const row = normalizeNomination(
            payload.new as Record<string, unknown>,
          );

          if (row.status === "open") {
            setNomination(row);
            setStrike(null);
            loadBids(row.id);
            return;
          }

          if (
            row.status === "sold" ||
            row.status === "unsold" ||
            row.status === "cancelled"
          ) {
            const player = fplMap.get(row.fpl_player_id);
            const winner = row.current_bidder_id
              ? participantsById.get(row.current_bidder_id)
              : undefined;
            setStrike({
              kind: row.status,
              playerName: player?.full_name ?? row.player_name,
              playerTeam: row.player_team,
              position: row.position,
              winnerName: row.current_bidder_name,
              winnerColor: winner?.color ?? null,
              price: row.current_bid,
              fplPlayerId: row.fpl_player_id,
            });
            setNomination(null);
            setSecondsLeft(0);
            setRecentBids([]);
            return;
          }

          return;
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [id, supabase, loadBids, fplMap, participantsById]);

  // ── Realtime: results (standings + totals) ─────────────────────────────────
  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel(`spectate-results-${id}`)
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
            const r = payload.new as SpectateResult;
            setResults((prev) =>
              prev.some(
                (x) =>
                  x.fpl_player_id === r.fpl_player_id &&
                  x.participant_id === r.participant_id,
              )
                ? prev
                : [r, ...prev],
            );
          } else {
            loadAllResults().catch(() => {});
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [id, supabase, loadAllResults]);

  // ── Realtime: bids for the current lot ────────────────────────────────────
  useEffect(() => {
    if (!nomination) return;

    supabase
      .from("auction_bids")
      .select("id,nomination_id,participant_id,participant_name,amount,created_at")
      .eq("nomination_id", nomination.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setRecentBids(dedupeBids(data as SpectateBid[]));
      });

    const channel: RealtimeChannel = supabase
      .channel(`spectate-bids-${id}-${nomination.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "auction_bids",
          filter: `nomination_id=eq.${nomination.id}`,
        },
        (payload) => {
          const bid = payload.new as SpectateBid;
          setRecentBids((prev) => dedupeBids([bid, ...prev]));
          setNomination((prev) =>
            prev
              ? {
                  ...prev,
                  current_bid: bid.amount,
                  current_bidder_id:
                    bid.participant_id ?? prev.current_bidder_id,
                  current_bidder_name: bid.participant_name,
                }
              : prev,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, nomination?.id, supabase, loadBids, participantsById]);

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

  // ── Strike auto-dismiss ────────────────────────────────────────────────────
  useEffect(() => {
    if (!strike) return;
    const t = setTimeout(() => setStrike(null), 8000);
    return () => clearTimeout(t);
  }, [strike]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const standings = useMemo<Standing[]>(() => {
    const budget = league.budget_per_team;
    const byTeam = new Map<string, SpectateResult[]>();
    for (const r of results) {
      if (!r.participant_id) continue;
      const list = byTeam.get(r.participant_id) ?? [];
      list.push(r);
      byTeam.set(r.participant_id, list);
    }
    return initialParticipants
      .map((p) => {
        const teamResults = byTeam.get(p.id) ?? [];
        const squad: SquadPlayer[] = teamResults.map((r) => {
          const fpl = fplMap.get(r.fpl_player_id);
          return {
            id: r.fpl_player_id,
            name: r.player_name ?? fpl?.web_name ?? "Unknown",
            team: r.player_team ?? fpl?.team_short ?? "",
            position: r.position_slot ?? fpl?.position ?? "?",
            price: r.price_paid,
          };
        });
        const spent = teamResults.reduce((s, r) => s + r.price_paid, 0);
        return {
          ...p,
          spent,
          remaining: budget - spent,
          squad,
        };
      })
      .sort((a, b) => b.spent - a.spent);
  }, [results, initialParticipants, league.budget_per_team, fplMap]);

  const soldCount = results.filter((r) => r.participant_id).length;
  const totalSpent = results.reduce((s, r) => s + r.price_paid, 0);
  const fplPlayer = nomination
    ? (fplMap.get(nomination.fpl_player_id) ?? null)
    : null;

  let timerDisplayValue: number | string = "\u2014";
  if (nomination) {
    if (nomination.is_paused) {
      timerDisplayValue = nomination.paused_seconds ?? 0;
    } else if (nomination.bid_end_time) {
      timerDisplayValue = secondsLeft;
    }
  }
  const timerUnit = nomination?.is_paused ? "paused" : "left";
  let timerHex = "#f87171";
  if (secondsLeft > 15) timerHex = "#00e478";
  else if (secondsLeft > 5) timerHex = "#facc15";

  const timerExpired =
    !!nomination &&
    !nomination.is_paused &&
    secondsLeft === 0 &&
    !!nomination.bid_end_time;

  const colorOf = (pid: string | null) =>
    pid ? participantsById.get(pid)?.color : undefined;

  return (
    <div className="min-h-screen lg:h-screen overflow-y-auto lg:overflow-hidden">
      <div className="mx-auto w-full max-w-[1440px] h-full flex flex-col gap-3 px-4 sm:px-6 py-4">
        {/* ── Scoreboard ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {league.status === "active" && (
              <span className="h-2.5 w-2.5 rounded-full bg-[#00e478] animate-pulse shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-[#849585]">
                Spectator view
              </div>
              <div className="text-base sm:text-lg font-bold text-[#d6e4f9] truncate">
                {league.name}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            <StatusPill status={league.status} />
            <div className="text-right">
              <div className="font-mono text-xl font-bold text-[#d6e4f9]">
                {soldCount}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[#849585]">
                sold
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xl font-bold text-[#00e478]">
                &pound;{totalSpent.toFixed(1)}m
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[#849585]">
                spent
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
          {/* ── Tape (left rail) ─────────────────────────────────────────── */}
          <aside className="w-full lg:w-72 lg:shrink-0 lg:min-h-0 lg:overflow-hidden lg:flex order-2 lg:order-1 max-h-180">
            <div className="w-full rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#3b4b3d] flex items-center justify-between shrink-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#849585]">
                  Sold history
                </h3>
                <span className="text-[10px] text-[#849585]">live</span>
              </div>
              <div className="px-2 py-1.5 flex-1 min-h-0 overflow-y-auto space-y-0.5 max-h-44 lg:max-h-none">
                {soldHistory.length === 0 && (
                  <p className="text-xs text-[#849585] italic text-center py-2">
                    Nothing sold yet — players will appear here as they&apos;re
                    won.
                  </p>
                )}
                {soldHistory.map((ev) => (
                  <div
                    key={ev.fplPlayerId}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00e478] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-[#00e478]">
                          SOLD
                        </span>
                        <span className="text-[#d6e4f9] truncate">
                          {ev.playerName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span
                          className="text-[10px] truncate"
                          style={{ color: ev.teamColor ?? "#849585" }}
                        >
                          {ev.teamName}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#00e478] shrink-0">
                          &pound;{ev.amount}m
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden order-1 lg:order-2 max-h-180">
            {strike ? (
              <StrikeCard strike={strike} reduceMotion={reduceMotion} />
            ) : nomination ? (
              <>
                <LotCard
                  nomination={nomination}
                  fplPlayer={fplPlayer}
                  timerDisplayValue={timerDisplayValue}
                  timerUnit={timerUnit}
                  timerHex={timerHex}
                  timerExpired={timerExpired}
                  participantsById={participantsById}
                />
                <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] flex flex-col overflow-hidden flex-1 min-h-0 max-h-87">
                  <div className="px-4 py-2.5 border-b border-[#3b4b3d] shrink-0">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#849585]">
                      Bidding so far
                    </h3>
                  </div>
                  <div className="px-2 py-1.5 space-y-0.5 overflow-y-auto flex-1 min-h-0">
                    {recentBids.length === 0 && (
                      <p className="text-xs text-[#849585] italic text-center py-3">
                        No bids yet — the opening price stands.
                      </p>
                    )}
                    {recentBids.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center gap-2 px-2 py-1.5 text-sm"
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              colorOf(b.participant_id) ?? "#849585",
                          }}
                        />
                        <span className="text-[#d6e4f9] truncate">
                          {b.participant_name}
                        </span>
                        <span className="font-mono text-[#00e478] ml-auto shrink-0">
                          &pound;{b.amount}m
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <EmptyBlock
                status={league.status}
                participants={initialParticipants}
              />
            )}
          </main>

          {/* ── Standings rail ───────────────────────────────────────────── */}
          <aside className="w-full lg:w-80 lg:shrink-0 lg:min-h-0 lg:overflow-y-auto order-3 max-h-180">
            <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c]">
              <div className="px-4 py-3 border-b border-[#3b4b3d] flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#849585]">
                  Standings
                </h3>
                <span className="text-xs text-[#849585]">{soldCount} sold</span>
              </div>
              <div>
                {standings.map((t) => (
                  <div
                    key={t.id}
                    className="border-b border-[#3b4b3d] last:border-b-0"
                  >
                    <button
                      onClick={() =>
                        setExpandedTeamId(expandedTeamId === t.id ? null : t.id)
                      }
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-[#132030] transition-colors"
                    >
                      <TeamAvatar
                        name={t.name}
                        color={t.color}
                        src={t.avatar_url}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-[#d6e4f9] truncate">
                            {t.name}
                          </span>
                          <span
                            className="font-mono text-sm shrink-0"
                            style={{
                              color: t.remaining >= 0 ? "#00e478" : "#f87171",
                            }}
                          >
                            &pound;{t.remaining.toFixed(1)}m
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1 flex-1 rounded-full bg-[#1e2b3b] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round(
                                    (t.spent /
                                      (league.budget_per_team || 200)) *
                                      100,
                                  ),
                                )}%`,
                                backgroundColor: t.color ?? "#00e478",
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-[#849585] shrink-0">
                            {t.squad.length} · &pound;{t.spent.toFixed(1)}m
                          </span>
                        </div>
                      </div>
                    </button>
                    {expandedTeamId === t.id && (
                      <div className="px-4 pb-3 space-y-0.5">
                        {t.squad.length === 0 && (
                          <p className="text-xs text-[#849585] italic py-1">
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
                              <div className="text-[10px] uppercase tracking-wider text-[#849585] font-semibold py-0.5">
                                {pos} ({players.length})
                              </div>
                              {players.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between text-xs bg-[#132030] rounded px-2.5 py-1"
                                >
                                  <span className="text-[#d6e4f9] truncate">
                                    {p.name}
                                  </span>
                                  <span className="font-mono text-[#b9cbb9] ml-2 shrink-0">
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
                {standings.length === 0 && (
                  <p className="text-xs text-[#849585] italic text-center py-6">
                    No teams yet
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
      {league.allow_spectator_chat && spectator && (
        <ChatDrawer
          leagueId={id}
          userId={spectator.id}
          userName={spectator.name}
          participantId={null}
          participants={initialParticipants}
          auctioneerId={league.created_by}
        />
      )}
    </div>
  );
}

// ── Presentational helpers ────────────────────────────────────────────────────

function StatusPill({ status }: { status: string | null }) {
  if (status === "active") {
    return (
      <span className="text-xs border border-[#00e478]/40 bg-[#00e478]/10 text-[#00e478] rounded px-2 py-0.5 font-semibold">
        LIVE
      </span>
    );
  }
  if (status === "complete") {
    return (
      <span className="text-xs border border-[#3b4b3d] text-[#849585] rounded px-2 py-0.5">
        Complete
      </span>
    );
  }
  return (
    <span className="text-xs border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 rounded px-2 py-0.5">
      Setup
    </span>
  );
}

function PlayerPortrait({
  player,
  className,
}: {
  player: EnrichedPlayer;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg bg-[#0a1724] ${className ?? ""}`}
    >
      {error ? (
        <img
          src="/player-fallback.png"
          alt={player.full_name}
          width={110}
          height={140}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <img
          src={player.image_url}
          alt={player.full_name}
          width={110}
          height={140}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`h-full w-full object-cover object-top transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}

function ClubCrest({ player }: { player: EnrichedPlayer }) {
  const [error, setError] = useState(false);
  if (!player.team_crest_url) return null;
  if (error) {
    return (
      <div className="h-5 w-5 rounded-sm bg-[#132030] border border-[#3b4b3d] flex items-center justify-center">
        <span className="text-[9px] font-bold text-[#849585]">
          {player.team_short?.charAt(0) ?? "?"}
        </span>
      </div>
    );
  }
  return (
    <img
      src={player.team_crest_url}
      alt={`${player.team_name} crest`}
      width={70}
      height={70}
      loading="lazy"
      onError={() => setError(true)}
      className="h-5 w-5 rounded-sm object-contain shrink-0"
    />
  );
}

function PlayerChips({ player }: { player: EnrichedPlayer }) {
  const stats = buildStats(player).slice(0, 4);
  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((s) => {
        const tone = metricTone(s.label);
        return (
          <div
            key={s.label}
            className={`rounded-xl border text-center py-2.5 ${tone.chip} ${tone.glow}`}
          >
            <div className="text-[9px] uppercase tracking-wider leading-none opacity-70">
              {s.label}
            </div>
            <div className="font-mono font-bold text-sm mt-1">{s.value}</div>
          </div>
        );
      })}
    </div>
  );
}

function LotCard({
  nomination,
  fplPlayer,
  timerDisplayValue,
  timerUnit,
  timerHex,
  timerExpired,
  participantsById,
}: {
  nomination: SpectateNomination;
  fplPlayer: EnrichedPlayer | null;
  timerDisplayValue: number | string;
  timerUnit: string;
  timerHex: string;
  timerExpired: boolean;
  participantsById: Map<string, SpectateParticipant>;
}) {
  const fullName = fplPlayer?.full_name ?? nomination.player_name;
  const clubName = fplPlayer?.team_name ?? nomination.player_team;
  const bidder = nomination.current_bidder_id
    ? (participantsById.get(nomination.current_bidder_id) ?? null)
    : null;

  return (
    <div className="rounded-xl border border-[#3b4b3d] bg-[#0f1c2c] overflow-hidden shrink-0 sticky top-0 z-10">
      <div className="flex flex-col sm:flex-row gap-5 p-5 lg:p-6">
        <div className="flex gap-4 min-w-0">
          {fplPlayer && (
            <PlayerPortrait
              player={fplPlayer}
              className="w-20 h-28 sm:w-24 sm:h-32"
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge
                variant="outline"
                className={POSITION_COLORS[nomination.position] ?? ""}
              >
                {nomination.position}
              </Badge>
              {fplPlayer && <ClubCrest player={fplPlayer} />}
              {clubName && (
                <span className="text-xs text-[#849585] truncate">
                  {clubName}
                </span>
              )}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#d6e4f9] leading-tight">
              {fullName}
            </h2>
            {(nomination.is_paused || timerExpired) && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                {nomination.is_paused && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-yellow-400">
                    Auctioneer paused the clock
                  </span>
                )}
                {timerExpired && (
                  <span className="text-xs text-yellow-400">
                    Timer ran out &mdash; awaiting the hammer
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="sm:ml-auto shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-[#849585] text-right">
            Time left
          </div>
          <div className="mt-1 font-mono font-bold flex justify-end">
            {typeof timerDisplayValue === "number" ? (
              <Counter
                value={timerDisplayValue}
                fontSize={40}
                textColor={timerHex}
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
              <span className="text-4xl text-[#849585]">
                {timerDisplayValue}
              </span>
            )}
          </div>
          <div className="text-xs text-[#849585] text-right">{timerUnit}</div>
        </div>
      </div>

      <div className="border-t border-[#3b4b3d] bg-[#132030] px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-[#849585]">
            {nomination.current_bidder_id ? "Current bid" : "Starting price"}
          </div>
          <div className="mt-1 font-mono font-bold text-[#00e478] inline-flex items-center">
            <span className="text-[40px] leading-none shrink-0">&pound;</span>
            <Counter
              value={nomination.current_bid}
              fontSize={40}
              textColor="#00e478"
              fontWeight={700}
              gradientHeight={6}
              gradientFrom="#132030"
              gap={0}
              horizontalPadding={2}
            />
            <span className="text-[40px] leading-none shrink-0">m</span>
          </div>
        </div>
        <div className="min-w-0">
          {bidder ? (
            <div className="flex items-center justify-end gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[#849585] shrink-0">
                Highest bidder
              </span>
              <TeamAvatar
                name={bidder.name}
                color={bidder.color}
                src={bidder.avatar_url}
                size="sm"
              />
              <span
                className="text-sm font-semibold truncate max-w-[160px]"
                style={{ color: bidder.color ?? "#d6e4f9" }}
              >
                {bidder.name}
              </span>
            </div>
          ) : (
            <span className="text-xs text-[#849585]">
              Opening price &mdash; no bids yet
            </span>
          )}
        </div>
      </div>

      {fplPlayer && (
        <div className="px-5 py-4 border-t border-[#3b4b3d]">
          <PlayerChips player={fplPlayer} />
        </div>
      )}
    </div>
  );
}

function EmptyBlock({
  status,
  participants,
}: {
  status: string | null;
  participants: SpectateParticipant[];
}) {
  const copy =
    status === "complete"
      ? "That's the final hammer. The squads are locked in below."
      : status === "active"
        ? "The block is empty — the auctioneer is lining up the next player."
        : "The auction hasn't started yet. Teams are still claiming their spots.";
  return (
    <div className="flex flex-1 min-h-[320px] items-center justify-center rounded-xl border border-dashed border-[#3b4b3d] bg-[#0f1c2c]">
      <div className="text-center px-6">
        <Gavel className="mx-auto h-10 w-10 text-[#3b4b3d]" />
        <p className="mt-4 text-sm text-[#849585] max-w-[300px]">{copy}</p>
        {status === "active" && participants.length > 0 && (
          <div className="mt-5 flex items-center justify-center gap-2">
            {participants.slice(0, 8).map((p) => (
              <span
                key={p.id}
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: p.color ?? "#849585" }}
                title={p.name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StrikeCard({
  strike,
  reduceMotion,
}: {
  strike: StrikeState;
  reduceMotion: boolean | null;
}) {
  const sold = strike.kind === "sold";
  const word = sold
    ? "SOLD"
    : strike.kind === "unsold"
      ? "WENT UNSOLD"
      : "WITHDRAWN";
  const wordColor = sold
    ? "#00e478"
    : strike.kind === "unsold"
      ? "#facc15"
      : "#f87171";
  const borderColor = sold
    ? (strike.winnerColor ?? "#00e478")
    : strike.kind === "unsold"
      ? "rgba(250,204,21,0.5)"
      : "rgba(248,113,113,0.5)";

  return (
    <div
      className="relative overflow-hidden rounded-xl border-2 bg-[#0f1c2c] flex-1 min-h-[320px] flex flex-col items-center justify-center text-center px-6 py-10"
      style={{ borderColor }}
    >
      <motion.div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          backgroundColor: sold ? (strike.winnerColor ?? "#00e478") : wordColor,
        }}
        initial={reduceMotion ? { opacity: 0 } : { scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: sold ? 0.4 : 0.05, duration: 0.35 }}
      />
      {sold && strike.winnerColor && (
        <div
          className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: strike.winnerColor }}
        />
      )}

      {sold && (
        <motion.div
          className="text-[#00e478]"
          initial={reduceMotion ? { opacity: 0 } : { y: -70, opacity: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
          transition={
            reduceMotion
              ? { duration: 0.2 }
              : { type: "spring", stiffness: 380, damping: 14 }
          }
        >
          <LottiePlayer
            animationData={gavelHitAnimation}
            loop={false}
            className="h-20 w-20 sm:h-40 sm:w-40"
          />
        </motion.div>
      )}

      <motion.div
        className="mt-3 text-5xl sm:text-7xl font-bold tracking-tight leading-none"
        style={{ color: wordColor }}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: sold ? 0.45 : 0.1,
          type: "spring",
          stiffness: 320,
          damping: 18,
        }}
      >
        {word}
      </motion.div>

      <motion.div
        className="mt-3 text-2xl sm:text-3xl font-bold text-[#d6e4f9]"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: sold ? 0.6 : 0.25, duration: 0.3 }}
      >
        {strike.playerName}
      </motion.div>

      {sold && strike.playerTeam && (
        <div className="mt-1 text-[10px] uppercase tracking-wider text-[#849585]">
          {strike.position} · {strike.playerTeam}
        </div>
      )}

      {sold && strike.winnerName && (
        <motion.div
          className="mt-4 flex items-center justify-center gap-2.5"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        >
          <TeamAvatar name={strike.winnerName} color={strike.winnerColor} />
          <span className="text-sm text-[#b9cbb9]">to</span>
          <span
            className="text-lg font-semibold"
            style={{ color: strike.winnerColor ?? "#d6e4f9" }}
          >
            {strike.winnerName}
          </span>
        </motion.div>
      )}

      {sold && (
        <motion.div
          className="mt-3 inline-flex items-center font-mono font-bold text-[#00e478]"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        >
          <span className="text-[40px] leading-none shrink-0">&pound;</span>
          <Counter
            value={strike.price}
            fontSize={40}
            textColor="#00e478"
            fontWeight={700}
            gradientHeight={6}
            gradientFrom="#132030"
            gap={0}
            horizontalPadding={2}
          />
          <span className="text-[40px] leading-none shrink-0">m</span>
        </motion.div>
      )}

      <p className="mt-6 text-xs text-[#849585]">
        Next player coming up&hellip;
      </p>
    </div>
  );
}
