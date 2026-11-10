"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Lock, Plus, Users, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";

interface LeagueRow {
  id: string;
  name: string;
  status: string | null;
  room_password: string | null;
  created_by: string | null;
  created_at: string | null;
  participant_count: number;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  setup: { label: "Setup", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  active: { label: "Live", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  complete: { label: "Complete", cls: "bg-muted text-muted-foreground border-border/60" },
};

export default function AuctionBrowsePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const shouldReduce = useReducedMotion();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberLeagueIds, setMemberLeagueIds] = useState<Set<string>>(new Set());

  const [pendingLeague, setPendingLeague] = useState<LeagueRow | null>(null);
  const [pendingAction, setPendingAction] = useState<"enter" | "spectate">("enter");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadLeagues() {
    const { data, error } = await supabase
      .from("leagues")
      .select("id, name, status, room_password, created_by, created_at")
      .order("created_at", { ascending: false });
    if (error || !data) {
      setLoading(false);
      return;
    }

    const leagueIds = data.map((l) => l.id);
    const [partCounts, myMembers] = await Promise.all([
      leagueIds.length > 0
        ? supabase
            .from("participants")
            .select("league_id")
            .in("league_id", leagueIds)
        : Promise.resolve({ data: [] as { league_id: string | null }[] }),
      user
        ? supabase
            .from("team_members")
            .select("league_id")
            .eq("user_id", user.id)
        : Promise.resolve({ data: [] as { league_id: string }[] }),
    ]);

    const countMap: Record<string, number> = {};
    for (const p of partCounts.data ?? []) {
      if (!p.league_id) continue;
      countMap[p.league_id] = (countMap[p.league_id] ?? 0) + 1;
    }

    // Commit every update in one render: if the skeleton is still on screen
    // when the cards mount, the list renders below it and jumps up after.
    setLeagues(
      data.map((l) => ({
        ...l,
        participant_count: countMap[l.id] ?? 0,
      })),
    );
    setMemberLeagueIds(
      new Set((myMembers.data ?? []).map((m) => m.league_id).filter(Boolean)),
    );
    setLoading(false);
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- intentional: loadLeagues calls setState; wait for auth so it runs once with the final user */
  useEffect(() => {
    if (authLoading) return;
    loadLeagues().catch(() => {});
  }, [authLoading, user?.id]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  /* eslint-disable react-hooks/set-state-in-effect -- intentional: reset password form when different league selected */
  useEffect(() => {
    if (pendingLeague) {
      setPasswordInput("");
      setPasswordError("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [pendingLeague]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleEnter(league: LeagueRow) {
    if (league.created_by === user?.id) {
      router.push(`/auction/${league.id}`);
      return;
    }
    if (!league.room_password) {
      router.push(`/auction/${league.id}`);
      return;
    }
    setPendingLeague(league);
    setPendingAction("enter");
  }

  function handleSpectate(league: LeagueRow) {
    if (!league.room_password) {
      router.push(`/auction/${league.id}/spectate`);
      return;
    }
    setPendingLeague(league);
    setPendingAction("spectate");
  }

  function submitPassword() {
    if (!pendingLeague) return;
    if (passwordInput.trim() === pendingLeague.room_password) {
      router.push(
        pendingAction === "spectate"
          ? `/auction/${pendingLeague.id}/spectate`
          : `/auction/${pendingLeague.id}`,
      );
      setPendingLeague(null);
    } else {
      setPasswordError("Incorrect password. Try again.");
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Page Header — Consistent across Hub */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Auctions
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Browse live auction rooms, manage your draft leagues, or spectate ongoing sessions.
          </p>
        </div>
        <Link href="/auction/setup">
          <motion.div whileTap={shouldReduce ? undefined : { scale: 0.96 }}>
            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:brightness-105 active:scale-95 font-semibold text-xs px-4 h-9 gap-1.5 shadow-xs transition-all">
              <Plus className="h-4 w-4" />
              <span>New Auction</span>
            </Button>
          </motion.div>
        </Link>
      </div>

      {/* Loading Skeletons — mirrors the real card geometry so the swap
          doesn't shift the list. Only shown before the first load commits. */}
      {loading && leagues.length === 0 && (
        <div className="space-y-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/60 bg-card/60 p-5 sm:p-6 animate-pulse flex flex-col sm:flex-row sm:items-center justify-between gap-5"
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <div className="h-6 sm:h-7 w-48 rounded-lg bg-muted/60" />
                  <div className="h-5 w-16 rounded-full bg-muted/40" />
                </div>
                <div className="h-4 w-32 rounded bg-muted/40" />
              </div>
              <div className="h-8.5 w-24 rounded-full bg-muted/60 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && leagues.length === 0 && (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border/70 bg-card/40 p-8 max-w-xl mx-auto">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
            <Users className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">No auctions yet</p>
          <p className="text-sm text-muted-foreground mb-5">
            Create an auction room to draft FPL squads in realtime with your league managers.
          </p>
          <Link href="/auction/setup">
            <motion.div whileTap={shouldReduce ? undefined : { scale: 0.96 }} className="inline-block">
              <Button size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-4">
                Create First Auction
              </Button>
            </motion.div>
          </Link>
        </div>
      )}

      {/* Full-Row Auction Cards List */}
      <div className="space-y-3.5">
        {leagues.map((league) => {
          const statusInfo =
            STATUS_LABELS[league.status ?? "setup"] ?? {
              label: "Setup",
              cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
            };
          const isOwner = user?.id === league.created_by;
          const isMember = memberLeagueIds.has(league.id);

          return (
            <motion.div
              key={league.id}
              whileHover={shouldReduce ? undefined : { y: -1 }}
              whileTap={shouldReduce ? undefined : { scale: 0.998 }}
              transition={{ type: "spring", bounce: 0, duration: 0.2 }}
              style={{
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
              className="group rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-5 sm:p-6 hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                {/* Left: Identity and Badges */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors truncate">
                      {league.name}
                    </h2>
                    <Badge className={`text-[11px] font-medium border rounded-full px-2.5 py-0.5 ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </Badge>
                    {isOwner && (
                      <Badge className="text-[11px] font-medium border rounded-full px-2.5 py-0.5 bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30">
                        Your auction
                      </Badge>
                    )}
                    {isMember && !isOwner && (
                      <Badge className="text-[11px] font-medium border rounded-full px-2.5 py-0.5 bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30">
                        Joined
                      </Badge>
                    )}
                    {league.room_password && !isOwner && (
                      <Badge className="text-[11px] font-medium border rounded-full px-2 py-0.5 bg-muted text-muted-foreground border-border/60 inline-flex items-center gap-1">
                        <Lock className="w-3 h-3 text-muted-foreground" />
                        <span>Password</span>
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="tabular-nums font-semibold">{league.participant_count}</span>
                      <span>{league.participant_count === 1 ? "team" : "teams"}</span>
                    </span>
                    <span>·</span>
                    <span className="text-[11px]">
                      Created {league.created_at ? new Date(league.created_at).toLocaleDateString() : "recently"}
                    </span>
                  </div>
                </div>

                {/* Right: Action Buttons with clear hover states */}
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  {league.status === "active" && !isOwner && !isMember && (
                    <motion.div whileTap={shouldReduce ? undefined : { scale: 0.96 }} className="flex-1 sm:flex-initial">
                      <Button
                        onClick={() => handleSpectate(league)}
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto rounded-full border border-border/80 bg-background/80 hover:bg-muted hover:border-foreground/40 hover:text-foreground text-foreground h-8.5 px-4 text-xs font-medium transition-all shadow-2xs"
                      >
                        Spectate
                      </Button>
                    </motion.div>
                  )}

                  <motion.div whileTap={shouldReduce ? undefined : { scale: 0.96 }} className="flex-1 sm:flex-initial">
                    {isOwner ? (
                      <Button
                        onClick={() => handleEnter(league)}
                        size="sm"
                        className="w-full sm:w-auto rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:brightness-105 active:scale-95 font-semibold h-8.5 px-4 text-xs gap-1 shadow-xs transition-all"
                      >
                        <span>Manage</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleEnter(league)}
                        size="sm"
                        variant={isMember ? "default" : "outline"}
                        className={
                          isMember
                            ? "w-full sm:w-auto rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:brightness-105 active:scale-95 font-semibold h-8.5 px-4 text-xs gap-1 shadow-xs transition-all"
                            : "w-full sm:w-auto rounded-full border border-border/80 bg-background/80 hover:bg-muted hover:border-foreground/40 hover:text-foreground text-foreground h-8.5 px-4 text-xs font-medium transition-all shadow-2xs"
                        }
                      >
                        <span>Enter</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Password Modal (Apple Surface + Motion) */}
      <AnimatePresence>
        {pendingLeague && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setPendingLeague(null)}
            />
            <motion.div
              initial={shouldReduce ? false : { opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduce ? undefined : { opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", bounce: 0, duration: 0.25 }}
              className="relative bg-card/95 border border-border/80 rounded-2xl p-6 sm:p-7 w-full max-w-sm space-y-4 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-foreground tracking-tight">Room Password</h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    <span className="text-foreground font-semibold">{pendingLeague.name}</span>{" "}
                    {pendingAction === "spectate"
                      ? "requires a password to spectate."
                      : "requires a password to enter."}
                  </p>
                </div>
                <button
                  onClick={() => setPendingLeague(null)}
                  className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <Input
                  ref={inputRef}
                  type="password"
                  placeholder="Enter room password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && submitPassword()}
                  className="rounded-xl bg-muted/40 border-border/70 text-foreground placeholder:text-muted-foreground h-10 px-3.5 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
                {passwordError && (
                  <p className="text-xs font-medium text-destructive">{passwordError}</p>
                )}
              </div>

              <div className="flex gap-2.5 pt-1">
                <Button
                  onClick={() => setPendingLeague(null)}
                  variant="outline"
                  className="flex-1 rounded-full border border-border/80 text-foreground hover:bg-muted font-medium h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitPassword}
                  disabled={!passwordInput.trim()}
                  className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:brightness-105 active:scale-95 font-semibold h-9 text-xs shadow-xs transition-all"
                >
                  {pendingAction === "spectate" ? "Watch" : "Enter"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
