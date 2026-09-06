"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Trophy, Layers, Calendar, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamAvatar } from "@/components/team-avatar";
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
  setup: { label: "Setup", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  active: { label: "Live", cls: "bg-[#00e478]/15 text-[#00e478] border-[#00e478]/30" },
  complete: { label: "Complete", cls: "bg-[#3b4b3d]/40 text-[#849585] border-[#3b4b3d]" },
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
      cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    };

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
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      {/* Tournament Header */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#d6e4f9] truncate">
              {competition.name}
            </h1>
            <Badge className={`text-xs border ${statusInfo.cls}`}>
              {statusInfo.label}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#849585]">
            {teams.filter((t) => t.group_label === "A").length} teams in Group A ·{" "}
            {teams.filter((t) => t.group_label === "B").length} teams in Group B · starts GW
            {competition.start_gw} · scored on official FPL gameweek points
          </p>
        </div>

        {user && competition.created_by === user.id && (
          <div className="shrink-0">
            <Link href={`/tournaments/${competition.id}`}>
              <Button
                size="sm"
                className="bg-[#132030] border border-[#3b4b3d] text-[#d6e4f9] hover:bg-[#1e2b3b] flex items-center gap-1.5"
              >
                <span>Manage</span>
                <ExternalLink className="h-3.5 w-3.5 text-[#849585]" />
              </Button>
            </Link>
          </div>
        )}
      </header>

      {/* Tabs Navigation Bar */}
      <div className="flex gap-2 sm:gap-4 border-b border-[#3b4b3d] overflow-x-auto no-scrollbar">
        {tabs.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleTabChange(key)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all shrink-0 ${
                isActive
                  ? "border-[#00e478] text-[#00e478]"
                  : "border-transparent text-[#849585] hover:text-[#d6e4f9]"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-[#00e478]" : "text-[#849585]"}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content: Standings */}
      {activeTab === "standings" && (
        <section className="space-y-6">
          {(["A", "B"] as const).map((g) => (
            <div key={g} className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#3b4b3d] flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[#d6e4f9]">Group {g}</span>
                <span className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1.5 text-[#849585]">
                    <span className="h-2 w-2 rounded-full bg-[#00e478]" /> Qualifiers (1-4)
                  </span>
                  <span className="flex items-center gap-1.5 text-[#849585]">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Eliminators (5-8)
                  </span>
                  <span className="flex items-center gap-1.5 text-[#849585]">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Out (9-10)
                  </span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-[#849585] text-left border-b border-[#3b4b3d]">
                      <th className="px-4 py-2 font-normal">#</th>
                      <th className="px-2 py-2 font-normal">Team</th>
                      <th className="px-2 py-2 font-normal text-center">P</th>
                      <th className="px-2 py-2 font-normal text-center">W</th>
                      <th className="px-2 py-2 font-normal text-center">D</th>
                      <th className="px-2 py-2 font-normal text-center">L</th>
                      <th className="px-2 py-2 font-normal text-center">SD</th>
                      <th className="px-2 py-2 font-normal text-center">PS</th>
                      <th className="px-2 py-2 font-normal text-center">PC</th>
                      <th className="px-4 py-2 font-normal text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings
                      .filter((s) => s.group === g)
                      .map((s, i) => {
                        const zoneBg = i < 4 ? "bg-[#00e478]" : i < 8 ? "bg-amber-500" : "bg-red-500";
                        const team = teams.find((t) => t.id === s.teamId);
                        return (
                          <tr key={s.teamId} className="border-b border-[#3b4b3d]/50 text-[#d6e4f9]">
                            <td className="px-4 py-2 text-[#849585] relative">
                              <span
                                aria-hidden
                                className={`pointer-events-none absolute left-0 top-[1px] bottom-[1px] w-[3px] ${zoneBg}`}
                                style={{
                                  clipPath: "polygon(0 0, 100% 14%, 100% 86%, 0 100%)",
                                }}
                              />
                              {i + 1}
                            </td>
                            <td className="px-2 py-2">
                              <span className="flex items-center gap-2 min-w-0">
                                <TeamAvatar
                                  name={s.name}
                                  src={team?.avatar_url ?? null}
                                  color={team?.color ?? null}
                                  size="sm"
                                />
                                <span className="truncate max-w-[220px]">{s.name}</span>
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center text-[#849585]">{s.played}</td>
                            <td className="px-2 py-2 text-center">{s.won}</td>
                            <td className="px-2 py-2 text-center">{s.drawn}</td>
                            <td className="px-2 py-2 text-center">{s.lost}</td>
                            <td className="px-2 py-2 text-center">
                              {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                            </td>
                            <td className="px-2 py-2 text-center">{s.pointsFor}</td>
                            <td className="px-2 py-2 text-center">{s.pointsAgainst}</td>
                            <td className="px-4 py-2 text-right font-semibold text-[#00e478]">{s.points}</td>
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
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4">
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
