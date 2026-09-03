"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";

const supabase = createSupabaseBrowserClient();

interface CompetitionRow {
  id: string;
  name: string;
  status: string;
  start_gw: number;
  created_at: string;
  league_a_id: string;
  league_b_id: string;
  created_by: string;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  setup: { label: "Setup", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  active: { label: "Live", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
  complete: { label: "Complete", cls: "bg-[#3b4b3d] text-[#849585] border-[#3b4b3d]" },
};

export default function TournamentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [leagueNames, setLeagueNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    // Leagues the user participates in (via team_members) or owns
    const [{ data: memberRows }, { data: participantRows }] = await Promise.all([
      supabase.from("team_members").select("league_id").eq("user_id", user.id),
      supabase.from("participants").select("league_id").eq("user_id", user.id),
    ]);
    const memberLeagueIds = new Set<string>([
      ...((memberRows ?? []).map((m) => m.league_id).filter(Boolean) as string[]),
      ...((participantRows ?? []).map((p) => p.league_id).filter(Boolean) as string[]),
    ]);

    let rows: CompetitionRow[] = [];
    if (memberLeagueIds.size > 0) {
      const leagueIds = [...memberLeagueIds];
      const inList = `(${leagueIds.join(",")})`;
      const orFilter = `created_by.eq.${user.id},league_a_id.in.${inList},league_b_id.in.${inList}`;
      const { data, error } = await supabase
        .from("competitions")
        .select("id,name,status,start_gw,created_at,league_a_id,league_b_id,created_by")
        .or(orFilter)
        .order("created_at", { ascending: false });
      if (error) {
        setLoading(false);
        return;
      }
      rows = (data ?? []) as CompetitionRow[];
    } else {
      const { data, error } = await supabase
        .from("competitions")
        .select("id,name,status,start_gw,created_at,league_a_id,league_b_id,created_by")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        setLoading(false);
        return;
      }
      rows = (data ?? []) as CompetitionRow[];
    }
    const ids = new Set<string>();
    for (const c of rows) {
      ids.add(c.league_a_id);
      ids.add(c.league_b_id);
    }
    const { data: leagues } = await supabase
      .from("leagues")
      .select("id,name")
      .in("id", [...ids]);
    const names: Record<string, string> = {};
    for (const l of leagues ?? []) names[l.id] = l.name;
    setLeagueNames(names);
    setCompetitions(rows);
    setLoading(false);
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- intentional: load on user change */
  useEffect(() => {
    load().catch(() => {});
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#d6e4f9]">Tournaments</h1>
          <p className="text-sm text-[#849585] mt-1">
            Combine two leagues into a season-long competition with real FPL scoring.
          </p>
        </div>
        <Link href="/tournaments/new">
          <Button className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-semibold">
            + New Tournament
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] px-5 py-4 animate-pulse"
            >
              <div className="h-5 w-48 rounded bg-[#1e2b3b]" />
              <div className="h-8 w-16 rounded bg-[#1e2b3b]" />
            </div>
          ))}
        </div>
      )}

      {!loading && competitions.length === 0 && (
        <div className="text-center py-16 text-[#849585]">
          <p className="text-lg mb-2">No tournaments yet.</p>
          <p className="text-sm">
            <Link href="/tournaments/new" className="text-[#00e478] hover:underline">
              Create the first one
            </Link>
          </p>
        </div>
      )}

      <div className="space-y-3">
        {competitions.map((c) => {
          const statusInfo =
            STATUS_LABELS[c.status] ?? { label: "Setup", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
          return (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] px-5 py-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-semibold text-[#d6e4f9] truncate">
                    {c.name}
                  </span>
                  <Badge className={`text-xs border ${statusInfo.cls}`}>
                    {statusInfo.label}
                  </Badge>
                </div>
                <p className="text-xs text-[#849585] truncate">
                  {leagueNames[c.league_a_id] ?? "League A"} vs{" "}
                  {leagueNames[c.league_b_id] ?? "League B"} · starts GW{c.start_gw}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-4">
                <Link href={`/tournaments/${c.id}/public`}>
                  <Button size="sm" className="bg-[#132030] border border-[#00e478]/40 text-[#00e478] hover:bg-[#1e2b3b]">
                    {c.created_by === user?.id ? "Public" : "View"}
                  </Button>
                </Link>
                {c.created_by === user?.id && (
                  <Button
                    size="sm"
                    className="bg-[#132030] border border-[#3b4b3d] text-[#d6e4f9] hover:bg-[#1e2b3b]"
                    onClick={() => router.push(`/tournaments/${c.id}`)}
                  >
                    Manage
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}