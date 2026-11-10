"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Layers, Calendar, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamAvatar } from "@/components/team-avatar";
import { StandingsExport } from "@/components/standings-export";
import { TournamentBracket } from "@/components/tournament-bracket";
import { TournamentFixtures } from "@/components/tournament-fixtures";
import { computeGroupStandings } from "@/lib/tournament/standings";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";
import type {
  CompetitionConfig,
  CompetitionFixtureRow,
  CompetitionRow,
  CompetitionTeamRow,
} from "@/lib/tournament/types";

type PublicTab = "standings" | "bracket" | "fixtures";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  setup: { label: "Setup", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  active: { label: "Live", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  complete: { label: "Complete", cls: "bg-muted text-muted-foreground border-border/60" },
};

interface PublicTournamentClientProps {
  competition: CompetitionRow;
  teams: CompetitionTeamRow[];
  initialFixtures: CompetitionFixtureRow[];
  liveGameweek: number | null;
  currentGameweek: number | null;
  initialTab?: string;
}

export function PublicTournamentClient({
  competition,
  teams,
  initialFixtures,
  liveGameweek,
  currentGameweek,
  initialTab,
}: PublicTournamentClientProps) {
  const { user } = useAuth();
  const [fixtures, setFixtures] = useState<CompetitionFixtureRow[]>(initialFixtures);
  const [activeTab, setActiveTab] = useState<PublicTab>(() => {
    if (initialTab === "bracket" || initialTab === "fixtures" || initialTab === "standings") {
      return initialTab;
    }
    return "standings";
  });

  const config = competition.format_config as unknown as CompetitionConfig;
  const standings = useMemo(
    () => computeGroupStandings(teams, fixtures, config),
    [teams, fixtures, config],
  );

  const statusInfo =
    STATUS_LABELS[competition.status] ?? {
      label: "Setup",
      cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    };

  const gameweekLabel = liveGameweek
    ? `Live GW${liveGameweek}`
    : currentGameweek
      ? `GW${currentGameweek}`
      : `Starts GW${competition.start_gw}`;

  // Background non-blocking auto-score sync
  useEffect(() => {
    const targetGw = liveGameweek ?? currentGameweek;
    if (!targetGw || (competition.status !== "active" && competition.status !== "setup")) {
      return;
    }

    let isMounted = true;
    const supabase = createSupabaseBrowserClient();

    fetch(`/api/tournaments/${competition.id}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gw: targetGw, checkOnly: true }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!isMounted || !data?.scored || data.scored === 0) return;
        supabase
          .from("competition_fixtures")
          .select("*")
          .eq("competition_id", competition.id)
          .order("gw")
          .then((res) => {
            if (isMounted && res.data) {
              setFixtures(res.data as CompetitionFixtureRow[]);
            }
          });
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [competition.id, competition.status, liveGameweek, currentGameweek]);

  const handleTabChange = (tab: PublicTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const tabs: Array<{ key: PublicTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: "standings", label: "Standings", icon: Trophy },
    { key: "bracket", label: "Bracket", icon: Layers },
    { key: "fixtures", label: "Fixtures & Results", icon: Calendar },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Tournament Header */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
              {competition.name}
            </h1>
            <Badge className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${statusInfo.cls}`}>
              {statusInfo.label}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            <span className="tabular-nums font-medium text-foreground/80">{teams.filter((t) => t.group_label === "A").length}</span> teams in Group A ·{" "}
            <span className="tabular-nums font-medium text-foreground/80">{teams.filter((t) => t.group_label === "B").length}</span> teams in Group B · starts GW
            <span className="tabular-nums font-semibold text-foreground/90">{competition.start_gw}</span> · scored on official FPL gameweek points
          </p>
        </div>

        {user && competition.created_by === user.id && (
          <div className="shrink-0 self-end sm:self-auto">
            <Link href={`/tournaments/${competition.id}`}>
              <motion.div whileTap={{ scale: 0.96 }}>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-border/80 text-foreground hover:bg-muted/70 flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium"
                >
                  <span>Manage</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Button>
              </motion.div>
            </Link>
          </div>
        )}
      </header>

      {/* Apple Segmented Capsule Rail & Standings Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/50 backdrop-blur-md overflow-x-auto no-scrollbar max-w-full">
          {tabs.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTabChange(key)}
                className={`relative px-3.5 sm:px-4 py-1.5 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 shrink-0 ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="public-tournament-active-tab"
                    transition={{ type: "spring", bounce: 0, duration: 0.26 }}
                    className="absolute inset-0 rounded-full bg-primary shadow-xs"
                  />
                )}
                <Icon className="relative z-10 h-3.5 w-3.5" />
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </div>
        {activeTab === "standings" && (
          <div className="shrink-0 self-end sm:self-auto">
            <StandingsExport
              competitionName={competition.name}
              gameweekLabel={gameweekLabel}
              standings={standings}
              teams={teams}
            />
          </div>
        )}
      </div>

      {/* Tab Content: Standings */}
      {activeTab === "standings" && (
        <section className="space-y-6">
          {(["A", "B"] as const).map((g) => (
            <div key={g} className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-border/60 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-sm font-semibold tracking-tight text-foreground">Group {g}</span>
                <span className="flex items-center gap-3.5 text-[11px] flex-wrap">
                  <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs" /> Qualifiers (1-4)
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                    <span className="h-2 w-2 rounded-full bg-amber-500 shadow-xs" /> Eliminators (5-8)
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-rose-700 dark:text-rose-400">
                    <span className="h-2 w-2 rounded-full bg-rose-500 shadow-xs" /> Out (9-10)
                  </span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-left border-b border-border/50">
                      <th className="px-4 py-2.5 font-semibold">#</th>
                      <th className="px-3 py-2.5 font-semibold">Team</th>
                      <th className="px-2.5 py-2.5 font-semibold text-center">P</th>
                      <th className="px-2.5 py-2.5 font-semibold text-center">W</th>
                      <th className="px-2.5 py-2.5 font-semibold text-center">D</th>
                      <th className="px-2.5 py-2.5 font-semibold text-center">L</th>
                      <th className="px-2.5 py-2.5 font-semibold text-center">SD</th>
                      <th className="px-2.5 py-2.5 font-semibold text-center">PS</th>
                      <th className="px-2.5 py-2.5 font-semibold text-center">PC</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings
                      .filter((s) => s.group === g)
                      .map((s, i) => {
                        const zoneBg = i < 4 ? "bg-emerald-500" : i < 8 ? "bg-amber-500" : "bg-rose-500";
                        const team = teams.find((t) => t.id === s.teamId);
                        return (
                          <tr key={s.teamId} className="border-b border-border/40 hover:bg-muted/30 transition-colors text-foreground">
                            <td className="px-4 py-2.5 text-muted-foreground relative tabular-nums font-medium">
                              <span
                                aria-hidden
                                className={`pointer-events-none absolute left-0 top-[2px] bottom-[2px] w-[3px] rounded-r ${zoneBg}`}
                              />
                              {i + 1}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="flex items-center gap-2.5 min-w-0">
                                <TeamAvatar
                                  name={s.name}
                                  src={team?.avatar_url ?? null}
                                  color={team?.color ?? null}
                                  size="sm"
                                />
                                <span className="truncate max-w-[220px] font-medium">{s.name}</span>
                              </span>
                            </td>
                            <td className="px-2.5 py-2.5 text-center text-muted-foreground tabular-nums">{s.played}</td>
                            <td className="px-2.5 py-2.5 text-center tabular-nums">{s.won}</td>
                            <td className="px-2.5 py-2.5 text-center tabular-nums">{s.drawn}</td>
                            <td className="px-2.5 py-2.5 text-center tabular-nums">{s.lost}</td>
                            <td className="px-2.5 py-2.5 text-center tabular-nums font-medium">
                              {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                            </td>
                            <td className="px-2.5 py-2.5 text-center tabular-nums">{s.pointsFor}</td>
                            <td className="px-2.5 py-2.5 text-center tabular-nums">{s.pointsAgainst}</td>
                            <td className="px-4 py-2.5 text-right font-bold tabular-nums text-emerald-700 dark:text-primary">
                              {s.points}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Tab Content: Bracket */}
      {activeTab === "bracket" && (
        <section className="space-y-3">
          <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-4 sm:p-6 shadow-sm overflow-x-auto">
            <TournamentBracket teams={teams} fixtures={fixtures} />
          </div>
        </section>
      )}

      {/* Tab Content: Fixtures & Results */}
      {activeTab === "fixtures" && (
        <section className="space-y-3">
          <TournamentFixtures
            fixtures={fixtures}
            teams={teams}
            liveGameweek={liveGameweek}
            currentGameweek={currentGameweek}
          />
        </section>
      )}
    </div>
  );
}
