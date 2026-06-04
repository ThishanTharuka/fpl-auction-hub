"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

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
  setup: { label: "Setup", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  active: { label: "Live", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
  complete: { label: "Complete", cls: "bg-[#3b4b3d] text-[#849585] border-[#3b4b3d]" },
};

export default function AuctionBrowsePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [pendingLeague, setPendingLeague] = useState<LeagueRow | null>(null);
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
    setLoading(false);
  }

  /* eslint-disable react-hooks/set-state-in-effect -- intentional: loadLeagues calls setState; this is a standard mount-and-fetch pattern */
  useEffect(() => {
    loadLeagues().catch(() => {});
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

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
  }

  function submitPassword() {
    if (!pendingLeague) return;
    if (passwordInput.trim() === pendingLeague.room_password) {
      router.push(`/auction/${pendingLeague.id}`);
      setPendingLeague(null);
    } else {
      setPasswordError("Incorrect password. Try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#d6e4f9]">Auctions</h1>
          <p className="text-sm text-[#849585] mt-1">Browse and join auction rooms.</p>
        </div>
        <Link href="/auction/setup">
          <Button className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-semibold">
            + New Auction
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] px-5 py-4 animate-pulse"
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-48 rounded bg-[#1e2b3b]" />
                  <div className="h-5 w-14 rounded-full bg-[#1e2b3b]" />
                </div>
                <div className="h-3 w-24 rounded bg-[#1e2b3b]" />
              </div>
              <div className="h-8 w-16 rounded bg-[#1e2b3b] shrink-0 ml-4" />
            </div>
          ))}
        </div>
      )}

      {!loading && leagues.length === 0 && (
        <div className="text-center py-16 text-[#849585]">
          <p className="text-lg mb-2">No auctions yet.</p>
          <p className="text-sm">
            <Link href="/auction/setup" className="text-[#00e478] hover:underline">
              Create the first one
            </Link>
          </p>
        </div>
      )}

      <div className="space-y-3">
        {leagues.map((league) => {
          const statusInfo = STATUS_LABELS[league.status ?? "setup"] ?? { label: "Setup", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
          const isOwner = user?.id === league.created_by;
          return (
            <div
              key={league.id}
              className="flex items-center justify-between rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] px-5 py-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-semibold text-[#d6e4f9] truncate">
                    {league.name}
                  </span>
                  <Badge className={`text-xs border ${statusInfo.cls}`}>
                    {statusInfo.label}
                  </Badge>
                  {isOwner && (
                    <Badge className="text-xs border bg-purple-500/20 text-purple-400 border-purple-500/30">
                      Your auction
                    </Badge>
                  )}
                  {league.room_password && !isOwner && (
                    <Badge className="text-xs border bg-[#1e2b3b] text-[#849585] border-[#3b4b3d]">
                      🔒 Password
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[#849585]">
                  {league.participant_count} team{league.participant_count === 1 ? "" : "s"}
                </p>
              </div>

              <Button
                onClick={() => handleEnter(league)}
                size="sm"
                className="shrink-0 ml-4 bg-[#132030] border border-[#3b4b3d] text-[#d6e4f9] hover:bg-[#1e2b3b]"
              >
                {isOwner ? "Manage" : "Enter"}
              </Button>
            </div>
          );
        })}
      </div>

      {pendingLeague && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1c2c] border border-[#3b4b3d] rounded-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold text-[#d6e4f9]">Room Password</h2>
            <p className="text-sm text-[#849585]">
              <span className="text-[#d6e4f9]">{pendingLeague.name}</span> requires a password to join.
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
              className="bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] placeholder:text-[#849585]"
            />
            {passwordError && (
              <p className="text-xs text-red-400">{passwordError}</p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => setPendingLeague(null)}
                variant="outline"
                className="flex-1 border-[#3b4b3d] text-[#849585] hover:bg-[#132030]"
              >
                Cancel
              </Button>
              <Button
                onClick={submitPassword}
                disabled={!passwordInput.trim()}
                className="flex-1 bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-semibold"
              >
                Enter
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
