"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Trophy, ChevronRight } from "lucide-react";
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

interface CompetitionStats {
  totalTeams: number;
  groupACount: number;
  groupBCount: number;
  totalFixtures: number;
  scoredFixtures: number;
  progressPercent: number;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  setup: { label: "Setup", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  active: { label: "Live", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  complete: { label: "Complete", cls: "bg-muted text-muted-foreground border-border/60" },
};

export default function TournamentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [leagueNames, setLeagueNames] = useState<Record<string, string>>({});
  const [compStats, setCompStats] = useState<Record<string, CompetitionStats>>({});
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
    const compIds = rows.map((r) => r.id);

    const [{ data: leagues }, { data: teamData }, { data: fixData }] = await Promise.all([
      supabase.from("leagues").select("id,name").in("id", [...ids]),
      compIds.length > 0
        ? supabase.from("competition_teams").select("competition_id, group_label").in("competition_id", compIds)
        : Promise.resolve({ data: [] }),
      compIds.length > 0
        ? supabase.from("competition_fixtures").select("competition_id, status, gw").in("competition_id", compIds)
        : Promise.resolve({ data: [] }),
    ]);

    const names: Record<string, string> = {};
    for (const l of leagues ?? []) names[l.id] = l.name;
    setLeagueNames(names);

    const statsMap: Record<string, CompetitionStats> = {};
    const teamsList = (teamData ?? []) as { competition_id: string; group_label: string }[];
    const fixList = (fixData ?? []) as { competition_id: string; status: string; gw: number }[];

    for (const c of rows) {
      const cTeams = teamsList.filter((t) => t.competition_id === c.id);
      const cFix = fixList.filter((f) => f.competition_id === c.id);
      const groupACount = cTeams.filter((t) => t.group_label === "A").length;
      const groupBCount = cTeams.filter((t) => t.group_label === "B").length;
      const totalFixtures = cFix.length;
      const scoredFixtures = cFix.filter((f) => f.status === "scored").length;
      const progressPercent = totalFixtures > 0 ? Math.round((scoredFixtures / totalFixtures) * 100) : 0;

      statsMap[c.id] = {
        totalTeams: cTeams.length,
        groupACount,
        groupBCount,
        totalFixtures,
        scoredFixtures,
        progressPercent,
      };
    }

    setCompStats(statsMap);
    setCompetitions(rows);
    setLoading(false);
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- intentional: load on user change */
  useEffect(() => {
    load().catch(() => {});
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Page Header — Consistent with Insights, Players, Teams */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Tournaments
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Combine two leagues into a season-long competition with real FPL scoring.
          </p>
        </div>
        <Link href="/tournaments/new" className="shrink-0 self-start sm:self-auto">
          <motion.div whileTap={{ scale: 0.96 }} transition={{ type: "spring", bounce: 0, duration: 0.16 }}>
            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-xs hover:shadow-md transition-shadow gap-1.5 px-4 h-8 sm:h-9 text-xs sm:text-sm">
              <Plus className="h-4 w-4" />
              <span>New Tournament</span>
            </Button>
          </motion.div>
        </Link>
      </div>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/60 bg-card/80 p-6 animate-pulse shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-6 w-56 rounded-md bg-muted" />
                  <div className="h-4 w-40 rounded-md bg-muted/60" />
                </div>
                <div className="h-9 w-24 rounded-full bg-muted" />
              </div>
              <div className="h-10 rounded-xl bg-muted/30 w-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && competitions.length === 0 && (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border/70 bg-card/40 p-8 max-w-xl mx-auto">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
            <Trophy className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">No tournaments yet</p>
          <p className="text-sm text-muted-foreground mb-5">
            Link two draft leagues together into a Champions &amp; Europa League style tournament.
          </p>
          <Link href="/tournaments/new">
            <motion.div whileTap={{ scale: 0.96 }} className="inline-block">
              <Button size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-4">
                Create First Tournament
              </Button>
            </motion.div>
          </Link>
        </div>
      )}

      {/* Full-Row Tournament Cards List */}
      <div className="space-y-4">
        {competitions.map((c) => {
          const statusInfo =
            STATUS_LABELS[c.status] ?? { label: "Setup", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" };
          const isOwner = c.created_by === user?.id;
          const stats = compStats[c.id] ?? {
            totalTeams: 20,
            groupACount: 10,
            groupBCount: 10,
            totalFixtures: 0,
            scoredFixtures: 0,
            progressPercent: 0,
          };

          return (
            <motion.div
              key={c.id}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.998 }}
              transition={{ type: "spring", bounce: 0, duration: 0.2 }}
              className="group rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-5 sm:p-6 shadow-xs hover:border-primary/40 hover:shadow-md transition-all space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                {/* Left: Identity, Title, and Matchup Pills */}
                <div className="space-y-3 min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">

                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors truncate">
                          {c.name}
                        </h2>
                        <Badge className={`text-[11px] font-medium border rounded-full px-2.5 py-0.5 ${statusInfo.cls}`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>Starts Gameweek <b className="text-foreground font-semibold tabular-nums">{c.start_gw}</b></span>
                        <span>·</span>
                        <span>Two-Path Knockouts</span>
                        <span>·</span>
                        <span>Scored on official FPL points</span>
                      </p>
                    </div>
                  </div>

                  {/* Matchup Pills */}
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-foreground">
                      <span className="font-semibold text-emerald-800 dark:text-primary">Group A</span>
                      <span className="font-medium text-foreground">{leagueNames[c.league_a_id] ?? "League A"}</span>
                      <span className="text-muted-foreground text-[11px] tabular-nums font-normal">
                        ({stats.groupACount || 10} teams)
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase px-0.5">vs</span>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-foreground">
                      <span className="font-semibold text-emerald-800 dark:text-primary">Group B</span>
                      <span className="font-medium text-foreground">{leagueNames[c.league_b_id] ?? "League B"}</span>
                      <span className="text-muted-foreground text-[11px] tabular-nums font-normal">
                        ({stats.groupBCount || 10} teams)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center / Stat metrics: Fixture Progress */}
                <div className="flex flex-col justify-center gap-2 lg:w-72 shrink-0 py-3 lg:py-0 border-y lg:border-y-0 lg:border-x border-border/40 lg:px-6">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Season Progress</span>
                    <span className="tabular-nums font-bold text-foreground">{stats.progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden border border-border/40">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${stats.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="tabular-nums">{stats.scoredFixtures} of {stats.totalFixtures} fixtures scored</span>
                    <span className="tabular-nums font-medium text-foreground/80">{stats.totalTeams || 20} teams</span>
                  </div>
                </div>

                {/* Right: Quick Tabs and Action Buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between lg:justify-center gap-3 shrink-0">


                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link href={`/tournaments/${c.id}/public`} className="flex-1 sm:flex-initial">
                      <motion.div whileTap={{ scale: 0.96 }}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto rounded-full border border-border/80 bg-background/80 hover:bg-muted hover:border-foreground/40 hover:text-foreground text-foreground h-8.5 px-4 text-xs font-medium transition-all shadow-2xs"
                        >
                          Public View
                        </Button>
                      </motion.div>
                    </Link>
                    {isOwner && (
                      <motion.div whileTap={{ scale: 0.96 }} className="flex-1 sm:flex-initial">
                        <Button
                          size="sm"
                          className="w-full sm:w-auto rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:brightness-105 active:scale-95 font-semibold h-8.5 px-4 text-xs gap-1 shadow-xs transition-all"
                          onClick={() => router.push(`/tournaments/${c.id}`)}
                        >
                          <span>Manage</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
