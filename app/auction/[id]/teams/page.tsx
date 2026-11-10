"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25",
  DEF: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/25",
  MID: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25",
  FWD: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25",
};

interface Participant {
  id: string;
  name: string;
  color: string | null;
}

interface AuctionResult {
  participant_id: string;
  fpl_player_id: number;
  player_name: string | null;
  player_team: string | null;
  position_slot: string | null;
  price_paid: number;
}

interface TeamView {
  id: string;
  name: string;
  color: string | null;
  spent: number;
  remaining: number;
  squad: {
    id: number;
    name: string;
    team: string;
    position: string;
    price: number;
  }[];
}

export default function TeamsHubPage() {
  const { id } = useParams<{ id: string }>();
  const shouldReduce = useReducedMotion();
  const [budget, setBudget] = useState(200);
  const [squadSize, setSquadSize] = useState(15);
  const [teams, setTeams] = useState<TeamView[]>([]);
  const [myTeamIds, setMyTeamIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  const loadData = useCallback(async function loadData() {
    const [{ data: lg }, { data: ps }, { data: results }, { data: members }] = await Promise.all([
      supabase.from("leagues").select("budget_per_team, squad_size").eq("id", id).single(),
      supabase.from("participants").select("id,name,color").eq("league_id", id).order("name"),
      supabase.from("auction_results").select("participant_id,fpl_player_id,player_name,player_team,position_slot,price_paid").eq("league_id", id).order("created_at", { ascending: true }),
      supabase.from("team_members").select("participant_id,user_id,status").eq("league_id", id),
    ]);

    const budg = (lg as { budget_per_team: number; squad_size: number | null } | null)?.budget_per_team ?? 200;
    const sqSize = (lg as { budget_per_team: number; squad_size: number | null } | null)?.squad_size ?? 15;
    setBudget(budg);
    setSquadSize(sqSize);

    const participants = (ps ?? []) as Participant[];
    const allResults = (results ?? []) as AuctionResult[];

    const byTeam: Record<string, AuctionResult[]> = {};
    for (const r of allResults) {
      if (r.participant_id) {
        byTeam[r.participant_id] = [...(byTeam[r.participant_id] ?? []), r];
      }
    }

    setTeams(
      participants.map((p) => {
        const pResults = byTeam[p.id] ?? [];
        const spent = pResults.reduce((s, r) => s + r.price_paid, 0);
        return {
          id: p.id,
          name: p.name,
          color: p.color,
          spent,
          remaining: budg - spent,
          squad: pResults.map((r) => ({
            id: r.fpl_player_id,
            name: r.player_name ?? "Unknown",
            team: r.player_team ?? "",
            position: r.position_slot ?? "?",
            price: r.price_paid,
          })),
        };
      }),
    );

    const ms = (members ?? []) as { participant_id: string; user_id: string; status: string }[];
    setMyTeamIds(
      new Set(
        ms
          .filter((m) => m.user_id === user?.id && m.status === "approved")
          .map((m) => m.participant_id),
      ),
    );

    setLoading(false);
  }, [id, user?.id]);

  /* eslint-disable react-hooks/set-state-in-effect -- intentional: initial data fetch + realtime subscription */
  useEffect(() => {
    void loadData();

    const channel = supabase
      .channel(`teams-hub-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "auction_results", filter: `league_id=eq.${id}` },
        (payload) => {
          const r = payload.new as AuctionResult;
          setTeams((prev) =>
            prev.map((t) =>
              t.id === r.participant_id
                ? {
                    ...t,
                    spent: t.spent + r.price_paid,
                    squad: [
                      ...t.squad,
                      {
                        id: r.fpl_player_id,
                        name: r.player_name ?? "Unknown",
                        team: r.player_team ?? "",
                        position: r.position_slot ?? "?",
                        price: r.price_paid,
                      },
                    ],
                  }
                : t,
            ),
          );
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel).catch(() => {}); };
  }, [id, loadData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-xl bg-muted/60 animate-pulse" />
          <div className="h-4 w-40 rounded bg-muted/40 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl border border-border/60 bg-card/60 p-5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const totalPlayersSold = teams.reduce((s, t) => s + t.squad.length, 0);

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Header — Apple Visual Craftsmanship */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Team Squads
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
          Roster breakdown and remaining auction budget across all participating teams ({totalPlayersSold} players drafted).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5">
        {[...teams]
          .toSorted((a, b) => b.squad.length - a.squad.length)
          .map((team) => {
            const pct = Math.round((team.spent / budget) * 100);
            return (
              <motion.div
                key={team.id}
                whileHover={shouldReduce ? undefined : { y: -1 }}
                transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                style={{
                  boxShadow:
                    "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
                className="group rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-5 space-y-4 hover:border-primary/40 hover:shadow-md transition-all duration-200"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-2xs ring-1 ring-black/20"
                      style={{ backgroundColor: team.color ?? "#888" }}
                    />
                    <h2 className="font-bold text-foreground text-sm tracking-tight truncate">{team.name}</h2>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground bg-muted/60 border border-border/50 rounded-full px-2.5 py-0.5">
                      {team.squad.length} / {squadSize}
                    </span>
                    {myTeamIds.has(team.id) && (
                      <Link href={`/auction/${id}/teams/${team.id}/edit`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-3 text-[11px] rounded-full border border-border/80 bg-background/80 hover:bg-muted text-foreground font-medium shadow-2xs transition-all"
                        >
                          Edit
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Budget bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-medium">£{team.spent}m spent</span>
                    <span className="text-emerald-700 dark:text-primary font-mono font-bold tabular-nums">£{team.remaining}m left</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/70 overflow-hidden border border-border/40">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: team.color ?? "#00e478",
                      }}
                    />
                  </div>
                </div>

                {/* Squad grouped by position */}
                {team.squad.length === 0 ? (
                  <div className="py-6 text-center rounded-xl border border-dashed border-border/60 bg-muted/10 text-xs text-muted-foreground italic">
                    No players acquired yet
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar pt-1">
                    {(["GKP", "DEF", "MID", "FWD"] as const).map((pos) => {
                      const players = team.squad.filter((p) => p.position === pos);
                      if (players.length === 0) return null;
                      return players.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-xs bg-muted/30 border border-border/50 rounded-xl px-3 py-2 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge
                              variant="outline"
                              className={`text-[9px] font-bold rounded-full px-1.5 py-0 shrink-0 ${POSITION_COLORS[pos] ?? ""}`}
                            >
                              {pos}
                            </Badge>
                            <span className="text-foreground font-medium truncate">{p.name}</span>
                            <span className="text-muted-foreground text-[11px] shrink-0 font-normal">{p.team}</span>
                          </div>
                          <span className="font-mono font-semibold text-foreground shrink-0 ml-2 tabular-nums">
                            £{p.price}m
                          </span>
                        </div>
                      ));
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
      </div>
    </div>
  );
}
