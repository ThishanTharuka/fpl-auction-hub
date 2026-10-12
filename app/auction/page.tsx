"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { Lock } from "lucide-react";

const supabase = createSupabaseBrowserClient();

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
  complete: { label: "Complete", cls: "bg-muted text-muted-foreground border-border" },
};

export default function AuctionBrowsePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberLeagueIds, setMemberLeagueIds] = useState<Set<string>>(new Set());

  const [pendingLeague, setPendingLeague] = useState<LeagueRow | null>(null);
  const [pendingAction, setPendingAction] = useState<"enter" | "spectate">(
    "enter",
  );
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadLeagues() {
    setLoading(true);
    const { data, error } = await supabase
      .from("leagues")
      .select("id, name, status, room_password, created_by, created_at")
      .order("created_at", { ascending: false });
    if (error || !data) {
      setLoading(false);
      return;
    }

    const { data: partCounts } = await supabase
      .from("participants")
      .select("league_id");

    const countMap: Record<string, number> = {};
    for (const p of partCounts ?? []) {
      if (!p.league_id) continue;
      countMap[p.league_id] = (countMap[p.league_id] ?? 0) + 1;
    }

    setLeagues(
      data.map((l) => ({
        ...l,
        participant_count: countMap[l.id] ?? 0,
      })),
    );

    if (user) {
      const { data: myMembers } = await supabase
        .from("team_members")
        .select("league_id")
        .eq("user_id", user.id);
      setMemberLeagueIds(
        new Set((myMembers ?? []).map((m) => m.league_id).filter(Boolean)),
      );
    }

    setLoading(false);
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- intentional: loadLeagues calls setState; re-run when user changes */
  useEffect(() => {
    loadLeagues().catch(() => {});
  }, [user]);
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
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auctions</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse and join auction rooms.</p>
        </div>
        <Link href="/auction/setup">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cursor-pointer">
            + New Auction
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4 animate-pulse"
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-48 rounded bg-muted" />
                  <div className="h-5 w-14 rounded-full bg-muted" />
                </div>
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
              <div className="h-8 w-16 rounded bg-muted shrink-0 ml-4" />
            </div>
          ))}
        </div>
      )}

      {!loading && leagues.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">No auctions yet.</p>
          <p className="text-sm">
            <Link href="/auction/setup" className="text-primary hover:underline font-medium">
              Create the first one
            </Link>
          </p>
        </div>
      )}

      <div className="space-y-3">
        {leagues.map((league) => {
          const statusInfo = STATUS_LABELS[league.status ?? "setup"] ?? { label: "Setup", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" };
          const isOwner = user?.id === league.created_by;
          return (
            <div
              key={league.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4 shadow-sm"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-semibold text-foreground truncate">
                    {league.name}
                  </span>
                  <Badge className={`text-xs border ${statusInfo.cls}`}>
                    {statusInfo.label}
                  </Badge>
                  {isOwner && (
                    <Badge className="text-xs border bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30">
                      Your auction
                    </Badge>
                  )}
                  {league.room_password && !isOwner && (
                    <Badge className="text-xs border bg-muted text-muted-foreground border-border inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Password
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {league.participant_count} team{league.participant_count === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-4">
                {league.status === "active" && !isOwner && !memberLeagueIds.has(league.id) && (
                  <Button
                    onClick={() => handleSpectate(league)}
                    size="sm"
                    variant="outline"
                    className="border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    Spectate
                  </Button>
                )}
                <Button
                  onClick={() => handleEnter(league)}
                  size="sm"
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted font-medium cursor-pointer"
                >
                  {isOwner ? "Manage" : "Enter"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {pendingLeague && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Room Password</h2>
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{pendingLeague.name}</span>{" "}
              {pendingAction === "spectate"
                ? "requires a password to watch."
                : "requires a password to join."}
            </p>
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
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
            {passwordError && (
              <p className="text-xs text-destructive">{passwordError}</p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => setPendingLeague(null)}
                variant="outline"
                className="flex-1 border-border text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={submitPassword}
                disabled={!passwordInput.trim()}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cursor-pointer"
              >
                {pendingAction === "spectate" ? "Watch" : "Enter"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
