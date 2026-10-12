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
  setup: { label: "Setup", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  active: { label: "Live", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  complete: { label: "Complete", cls: "bg-muted text-muted-foreground border-border" },
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
          <h1 className="text-2xl font-bold text-foreground">Tournaments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Combine two leagues into a season-long competition with real FPL scoring.
          </p>
        </div>
        <Link href="/tournaments/new">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
            + New Tournament
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4 animate-pulse shadow-sm"
            >
              <div className="h-5 w-48 rounded bg-muted" />
              <div className="h-8 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {!loading && competitions.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">No tournaments yet.</p>
          <p className="text-sm">
            <Link href="/tournaments/new" className="text-primary hover:underline font-medium">
              Create the first one
            </Link>
          </p>
        </div>
      )}

      <div className="space-y-3">
        {competitions.map((c) => {
          const statusInfo =
            STATUS_LABELS[c.status] ?? { label: "Setup", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" };
          return (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4 shadow-sm"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-semibold text-foreground truncate">
                    {c.name}
                  </span>
                  <Badge className={`text-xs border ${statusInfo.cls}`}>
                    {statusInfo.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {leagueNames[c.league_a_id] ?? "League A"} vs{" "}
                  {leagueNames[c.league_b_id] ?? "League B"} · starts GW{c.start_gw}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-4">
                <Link href={`/tournaments/${c.id}/public`}>
                  <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
                    {c.created_by === user?.id ? "Public" : "View"}
                  </Button>
                </Link>
                {c.created_by === user?.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-foreground hover:bg-muted"
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