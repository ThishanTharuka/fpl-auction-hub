"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  DEF: "bg-green-500/20 text-green-400 border-green-500/30",
  MID: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  FWD: "bg-red-500/20 text-red-400 border-red-500/30",
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
      supabase.from("auction_results").select("participant_id,fpl_player_id,player_name,player_team,position_slot,price_paid").eq("league_id", id),
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
  }, [id]);

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
      <div className="flex items-center justify-center h-64 text-[#849585]">
        Loading…
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-bold text-[#d6e4f9] mb-6 flex items-baseline gap-2">
        <span>Team Squads</span>
        <span className="text-sm font-normal text-[#849585]">
          {teams.reduce((s, t) => s + t.squad.length, 0)} players sold
        </span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...teams]
          .toSorted((a, b) => b.squad.length - a.squad.length)
          .map((team) => {
            const pct = Math.round((team.spent / budget) * 100);
            return (
              <div
                key={team.id}
                className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: team.color ?? "#888" }}
                    />
                    <h2 className="font-semibold text-[#d6e4f9] text-sm">{team.name}</h2>
                  </div>
                    <span className="text-xs text-[#849585]">
                      {team.squad.length}/{squadSize}
                    </span>
                    {myTeamIds.has(team.id) && (
                      <Link href={`/auction/${id}/teams/${team.id}/edit`}>
                        <Button
                          size="sm"
                          className="h-6 px-2 text-[10px] bg-[#1e2b3b] border border-[#3b4b3d] text-[#d6e4f9] hover:bg-[#28394a]"
                        >
                          Edit
                        </Button>
                      </Link>
                    )}
                  </div>

                {/* Budget bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#849585]">£{team.spent}m spent</span>
                    <span className="text-[#00e478] font-mono">£{team.remaining}m left</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1e2b3b] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: team.color ?? "#00e478",
                      }}
                    />
                  </div>
                </div>

                {/* Squad grouped by position */}
                {team.squad.length === 0 ? (
                  <p className="text-xs text-[#849585] italic text-center py-3">
                    No players yet
                  </p>
                ) : (
                  <div className="space-y-1">
                    {(["GKP", "DEF", "MID", "FWD"] as const).map((pos) => {
                      const players = team.squad.filter((p) => p.position === pos);
                      if (players.length === 0) return null;
                      return players.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-xs bg-[#132030] rounded px-2.5 py-1.5"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Badge
                              variant="outline"
                              className={`text-[9px] shrink-0 ${POSITION_COLORS[pos] ?? ""}`}
                            >
                              {pos}
                            </Badge>
                            <span className="text-[#d6e4f9] truncate">{p.name}</span>
                            <span className="text-[#849585] shrink-0">{p.team}</span>
                          </div>
                          <span className="font-mono text-[#b9cbb9] shrink-0 ml-2">
                            £{p.price}m
                          </span>
                        </div>
                      ));
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
