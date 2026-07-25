"use client";
/* eslint-disable @next/next/no-img-element -- dynamic crests with onError fallback, next/image incompatible */

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { EnrichedPlayer } from "@/lib/fpl-types";

interface League {
  id: string;
  name: string;
  budget_per_team: number;
  created_by: string | null;
  max_gkp: number | null;
  max_def: number | null;
  max_mid: number | null;
  max_fwd: number | null;
  squad_size: number | null;
}

interface ParticipantRow {
  id: string;
  name: string;
  color: string | null;
  league_id: string | null;
}

interface TeamFormation {
  id: string;
  participant_id: string;
  formation: string;
}

interface AuctionResultRow {
  id: string;
  participant_id: string | null;
  fpl_player_id: number;
  price_paid: number;
  position_slot: string | null;
  league_id: string | null;
}

interface SquadPlayer extends EnrichedPlayer {
  price_paid: number;
  position_slot: string;
  auction_result_id: string;
}

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-[#c05a00]",
  DEF: "bg-[#0058c0]",
  MID: "bg-[#6a00c0]",
  FWD: "bg-[#c00028]",
  BENCH: "bg-[#444]",
};

const POSITION_DOT: Record<string, string> = {
  GKP: "bg-[#c05a00]",
  DEF: "bg-[#0058c0]",
  MID: "bg-[#6a00c0]",
  FWD: "bg-[#c00028]",
  BENCH: "bg-[#444]",
};

const POSITION_LABELS: Record<string, string> = {
  GKP: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

const FORMATIONS = ["4-3-3", "4-4-2", "3-5-2", "5-3-2", "5-4-1"];

function getFormationSlots(formation: string) {
  const map: Record<string, { def: number; mid: number; fwd: number }> = {
    "4-3-3": { def: 4, mid: 3, fwd: 3 },
    "4-4-2": { def: 4, mid: 4, fwd: 2 },
    "3-5-2": { def: 3, mid: 5, fwd: 2 },
    "5-3-2": { def: 5, mid: 3, fwd: 2 },
    "5-4-1": { def: 5, mid: 4, fwd: 1 },
  };
  return { gkp: 1, ...(map[formation] ?? map["4-3-3"]!) };
}

export function TeamsClient({
  players,
}: Readonly<{ players: EnrichedPlayer[] }>) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [results, setResults] = useState<AuctionResultRow[]>([]);
  const [formationsMap, setFormationsMap] = useState<Record<string, string>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<SquadPlayer | null>(null);
  const lastSelectedPlayer = useRef(selectedPlayer);
  // eslint-disable-next-line react-hooks/refs -- intentional: keep previous player visible during dialog close animation
  if (selectedPlayer) lastSelectedPlayer.current = selectedPlayer;
  // eslint-disable-next-line react-hooks/refs -- intentional: keep previous player visible during dialog close animation
  const displayPlayer = selectedPlayer ?? lastSelectedPlayer.current;
  const [saving, setSaving] = useState(false);
  const [dialogImgLoaded, setDialogImgLoaded] = useState(false);
  const [dialogImgError, setDialogImgError] = useState(false);
  const [dialogCrestLoaded, setDialogCrestLoaded] = useState(false);
  const [dialogCrestError, setDialogCrestError] = useState(false);
  const [leaguesResolved, setLeaguesResolved] = useState(false);
  const [userParticipantIds, setUserParticipantIds] = useState<string[]>([]);
  const [userLeagueIds, setUserLeagueIds] = useState<string[]>([]);

  /* eslint-disable react-hooks/set-state-in-effect -- intentional: reset derived image state when switching players */
  useEffect(() => {
    setDialogImgLoaded(false);
    setDialogImgError(false);
    setDialogCrestLoaded(false);
    setDialogCrestError(false);
  }, [selectedPlayer]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLeaguesResolved(true);
        return;
      }
      Promise.all([
        supabase.from("leagues").select("*"),
        supabase.from("team_members").select("league_id, participant_id").eq("user_id", user.id),
      ]).then(([leaguesResult, memberResult]) => {
        const lgs = leaguesResult.data ?? [];
        const members = memberResult.data ?? [];
        const memberLeagueIds = new Set(members.map((m: { league_id: string }) => m.league_id).filter(Boolean)) as Set<string>;
        const createdLeagueIds = new Set(lgs.filter((l: { created_by: string | null }) => l.created_by === user.id).map((l: { id: string }) => l.id));
        const allUserLeagues = [...new Set([...memberLeagueIds, ...createdLeagueIds])] as string[];
        const userPids = members.map((m: { participant_id: string }) => m.participant_id).filter(Boolean) as string[];
        setUserLeagueIds(allUserLeagues);
        setUserParticipantIds(userPids);
        setLeagues(lgs);
        const defaultLeague = allUserLeagues.length > 0
          ? lgs.find((l: { id: string }) => allUserLeagues.includes(l.id))?.id
          : lgs[0]?.id;
        setSelectedLeague(defaultLeague ?? null);
        setLeaguesResolved(true);
      }).catch(() => setLeaguesResolved(true));
    }).catch(() => setLeaguesResolved(true));
  }, [supabase]);

  const loadedLeagueRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedLeague) return;
    const isNewLeague = loadedLeagueRef.current !== selectedLeague;
    loadedLeagueRef.current = selectedLeague;
    supabase
      .from("participants")
      .select("*")
      .eq("league_id", selectedLeague)
      .then(async ({ data: ps }) => {
        const ids = (ps ?? []).map((p: ParticipantRow) => p.id);
        const [fs, rs] = await Promise.all([
          ids.length > 0
            ? supabase.from("team_formations").select("*").in("participant_id", ids)
            : { data: [] as TeamFormation[] },
          supabase.from("auction_results").select("*").eq("league_id", selectedLeague),
        ]);
        setParticipants(ps ?? []);
        setResults(rs.data ?? []);
        const fm: Record<string, string> = {};
        for (const f of (fs.data ?? [])) {
          if (f.participant_id) { fm[f.participant_id] = f.formation ?? "4-3-3"; }
        }
        setFormationsMap(fm);
        if (isNewLeague) {
          const myPid = (ps ?? []).find((p: ParticipantRow) => userParticipantIds.includes(p.id))?.id;
          if (myPid) {
            setSelectedParticipant(myPid);
          } else if ((ps ?? []).length > 0) {
            setSelectedParticipant(ps![0]!.id);
          }
        }
      });
  }, [selectedLeague, supabase, userParticipantIds]);

  const currentLeague = leagues.find((l) => l.id === selectedLeague);
  const currentFormation = selectedParticipant
    ? (formationsMap[selectedParticipant] ?? "4-3-3")
    : "4-3-3";

  const squad = useMemo<SquadPlayer[]>(() => {
    if (!selectedParticipant) return [];
    return results
      .filter((r) => r.participant_id === selectedParticipant)
      .flatMap((r) => {
        const p = players.find((pl) => pl.id === r.fpl_player_id);
        if (!p) return [];
        return [{
          ...p,
          price_paid: r.price_paid,
          position_slot: r.position_slot ?? "BENCH",
          auction_result_id: r.id,
        }];
      });
  }, [results, selectedParticipant, players]);

  const sortedSquad = useMemo(() => {
    const order = ["GKP", "DEF", "MID", "FWD", "BENCH"];
    return [...squad].sort(
      (a, b) => order.indexOf(a.position_slot) - order.indexOf(b.position_slot),
    );
  }, [squad]);

  const { starters, bench } = useMemo(() => {
    const slots = getFormationSlots(currentFormation);
    const gkp = squad.filter((p) => p.position_slot === "GKP");
    const def = squad.filter((p) => p.position_slot === "DEF");
    const mid = squad.filter((p) => p.position_slot === "MID");
    const fwd = squad.filter((p) => p.position_slot === "FWD");
    const explicitBench = squad.filter((p) => p.position_slot === "BENCH");
    return {
      starters: {
        gkp: { players: gkp.slice(0, 1), max: 1 },
        def: { players: def.slice(0, slots.def), max: slots.def },
        mid: { players: mid.slice(0, slots.mid), max: slots.mid },
        fwd: { players: fwd.slice(0, slots.fwd), max: slots.fwd },
      },
      bench: [
        ...gkp.slice(1),
        ...def.slice(slots.def),
        ...mid.slice(slots.mid),
        ...fwd.slice(slots.fwd),
        ...explicitBench,
      ],
    };
  }, [squad, currentFormation]);

  const totalSpent = useMemo(
    () => squad.reduce((s, p) => s + p.price_paid, 0),
    [squad],
  );

  const canEditFormation = selectedParticipant ? userParticipantIds.includes(selectedParticipant) : false;

  const budget = currentLeague?.budget_per_team ?? 200;
  const remaining = budget - totalSpent;
  const budgetPct = (totalSpent / budget) * 100;
  const budgetBarColor =
    remaining > budget * 0.5
      ? "bg-[#00d166]"
      : remaining > budget * 0.25
        ? "bg-amber-500"
        : "bg-red-500";

  const maxPositions = {
    GKP: currentLeague?.max_gkp ?? 2,
    DEF: currentLeague?.max_def ?? 5,
    MID: currentLeague?.max_mid ?? 5,
    FWD: currentLeague?.max_fwd ?? 3,
  };

  const posCounts = {
    GKP: squad.filter((p) => p.position_slot === "GKP").length,
    DEF: squad.filter((p) => p.position_slot === "DEF").length,
    MID: squad.filter((p) => p.position_slot === "MID").length,
    FWD: squad.filter((p) => p.position_slot === "FWD").length,
  };

  const handleFormationChange = useCallback(async (newFormation: string) => {
    if (!selectedParticipant) return;
    setFormationsMap((prev) => ({ ...prev, [selectedParticipant]: newFormation }));
    const { error } = await supabase.from("team_formations").upsert(
      { participant_id: selectedParticipant, formation: newFormation },
      { onConflict: "participant_id" },
    );
    if (error) {
      setFormationsMap((prev) => ({ ...prev, [selectedParticipant]: currentFormation }));
    }
  }, [selectedParticipant, currentFormation, supabase]);

  const handleMoveToBench = useCallback(async (player: SquadPlayer) => {
    setSaving(true);
    const { error } = await supabase
      .from("auction_results")
      .update({ position_slot: "BENCH" })
      .eq("id", player.auction_result_id);
    if (!error) {
      setResults((prev) =>
        prev.map((r) =>
          r.id === player.auction_result_id ? { ...r, position_slot: "BENCH" } : r,
        ),
      );
      setSelectedPlayer(null);
    }
    setSaving(false);
  }, [supabase]);

  const handlePromoteToXI = useCallback(async (player: SquadPlayer) => {
    if (!selectedParticipant) return;
    setSaving(true);
    const position = player.position;
    if (!["GKP", "DEF", "MID", "FWD"].includes(position)) return;
    const slots = getFormationSlots(currentFormation);
    const maxSlots = position === "GKP" ? 1 : slots[position.toLowerCase() as keyof typeof slots] ?? 0;
    const positionStarters = squad.filter(
      (p) => p.position_slot === position && p.auction_result_id !== player.auction_result_id,
    );
    if (positionStarters.length < maxSlots) {
      const { error } = await supabase
        .from("auction_results")
        .update({ position_slot: position })
        .eq("id", player.auction_result_id);
      if (!error) {
        setResults((prev) =>
          prev.map((r) =>
            r.id === player.auction_result_id ? { ...r, position_slot: position } : r,
          ),
        );
        setSelectedPlayer(null);
      }
    } else {
      const sorted = [...positionStarters].sort((a, b) => a.total_points - b.total_points);
      const toBench = sorted[0];
      if (!toBench) return;
      const [r1, r2] = await Promise.all([
        supabase.from("auction_results").update({ position_slot: "BENCH" }).eq("id", toBench.auction_result_id),
        supabase.from("auction_results").update({ position_slot: position }).eq("id", player.auction_result_id),
      ]);
      if (!r1.error && !r2.error) {
        setResults((prev) =>
          prev.map((r) => {
            if (r.id === toBench.auction_result_id) return { ...r, position_slot: "BENCH" };
            if (r.id === player.auction_result_id) return { ...r, position_slot: position };
            return r;
          }),
        );
        setSelectedPlayer(null);
      }
    }
    setSaving(false);
  }, [selectedParticipant, squad, currentFormation, supabase]);

  const selectedLeagueName = useMemo(
    () => leagues.find((l) => l.id === selectedLeague)?.name ?? "Select League",
    [leagues, selectedLeague],
  );

  const loading = !leaguesResolved;

  if (loading) {
    const slotCounts = { gkp: 1, def: 4, mid: 3, fwd: 3 };
    const positions = ["gkp", "def", "mid", "fwd"] as const;
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 animate-pulse">
        <div className="mb-4 sm:mb-5 flex flex-wrap items-center gap-3">
          <div className="h-8 bg-[#1e2b3b] rounded w-40" />
          <div className="h-8 bg-[#1e2b3b] rounded w-24" />
          <div className="h-8 bg-[#1e2b3b] rounded w-48 ml-auto" />
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-[#1e2b3b] rounded-full w-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] border border-border rounded-xl overflow-hidden">
          <div>
            <div className="bg-[#1a5c35]">
              <div className="p-6 pb-4 min-h-[520px]">
                <div className="flex flex-col items-center gap-1">
                  {positions.map((pos) => (
                    <div key={pos} className="w-full flex flex-col items-center">
                      <div className="text-[10px] text-white/20 tracking-widest text-center mb-1 uppercase">{pos.toUpperCase()}</div>
                      <div className="flex justify-center gap-3">
                        {Array.from({ length: slotCounts[pos] }).map((_, i) => (
                          <EmptySlot key={i} />
                        ))}
                      </div>
                      {pos !== "fwd" && <div className="w-full my-2 border-t border-white/5" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-[#163d24] border-t border-white/10 py-3 min-h-[120px]">
              <div className="text-[10px] text-white/35 tracking-widest text-center mb-2 uppercase">Bench</div>
              <div className="flex justify-center gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <EmptySlot key={i} />
                ))}
              </div>
            </div>
          </div>
          <div className="border-l border-border flex flex-col bg-[#0f1c2c]">
            <div className="px-4 py-3 border-b border-border/50">
              <div className="h-4 bg-[#1e2b3b] rounded w-24 mb-1" />
              <div className="h-3 bg-[#1e2b3b] rounded w-32" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {["GKP", "DEF", "MID", "FWD"].map((pos, i) => (
                <div key={pos}>
                  <div className="h-3 bg-[#1e2b3b] rounded w-12 mb-2" />
                  {Array.from({ length: [2, 4, 4, 3][i]! }).map((_, j) => (
                    <div key={j} className="h-10 bg-[#1e2b3b] rounded w-full mb-1.5" />
                  ))}
                </div>
              ))}
              <div>
                <div className="h-3 bg-[#1e2b3b] rounded w-12 mb-2" />
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="h-10 bg-[#1e2b3b] rounded w-full mb-1.5" />
                ))}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border/50 space-y-2">
              <div className="h-3 bg-[#1e2b3b] rounded w-full" />
              <div className="h-1.5 bg-[#1e2b3b] rounded-full w-full" />
              <div className="flex gap-1.5 pt-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-5 bg-[#1e2b3b] rounded-full w-16" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (leaguesResolved && leagues.filter((l) => userLeagueIds.includes(l.id)).length === 0) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-12">
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-[#849585]">
          <p>You are not participating in any leagues yet.</p>
        </div>
      </div>
    );
  }

  const isStarting = selectedPlayer
    ? selectedPlayer.position_slot !== "BENCH"
    : false;

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6">
      {/* ─── Toolbar ─────────────────────────────── */}
      <div className="mb-4 sm:mb-5 flex flex-wrap items-center gap-3">
        <Select
          value={selectedLeague ?? ""}
          onValueChange={(v) => v && setSelectedLeague(v)}
        >
          <SelectTrigger className="bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] h-8 text-xs w-auto min-w-[160px]">
            <span className="text-xs text-[#d6e4f9]">{selectedLeagueName}</span>
          </SelectTrigger>
          <SelectContent className="bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9]">
            <SelectGroup>
              {leagues.filter((l) => userLeagueIds.includes(l.id)).map((l) => (
                <SelectItem key={l.id} value={l.id} className="text-xs">
                  {l.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {canEditFormation ? (
          <Select
            value={currentFormation}
            onValueChange={(v) => v && handleFormationChange(v)}
          >
            <SelectTrigger className="bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] h-8 text-xs w-auto min-w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9]">
              <SelectGroup>
                {FORMATIONS.map((f) => (
                  <SelectItem key={f} value={f} className="text-xs">
                    {f}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : (
          <div className="bg-[#132030] border border-[#3b4b3d] text-[#6b7b6b] h-8 text-xs w-auto min-w-[100px] rounded px-3 py-1.5 flex items-center select-none cursor-not-allowed">
            {currentFormation}
          </div>
        )}

        {currentLeague && (
          <div className="text-xs text-[#849585] ml-auto">
            Spent{" "}
            <span className="font-mono text-[#00d166]">
              £{totalSpent.toFixed(1)}m
            </span>
            {" / "}
            <span className="text-[#d6e4f9]">£{budget}m</span>
            {" · "}
            <span className="font-mono text-[#00d166]">
              £{remaining.toFixed(1)}m
            </span>{" "}
            left
          </div>
        )}
      </div>

      {/* ─── Team Tabs ───────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 mb-4 min-h-[32px]">
        {participants.length > 0 && participants.map((p) => {
            const isActive = selectedParticipant === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedParticipant(p.id);
                  setSelectedPlayer(null);
                }}
                className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#1a4731] text-[#00ff87]"
                    : "bg-[#132030] text-[#b9cbb9] hover:bg-[#1e2b3b]"
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>



      {/* ─── Main content: 2-column grid ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] border border-border rounded-xl overflow-hidden">
        {/* ─── Left: Pitch + Bench ──────────────────── */}
        <div>
          <div className="bg-[#1a5c35] bg-[repeating-linear-gradient(0deg,transparent,transparent_50px,rgba(255,255,255,0.02)_50px,rgba(255,255,255,0.02)_100px)]">
            <div className="p-6 pb-4 min-h-[520px]">
              <div className="flex flex-col items-center gap-1">
                {(["gkp", "def", "mid", "fwd"] as const).map((pos) => {
                  const slotInfo = starters[pos];
                  const posKey = pos.toUpperCase();
                  const slots = slotInfo.max;
                  return (
                    <div
                      key={pos}
                      className="w-full flex flex-col items-center"
                    >
                      <div className="text-[10px] text-white/20 tracking-widest text-center mb-1 uppercase">
                        {posKey}
                      </div>
                      <div className="flex justify-center gap-3">
                        {Array.from({ length: slots }).map((_, i) => {
                          const player = slotInfo.players[i] ?? null;
                          return player ? (
                            <PitchPlayerCard
                              key={player.auction_result_id}
                              player={player}
                              position={posKey}
                              onSelect={setSelectedPlayer}
                            />
                          ) : (
                            <EmptySlot key={`empty-${pos}-${i}`} />
                          );
                        })}
                      </div>
                      {pos !== "fwd" && (
                        <div className="w-full my-2 border-t border-white/5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bench strip */}
          <div className="bg-[#163d24] border-t border-white/10 py-3 min-h-[120px]">
            <div className="text-[10px] text-white/35 tracking-widest text-center mb-2 uppercase">
              Bench
            </div>
            <div className="flex justify-center gap-4">
              {bench.length > 0
                ? bench.map((p) => (
                    <PitchPlayerCard
                      key={p.auction_result_id}
                      player={p}
                      position="BENCH"
                      onSelect={setSelectedPlayer}
                    />
                  ))
                : Array.from({ length: 4 }).map((_, i) => (
                    <EmptySlot key={`empty-bench-${i}`} />
                  ))}
            </div>
          </div>
        </div>

        {/* ─── Right: Squad Sidebar ────────────────── */}
        <div className="border-l border-border flex flex-col bg-[#0f1c2c]">
          <div className="px-4 py-3 border-b border-border/50">
            <div className="text-sm font-semibold text-[#d6e4f9]">
              {participants.find((p) => p.id === selectedParticipant)?.name ??
                "Squad"}
            </div>
            <div className="text-[11px] text-[#849585]">
              {squad.length} players ·{" "}
              {currentLeague
                ? Math.max(0, (currentLeague.squad_size ?? 15) - squad.length)
                : 0}{" "}
              empty slots
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {(["GKP", "DEF", "MID", "FWD", "BENCH"] as const).map((pos) => {
              const posPlayers = sortedSquad.filter(
                (p) => p.position_slot === pos,
              );
              if (posPlayers.length === 0) return null;
              return (
                <div key={pos}>
                  <div className="text-[10px] font-medium text-[#849585] tracking-[0.8px] uppercase px-4 pt-3 pb-1">
                    {pos} ({posPlayers.length})
                  </div>
                  {posPlayers.map((p) => (
                    <div
                      key={p.auction_result_id}
                      className="flex items-center gap-2 px-4 py-1.5 border-b border-border/50 last:border-0 cursor-pointer hover:bg-[#132030] transition-colors"
                      onClick={() => setSelectedPlayer(p)}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${POSITION_DOT[p.position_slot] ?? POSITION_DOT.BENCH}`}
                      />
                      <span className="text-[12px] text-[#d6e4f9] flex-1 truncate">
                        {p.web_name}
                      </span>
                      <span className="text-[11px] text-[#849585]">
                        {p.total_points}
                      </span>
                      <span className="text-[11px] text-[#00d166] min-w-[36px] text-right font-mono">
                        £{p.price_paid.toFixed(1)}m
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
            {squad.length === 0 && (
              <div className="p-4 text-xs text-[#849585] text-center">
                No players yet
              </div>
            )}
          </div>

          {/* Budget bar */}
          <div className="px-4 py-3 border-t border-border/50 mt-auto space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#849585]">Budget spent</span>
              <span className="font-mono text-[#d6e4f9]">
                £{totalSpent.toFixed(1)}m / £{budget}m
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#1e2b3b] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${budgetBarColor}`}
                style={{ width: `${Math.min(budgetPct, 100)}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {(["GKP", "DEF", "MID", "FWD"] as const).map((pos) => {
                const count = posCounts[pos];
                const max = maxPositions[pos];
                const remainingSlots = max - count;
                return (
                  <span
                    key={pos}
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                      remainingSlots > 0
                        ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                        : "border-[#3b4b3d] text-[#849585]"
                    }`}
                  >
                    {pos} {count}/{max}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Player detail modal ──────────────────── */}
      <Dialog
        open={!!selectedPlayer}
        onOpenChange={(o) => !o && setSelectedPlayer(null)}
      >
        <DialogContent className="bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9] w-[calc(100%-2rem)] max-w-3xl mx-auto">
          {displayPlayer && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-10 sm:h-14 sm:w-12 shrink-0">
                    {!dialogImgLoaded && !dialogImgError && (
                      <div className="absolute inset-0 rounded bg-[#0a1724] animate-pulse" />
                    )}
                    {dialogImgError ? (
                      <img
                        src="/player-fallback.png"
                        alt={displayPlayer.web_name}
                        className="h-full w-full rounded object-cover bg-[#132030]"
                      />
                    ) : (
                      <img
                        src={displayPlayer.image_url}
                        alt={displayPlayer.web_name}
                        className={`h-full w-full rounded object-cover bg-[#132030] ${dialogImgLoaded ? "" : "opacity-0 absolute inset-0"}`}
                        loading="lazy"
                        onLoad={() => {
                          setDialogImgLoaded(true);
                          setDialogImgError(false);
                        }}
                        onError={() => {
                          setDialogImgLoaded(false);
                          setDialogImgError(true);
                        }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-lg sm:text-xl font-bold truncate">
                      {displayPlayer.web_name}
                    </DialogTitle>
                    <p className="text-xs sm:text-sm text-[#b9cbb9]">
                      {POSITION_LABELS[displayPlayer.position] ??
                        displayPlayer.position}
                      {" · "}
                      {displayPlayer.team_name}
                      {" · "}
                      <span className="text-[#00d166]">
                        £{displayPlayer.price_paid.toFixed(1)}m
                      </span>
                    </p>
                  </div>
                  {displayPlayer.team_crest_url &&
                    (dialogCrestError ? (
                      <div className="h-6 w-6 sm:h-8 sm:w-8 rounded bg-[#1e3248] flex items-center justify-center mr-4 sm:mr-8 shrink-0">
                        <span className="text-[10px] sm:text-xs font-bold text-[#5e7d99]">
                          {displayPlayer.team_short?.charAt(0) ?? "?"}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={displayPlayer.team_crest_url}
                        alt={displayPlayer.team_name}
                        className={`h-6 w-6 sm:h-8 sm:w-8 object-contain mr-4 sm:mr-8 shrink-0 ${dialogCrestLoaded ? "" : "opacity-0 absolute"}`}
                        loading="lazy"
                        onLoad={() => {
                          setDialogCrestLoaded(true);
                          setDialogCrestError(false);
                        }}
                        onError={() => {
                          setDialogCrestLoaded(true);
                          setDialogCrestError(true);
                        }}
                      />
                    ))}
                  {!dialogCrestLoaded &&
                    !dialogCrestError &&
                    displayPlayer.team_crest_url && (
                      <div className="h-6 w-6 sm:h-8 sm:w-8 rounded bg-[#0a1724] animate-pulse mr-4 sm:mr-8 shrink-0" />
                    )}
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-4">
                <Stat
                  label="Price"
                  value={`£${displayPlayer.price_paid.toFixed(1)}m`}
                />
                <Stat
                  label="Total Points"
                  value={displayPlayer.total_points}
                />
                <Stat label="PPG" value={displayPlayer.points_per_game} />
                <Stat label="Form" value={displayPlayer.form} highlight />
                <Stat label="ICT Index" value={displayPlayer.ict_index} />
                <Stat
                  label="xGI"
                  value={parseFloat(
                    displayPlayer.expected_goal_involvements,
                  ).toFixed(2)}
                />
                <Stat label="Goals" value={displayPlayer.goals_scored} />
                <Stat label="Assists" value={displayPlayer.assists} />
                <Stat
                  label="Clean Sheets"
                  value={displayPlayer.clean_sheets}
                />
                <Stat label="Minutes" value={displayPlayer.minutes} />
                <Stat label="Bonus" value={displayPlayer.bonus} />
                <Stat label="Starts" value={displayPlayer.starts} />
                <Stat
                  label="Influence"
                  value={parseFloat(displayPlayer.influence).toFixed(1)}
                />
                <Stat
                  label="Creativity"
                  value={parseFloat(displayPlayer.creativity).toFixed(1)}
                />
                <Stat
                  label="Threat"
                  value={parseFloat(displayPlayer.threat).toFixed(1)}
                />
                <Stat
                  label="xG"
                  value={parseFloat(displayPlayer.expected_goals).toFixed(2)}
                />
                <Stat
                  label="xA"
                  value={parseFloat(displayPlayer.expected_assists).toFixed(2)}
                />
                <Stat
                  label="xGC"
                  value={parseFloat(
                    displayPlayer.expected_goals_conceded,
                  ).toFixed(2)}
                />
                <Stat label="BPS" value={displayPlayer.bps} />
                <Stat label="Avg FDR ×5" value={displayPlayer.avg_fdr_next5} />
              </div>

              {displayPlayer.news && (
                <p className="text-xs text-orange-400 bg-orange-950/30 rounded p-2 mb-2">
                  {displayPlayer.news}
                </p>
              )}

              {/* Swap actions */}
              <div className="border-t border-[#3b4b3d] pt-3">
                {isStarting ? (
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={() => handleMoveToBench(displayPlayer)}
                    className="h-8 text-xs bg-[#444] text-white hover:bg-[#555]"
                  >
                    Send to Bench
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={() => handlePromoteToXI(displayPlayer)}
                    className="h-8 text-xs bg-[#1a4731] text-[#00ff87] hover:bg-[#1e5c3a]"
                  >
                    Promote to Starting XI
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function PitchPlayerCard({
  player,
  position,
  onSelect,
}: Readonly<{
  player: SquadPlayer;
  position: string;
  onSelect: (p: SquadPlayer) => void;
}>) {
  const name = player.web_name;
  const initial = name.charAt(0).toUpperCase();
  const colorClass = POSITION_COLORS[position] ?? POSITION_COLORS.BENCH;
  const isGkp = player.position === "GKP";
  const shirtUrl = isGkp
    ? `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${player.team_code}_1-66.webp`
    : `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${player.team_code}-110.webp`;
  const [imgError, setImgError] = useState(false);

  return (
    <button
      className="flex flex-col items-center gap-0.5 group"
      onClick={() => onSelect(player)}
    >
      {imgError ? (
        <div
          className={`w-12 h-14 rounded-md flex items-center justify-center text-lg font-medium text-white shadow-md transition-transform group-hover:scale-105 ${colorClass}`}
        >
          {initial}
        </div>
      ) : (
        <div className="w-12 h-14 rounded-md flex items-center justify-center bg-black/30 shadow-md transition-transform group-hover:scale-105">
          <img
            src={shirtUrl}
            alt={name}
            className="w-10 h-12 object-contain"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        </div>
      )}
      <div className="bg-black/55 rounded px-1.5 py-0.5 text-center max-w-[80px]">
        <div className="text-[11px] text-white font-medium truncate leading-tight">
          {name}
        </div>
        <div className="text-[10px] text-[#00d166] font-mono">
          £{player.price_paid.toFixed(1)}m
        </div>
      </div>
    </button>
  );
}

function EmptySlot() {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-12 h-14 rounded-md border-2 border-dashed border-white/15 opacity-40" />
      <div className="bg-black/55 rounded px-1.5 py-0.5 text-center min-w-[60px]">
        <div className="h-[15px] bg-white/10 rounded w-10 mx-auto mb-0.5" />
        <div className="h-[13px] bg-white/10 rounded w-8 mx-auto" />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: Readonly<{ label: string; value: string | number; highlight?: boolean }>) {
  return (
    <div className="bg-[#132030] rounded p-2 sm:p-3">
      <div className="text-[9px] sm:text-[10px] text-[#849585] uppercase tracking-wider mb-0.5 sm:mb-1">
        {label}
      </div>
      <div
        className={`font-mono font-semibold text-sm sm:text-lg ${highlight ? "text-[#00e478]" : "text-[#d6e4f9]"}`}
      >
        {value}
      </div>
    </div>
  );
}
