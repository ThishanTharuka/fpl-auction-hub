"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";
import { LeagueSettingsPanel } from "./league-settings-panel";
import type { LobbyLeague, LobbyParticipant, LobbyMember } from "./lobby-loader";

export function LobbyContent({
  league: initialLeague,
  participants: initialParticipants,
  members: initialMembers,
}: {
  league: LobbyLeague;
  participants: LobbyParticipant[];
  members: LobbyMember[];
  leagueId: string;
}) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const shouldReduce = useReducedMotion();

  const [league, setLeague] = useState<LobbyLeague>(initialLeague);
  const [teams, setTeams] = useState<LobbyParticipant[]>(initialParticipants);
  const [members, setMembers] = useState<LobbyMember[]>(initialMembers);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [startingAuction, setStartingAuction] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const myMembership = useMemo(() => {
    if (!user) return null;
    return members.find((m) => m.user_id === user.id) ?? null;
  }, [user, members]);

  const isAuctioneer = user?.id === league.created_by;

  const reload = useCallback(async () => {
    const [{ data: lg }, { data: ps }, { data: ms }] = await Promise.all([
      supabase.from("leagues").select("*").eq("id", id).single(),
      supabase.from("participants").select("id,name,color").eq("league_id", id).order("name"),
      supabase.from("team_members").select("id,participant_id,user_id,user_email,user_name,status").eq("league_id", id),
    ]);
    if (lg) setLeague(lg as unknown as LobbyLeague);
    if (ps) setTeams(ps as LobbyParticipant[]);
    if (ms) setMembers(ms as LobbyMember[]);
  }, [id, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`lobby-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members", filter: `league_id=eq.${id}` },
        (payload) => {
          const m = payload.new as Record<string, unknown>;
          const o = payload.old as Record<string, unknown>;
          if (payload.eventType === "INSERT") {
            setMembers((prev) =>
              prev.some((x) => x.id === (m.id as string))
                ? prev
                : [
                    ...prev,
                    {
                      id: m.id as string,
                      participant_id: m.participant_id as string,
                      user_id: m.user_id as string,
                      user_email: m.user_email as string,
                      user_name: (m.user_name as string) ?? null,
                      status: m.status as string,
                    },
                  ],
            );
          } else if (payload.eventType === "UPDATE") {
            setMembers((prev) =>
              prev.map((x) =>
                x.id === m.id
                  ? {
                      ...x,
                      participant_id: (m.participant_id as string) ?? x.participant_id,
                      user_id: (m.user_id as string) ?? x.user_id,
                      user_email: (m.user_email as string) ?? x.user_email,
                      user_name: (m.user_name as string) ?? x.user_name,
                      status: (m.status as string) ?? x.status,
                    }
                  : x,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setMembers((prev) => prev.filter((x) => x.id !== (o.id as string)));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leagues", filter: `id=eq.${id}` },
        (payload) => {
          setLeague(payload.new as unknown as LobbyLeague);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel).catch(() => {}); };
  }, [id, supabase]);

  async function claimTeam(participantId: string) {
    if (!user) { router.push("/login"); return; }
    setClaiming(participantId);
    await supabase.from("team_members").delete().eq("league_id", id).eq("user_id", user.id).eq("status", "rejected");
    await supabase.from("team_members").insert({
      league_id: id,
      participant_id: participantId,
      user_id: user.id,
      user_email: user.email ?? "",
      user_name: user.user_metadata?.["full_name"] ?? null,
      status: "pending",
    });
    setClaiming(null);
    await reload();
  }

  async function updateMemberStatus(memberId: string, status: "approved" | "rejected") {
    await supabase.from("team_members").update({ status }).eq("id", memberId);
    await reload();
  }

  async function startAuction() {
    setStartingAuction(true);
    await supabase.from("leagues").update({ status: "active" }).eq("id", id);
    setLeague((l) => (l ? { ...l, status: "active" } : l));
    setStartingAuction(false);
  }

  async function deleteLeague() {
    if (!user) return;
    setDeleting(true);
    const { error } = await supabase.from("leagues").delete().eq("id", id).eq("created_by", user.id);
    if (error) {
      setDeleting(false);
      setShowDeleteConfirm(false);
      return;
    }
    router.push("/auction");
  }

  function onSettingsSaved(updated: Partial<LobbyLeague>) {
    setLeague((l) => (l ? { ...l, ...updated } : l));
  }

  if (!league) {
    return (
      <div className="flex items-center justify-center h-64 text-sm font-semibold text-destructive">
        Auction not found.
      </div>
    );
  }

  const canStart = teams.length > 0;

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column - main content */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Header — Apple Visual Craftsmanship */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {league.name}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                {isAuctioneer ? "You are the auctioneer of this room." : "Auction Lobby — Wait for auctioneer to begin."}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAuctioneer && (
                <Button
                  onClick={() => setMobileSettingsOpen(true)}
                  variant="outline"
                  className="lg:hidden rounded-full border border-border/80 bg-background/80 hover:bg-muted text-foreground h-8 px-3.5 text-xs font-medium"
                >
                  Settings
                </Button>
              )}
              {!isAuctioneer && league.status === "active" && (!myMembership || myMembership.status === "rejected") && (
                <Link href={`/auction/${id}/spectate`}>
                  <Button
                    variant="outline"
                    className="rounded-full border border-primary/40 text-primary hover:bg-primary/10 h-8 px-4 text-xs font-semibold"
                  >
                    Spectate live
                  </Button>
                </Link>
              )}
              <StatusBadge status={league.status ?? "setup"} />
            </div>
          </div>

          {/* Auctioneer: start + manage Banner */}
          {isAuctioneer && (
            <div className="rounded-2xl border border-purple-500/25 bg-purple-500/5 dark:bg-purple-950/20 backdrop-blur-md p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                  Auctioneer Controls
                </h2>
              </div>
              <div className="flex gap-2.5 flex-wrap items-center">
                {league.status === "setup" && (
                  <motion.div whileTap={shouldReduce ? undefined : { scale: 0.96 }}>
                    <Button
                      onClick={startAuction}
                      disabled={startingAuction || !canStart}
                      className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:brightness-105 active:scale-95 font-semibold h-8.5 text-xs px-4.5 shadow-xs transition-all"
                    >
                      {startingAuction ? "Starting..." : "Start Auction"}
                    </Button>
                  </motion.div>
                )}
                {league.status === "active" && (
                  <Link href={`/auction/${id}/auctioneer`}>
                    <motion.div whileTap={shouldReduce ? undefined : { scale: 0.96 }}>
                      <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:brightness-105 active:scale-95 font-semibold h-8.5 text-xs px-4.5 shadow-xs transition-all">
                        Open Auctioneer Panel
                      </Button>
                    </motion.div>
                  </Link>
                )}
                <Link href={`/auction/${id}/teams`}>
                  <motion.div whileTap={shouldReduce ? undefined : { scale: 0.96 }}>
                    <Button variant="outline" className="rounded-full border border-border/80 bg-background/80 hover:bg-muted hover:border-foreground/40 text-foreground font-medium h-8.5 text-xs px-4 shadow-2xs">
                      View Teams
                    </Button>
                  </motion.div>
                </Link>
                <motion.div whileTap={shouldReduce ? undefined : { scale: 0.96 }} className="ml-auto">
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="outline"
                    className="rounded-full border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive hover:text-destructive-foreground font-semibold h-8.5 text-xs px-4 transition-all"
                  >
                    Delete Room
                  </Button>
                </motion.div>
              </div>
              {league.status === "setup" && !canStart && (
                <p className="text-xs text-muted-foreground">
                  At least one team is required before starting the auction.
                </p>
              )}
            </div>
          )}

          {/* Manager: my status */}
          {!isAuctioneer && user && myMembership && (
            <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-5 sm:p-6 space-y-3.5 shadow-xs">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Status</h2>
              <div className="flex items-center gap-3">
                <TeamDot color={teams.find((t) => t.id === myMembership.participant_id)?.color ?? "#888"} />
                <span className="text-foreground font-semibold text-sm">
                  {teams.find((t) => t.id === myMembership.participant_id)?.name ?? "Unknown team"}
                </span>
                <StatusPill status={myMembership.status} />
              </div>
              {myMembership.status === "approved" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {league.status === "active" && (
                    <Link href={`/auction/${id}/bid`}>
                      <motion.div whileTap={shouldReduce ? undefined : { scale: 0.96 }}>
                        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:brightness-105 active:scale-95 font-semibold text-xs h-9 px-4.5 shadow-xs transition-all">
                          Go to Live Auction →
                        </Button>
                      </motion.div>
                    </Link>
                  )}
                  <Link href={`/auction/${id}/teams/${myMembership.participant_id}/edit`}>
                    <motion.div whileTap={shouldReduce ? undefined : { scale: 0.96 }}>
                      <Button variant="outline" className="rounded-full border border-border/80 bg-background/80 hover:bg-muted text-foreground font-medium text-xs h-9 px-4 shadow-2xs">
                        Edit Team
                      </Button>
                    </motion.div>
                  </Link>
                </div>
              )}
              {myMembership.status === "pending" && (
                <p className="text-xs text-muted-foreground">Waiting for the auctioneer to approve your claim.</p>
              )}
              {myMembership.status === "rejected" && (
                <p className="text-xs font-medium text-destructive">Your claim was rejected. You can claim another open team below.</p>
              )}
            </div>
          )}

          {/* Manager: not logged in */}
          {!isAuctioneer && !user && (
            <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-6 shadow-xs">
              <p className="text-sm text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline font-semibold">Sign in</Link>{" "}
                to claim a team and participate in this live draft auction.
              </p>
            </div>
          )}

          {/* Teams list */}
          <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Teams ({teams.length})
              </h2>
            </div>
            <div className="space-y-2.5">
              {teams.map((team) => {
                const teamMembers = members.filter((m) => m.participant_id === team.id);
                const approvedManagers = teamMembers.filter((m) => m.status === "approved");
                const pendingManagers = teamMembers.filter((m) => m.status === "pending");
                const myClaimHere = user ? teamMembers.find((m) => m.user_id === user.id) : null;
                const canClaim =
                  user &&
                  !isAuctioneer &&
                  (!myMembership || myMembership.status === "rejected") &&
                  approvedManagers.length < 2;

                return (
                  <div
                    key={team.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 border border-border/60 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <TeamDot color={team.color ?? "#888"} />
                        <span className="text-sm text-foreground font-semibold truncate">{team.name}</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap pl-[20px] sm:pl-0">
                        {approvedManagers.map((m) => (
                          <span key={m.id} className="text-[11px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 rounded-full px-2 py-0.2">
                            {m.user_name ?? m.user_email}
                          </span>
                        ))}
                        {pendingManagers.map((m) => (
                          <span key={m.id} className="text-[11px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 rounded-full px-2 py-0.2">
                            {m.user_name ?? m.user_email} (pending)
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isAuctioneer && pendingManagers.map((m) => (
                        <ApproveRejectButtons
                          key={m.id}
                          memberId={m.id}
                          onApprove={updateMemberStatus}
                          onReject={updateMemberStatus}
                        />
                      ))}

                      {canClaim && !myClaimHere && (
                        <motion.div whileTap={shouldReduce ? undefined : { scale: 0.95 }}>
                          <Button
                            size="sm"
                            onClick={() => claimTeam(team.id).catch(() => {})}
                            disabled={claiming === team.id}
                            className="h-7.5 px-3.5 text-xs rounded-full border border-border/80 bg-background hover:bg-muted hover:border-foreground/30 text-foreground font-medium shadow-2xs transition-all"
                          >
                            {claiming === team.id ? "Claiming..." : "Claim"}
                          </Button>
                        </motion.div>
                      )}

                      {myClaimHere && (
                        <StatusPill status={myClaimHere.status} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick links (auctioneer view) */}
          {isAuctioneer && (
            <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-6 space-y-3 shadow-xs">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Links</h2>
              <CopyRow label="Lobby URL" url={`/auction/${id}`} />
              <CopyRow label="Teams View" url={`/auction/${id}/teams`} />
            </div>
          )}
        </div>

        {/* Right column - settings sidebar (auctioneer only) */}
        {isAuctioneer && league && (
          <aside className="w-full lg:w-[460px] shrink-0">
            <LeagueSettingsPanel
              leagueId={id}
              settings={league as unknown as Parameters<typeof LeagueSettingsPanel>[0]['settings']}
              onSaved={onSettingsSaved}
              mobileOpen={mobileSettingsOpen}
              onMobileOpenChange={setMobileSettingsOpen}
            />
          </aside>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => !deleting && setShowDeleteConfirm(false)}
            />
            <motion.div
              initial={shouldReduce ? false : { opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduce ? undefined : { opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", bounce: 0, duration: 0.25 }}
              className="relative bg-card/95 border border-border/80 rounded-2xl p-6 sm:p-7 w-full max-w-sm space-y-4 shadow-2xl backdrop-blur-xl"
            >
              <h3 className="text-base font-bold text-foreground tracking-tight">Delete Auction?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This will permanently delete <span className="font-semibold text-foreground">{league.name}</span> and all associated data — teams, player sales, bids, and member records. This action cannot be undone.
              </p>
              <div className="flex gap-2.5 justify-end pt-2">
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  variant="outline"
                  className="rounded-full border border-border/80 text-foreground hover:bg-muted font-medium h-9 text-xs px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={deleteLeague}
                  disabled={deleting}
                  className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold h-9 text-xs px-4.5 shadow-xs transition-all"
                >
                  {deleting ? "Deleting..." : "Delete Permanently"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function ApproveRejectButtons({ memberId, onApprove, onReject }: Readonly<{
  memberId: string;
  onApprove: (id: string, status: "approved" | "rejected") => Promise<void>;
  onReject: (id: string, status: "approved" | "rejected") => Promise<void>;
}>) {
  return (
    <div className="flex gap-1.5">
      <Button
        size="sm"
        onClick={() => onApprove(memberId, "approved").catch(() => {})}
        className="h-7 px-2.5 text-xs rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 font-semibold transition-all"
      >
        ✓
      </Button>
      <Button
        size="sm"
        onClick={() => onReject(memberId, "rejected").catch(() => {})}
        className="h-7 px-2.5 text-xs rounded-full bg-destructive/15 text-destructive hover:bg-destructive/30 border border-destructive/30 font-semibold transition-all"
      >
        ✗
      </Button>
    </div>
  );
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const map: Record<string, string> = {
    setup: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    complete: "bg-muted text-muted-foreground border-border/60",
  };
  const label: Record<string, string> = { setup: "Setup", active: "Live", complete: "Complete" };
  const cls = map[status] ?? map["setup"];
  return (
    <Badge className={`text-xs font-semibold rounded-full border px-2.5 py-0.5 ${cls}`}>
      {label[status] ?? status}
    </Badge>
  );
}

function StatusPill({ status }: Readonly<{ status: string }>) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return (
    <span className={`text-[11px] font-semibold border rounded-full px-2 py-0.5 ${map[status] ?? ""}`}>
      {status}
    </span>
  );
}

function TeamDot({ color }: Readonly<{ color: string }>) {
  return (
    <span
      className="w-3 h-3 rounded-full shrink-0 shadow-2xs ring-1 ring-black/20"
      style={{ backgroundColor: color }}
    />
  );
}

function CopyRow({ label, url }: Readonly<{ label: string; url: string }>) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  /* eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: derive window origin once on mount */
  useEffect(() => { setOrigin(globalThis.window?.location.origin ?? ""); }, []);
  const fullUrl = `${origin}${url}`;
  function copy() {
    navigator.clipboard.writeText(fullUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground w-20 shrink-0 font-medium">{label}</span>
      <span className="text-foreground font-mono text-[11px] truncate flex-1 min-w-0 bg-muted/40 border border-border/60 rounded-lg px-2.5 py-1">
        {fullUrl}
      </span>
      <Button
        onClick={copy}
        size="sm"
        className="h-7 px-3 text-xs rounded-full bg-muted/70 border border-border/70 text-foreground hover:bg-muted font-medium shrink-0 transition-all"
      >
        {copied ? "Copied!" : "Copy"}
      </Button>
    </div>
  );
}
