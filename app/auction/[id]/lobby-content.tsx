"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
        () => { reload().catch(() => {}); },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leagues", filter: `id=eq.${id}` },
        () => { reload().catch(() => {}); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel).catch(() => {}); };
  }, [id, reload, supabase]);

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
    return <div className="flex items-center justify-center h-64 text-red-400">Auction not found.</div>;
  }

  const canStart = teams.length > 0;

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 lg:py-10">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column - main content */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#d6e4f9]">{league.name}</h1>
              <p className="text-sm text-[#849585] mt-1">
                {isAuctioneer ? "You are the auctioneer" : "Auction Lobby"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAuctioneer && (
                <Button
                  onClick={() => setMobileSettingsOpen(true)}
                  variant="outline"
                  className="lg:hidden border-[#3b4b3d] text-[#849585] hover:bg-[#132030] h-7 text-xs"
                >
                  Settings
                </Button>
              )}
              <StatusBadge status={league.status ?? "setup"} />
            </div>
          </div>

          {/* Auctioneer: start + manage */}
          {isAuctioneer && (
            <div className="rounded-lg border border-purple-500/30 bg-purple-900/10 p-5 space-y-4">
              <h2 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Auctioneer Controls</h2>
              <div className="flex gap-3 flex-wrap items-center">
                {league.status === "setup" && (
                  <Button
                    onClick={startAuction}
                    disabled={startingAuction || !canStart}
                    className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-semibold h-8 text-xs px-4"
                  >
                    {startingAuction ? "Starting..." : "Start Auction"}
                  </Button>
                )}
                {league.status === "active" && (
                  <Link href={`/auction/${id}/auctioneer`}>
                    <Button className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-semibold h-8 text-xs px-4">
                      Open Auctioneer Panel
                    </Button>
                  </Link>
                )}
                <Link href={`/auction/${id}/teams`}>
                  <Button variant="outline" className="border-[#3b4b3d] text-[#849585] hover:bg-[#132030] h-8 text-xs px-4">
                    View Teams
                  </Button>
                </Link>
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="outline"
                  className="ml-auto border-red-900 text-red-400 hover:bg-red-700 hover:text-white h-8 text-xs px-4"
                >
                  Delete
                </Button>
              </div>
              {league.status === "setup" && !canStart && (
                <p className="text-xs text-[#849585]">
                  At least one team is required to start.
                </p>
              )}
            </div>
          )}

          {/* Manager: my status */}
          {!isAuctioneer && user && myMembership && (
            <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5 space-y-3">
              <h2 className="text-xs font-semibold text-[#849585] uppercase tracking-wider">Your Status</h2>
              <div className="flex items-center gap-3">
                <TeamDot color={teams.find((t) => t.id === myMembership.participant_id)?.color ?? "#888"} />
                <span className="text-[#d6e4f9]">
                  {teams.find((t) => t.id === myMembership.participant_id)?.name ?? "Unknown team"}
                </span>
                <StatusPill status={myMembership.status} />
              </div>
              {myMembership.status === "approved" && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {league.status === "active" && (
                    <Link href={`/auction/${id}/bid`}>
                      <Button className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-semibold">
                        Go to Live Auction →
                      </Button>
                    </Link>
                  )}
                  <Link href={`/auction/${id}/teams/${myMembership.participant_id}/edit`}>
                    <Button variant="outline" className="border-[#3b4b3d] text-[#849585] hover:bg-[#132030]">
                      Edit Team
                    </Button>
                  </Link>
                </div>
              )}
              {myMembership.status === "pending" && (
                <p className="text-xs text-[#849585]">Waiting for the auctioneer to approve your claim.</p>
              )}
              {myMembership.status === "rejected" && (
                <p className="text-xs text-red-400">Your claim was rejected. You can claim a different team.</p>
              )}
            </div>
          )}

          {/* Manager: not logged in */}
          {!isAuctioneer && !user && (
            <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5">
              <p className="text-sm text-[#849585]">
                <Link href="/login" className="text-[#00e478] hover:underline">Sign in</Link>{" "}
                to claim a team and join this auction.
              </p>
            </div>
          )}

          {/* Teams list */}
          <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5">
            <h2 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-4">
              Teams ({teams.length})
            </h2>
            <div className="space-y-3">
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
                    className="flex items-center justify-between gap-3 rounded-md bg-[#132030] border border-[#3b4b3d] px-3 py-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <TeamDot color={team.color ?? "#888"} />
                        <span className="text-sm text-[#d6e4f9] font-medium truncate">{team.name}</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap pl-[18px] sm:pl-0">
                        {approvedManagers.map((m) => (
                          <span key={m.id} className="text-xs bg-green-500/15 text-green-400 rounded px-1.5 py-0.5">
                            {m.user_name ?? m.user_email}
                          </span>
                        ))}
                        {pendingManagers.map((m) => (
                          <span key={m.id} className="text-xs bg-yellow-500/15 text-yellow-500 rounded px-1.5 py-0.5">
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
                        <Button
                          size="sm"
                          onClick={() => claimTeam(team.id).catch(() => {})}
                          disabled={claiming === team.id}
                          className="h-7 px-3 text-xs bg-[#1e2b3b] border border-[#3b4b3d] text-[#d6e4f9] hover:bg-[#28394a]"
                        >
                          {claiming === team.id ? "Claiming..." : "Claim"}
                        </Button>
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
            <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5 space-y-2">
              <h2 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-3">Quick Links</h2>
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
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !deleting && setShowDeleteConfirm(false)} />
          <div className="relative bg-[#0f1c2c] border border-[#3b4b3d] rounded-xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-[#d6e4f9]">Delete Auction?</h3>
            <p className="text-sm text-[#849585]">
              This will permanently delete <span className="font-semibold text-[#d6e4f9]">{league.name}</span> and all associated data — teams, player sales, bids, and member records. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                variant="outline"
                className="border-[#3b4b3d] text-[#849585] hover:bg-[#1e2b3b]"
              >
                Cancel
              </Button>
              <Button
                onClick={deleteLeague}
                disabled={deleting}
                className="bg-red-700 text-white hover:bg-red-600 font-semibold"
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
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
    <div className="flex gap-1">
      <Button
        size="sm"
        onClick={() => onApprove(memberId, "approved").catch(() => {})}
        className="h-7 px-2 text-xs bg-green-700/40 text-green-400 hover:bg-green-700/60 border border-green-700/50"
      >
        ✓
      </Button>
      <Button
        size="sm"
        onClick={() => onReject(memberId, "rejected").catch(() => {})}
        className="h-7 px-2 text-xs bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800/50"
      >
        ✗
      </Button>
    </div>
  );
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const map: Record<string, string> = {
    setup: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    complete: "bg-[#3b4b3d] text-[#849585] border-[#3b4b3d]",
  };
  const label: Record<string, string> = { setup: "Setup", active: "Live", complete: "Complete" };
  const cls = map[status] ?? map["setup"];
  return (
    <Badge className={`text-xs border ${cls}`}>{label[status] ?? status}</Badge>
  );
}

function StatusPill({ status }: Readonly<{ status: string }>) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
  };
  return (
    <span className={`text-xs rounded px-2 py-0.5 ${map[status] ?? ""}`}>{status}</span>
  );
}

function TeamDot({ color }: Readonly<{ color: string }>) {
  return <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />;
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
      <span className="text-[#849585] w-24 shrink-0">{label}</span>
      <span className="text-[#d6e4f9] font-mono truncate flex-1 min-w-0">{fullUrl}</span>
      <Button
        onClick={copy}
        size="sm"
        className="h-6 px-2 text-xs bg-[#132030] border border-[#3b4b3d] text-[#849585] hover:bg-[#1e2b3b] shrink-0"
      >
        {copied ? "Copied!" : "Copy"}
      </Button>
    </div>
  );
}
