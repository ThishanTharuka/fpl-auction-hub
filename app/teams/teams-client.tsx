"use client";
/* eslint-disable @next/next/no-img-element -- dynamic crests with onError fallback, next/image incompatible */

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
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
  fpl_manager_id: number | null;
}

interface FPLPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
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
  is_bench: boolean;
  league_id: string | null;
}

interface SquadPlayer extends EnrichedPlayer {
  price_paid: number;
  position_slot: string;
  is_bench: boolean;
  auction_result_id: string;
}

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-amber-600",
  DEF: "bg-sky-600",
  MID: "bg-emerald-600",
  FWD: "bg-rose-600",
  BENCH: "bg-slate-600",
};

const POSITION_DOT: Record<string, string> = {
  GKP: "bg-amber-500",
  DEF: "bg-sky-500",
  MID: "bg-emerald-500",
  FWD: "bg-rose-500",
  BENCH: "bg-slate-500",
};

const POSITION_LABELS: Record<string, string> = {
  GKP: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

const FORMATIONS = ["4-3-3", "3-4-3", "4-4-2", "3-5-2", "4-5-1", "5-3-2", "5-4-1"];

function getFormationSlots(formation: string) {
  const map: Record<string, { def: number; mid: number; fwd: number }> = {
    "4-3-3": { def: 4, mid: 3, fwd: 3 },
    "3-4-3": { def: 3, mid: 4, fwd: 3 },
    "4-4-2": { def: 4, mid: 4, fwd: 2 },
    "3-5-2": { def: 3, mid: 5, fwd: 2 },
    "4-5-1": { def: 4, mid: 5, fwd: 1 },
    "5-3-2": { def: 5, mid: 3, fwd: 2 },
    "5-4-1": { def: 5, mid: 4, fwd: 1 },
  };
  return { gkp: 1, ...(map[formation] ?? map["4-3-3"]!) };
}

export function TeamsClient({
  players,
  currentGameweek,
}: Readonly<{ players: EnrichedPlayer[]; currentGameweek: number }>) {
  const shouldReduce = useReducedMotion();
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
  const [fplTeamOpen, setFplTeamOpen] = useState(false);
  const [fplTeamPicks, setFplTeamPicks] = useState<FPLPick[] | null>(null);
  const [fplTeamLoading, setFplTeamLoading] = useState(false);
  const [fplTeamError, setFplTeamError] = useState<string | null>(null);
  const [fplTeamManager, setFplTeamManager] = useState<string | null>(null);

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
        supabase.from("leagues").select("id,name,budget_per_team,created_by,max_gkp,max_def,max_mid,max_fwd,squad_size"),
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
      .select("id,name,color,league_id,fpl_manager_id")
      .eq("league_id", selectedLeague)
      .then(async ({ data: ps }) => {
        const ids = (ps ?? []).map((p: ParticipantRow) => p.id);
        const [fs, rs] = await Promise.all([
          ids.length > 0
            ? supabase.from("team_formations").select("participant_id,formation").in("participant_id", ids)
            : { data: [] as TeamFormation[] },
          supabase.from("auction_results").select("id,participant_id,fpl_player_id,price_paid,position_slot,is_bench,league_id").eq("league_id", selectedLeague),
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
          position_slot: r.position_slot ?? p.position ?? "?",
          is_bench: r.is_bench ?? false,
          auction_result_id: r.id,
        }];
      });
  }, [results, selectedParticipant, players]);

  const sortedSquad = useMemo(() => {
    const order = ["GKP", "DEF", "MID", "FWD", "BENCH"];
    return [...squad].sort((a, b) => {
      const ak = a.is_bench ? "BENCH" : a.position_slot;
      const bk = b.is_bench ? "BENCH" : b.position_slot;
      return order.indexOf(ak) - order.indexOf(bk);
    });
  }, [squad]);

  const { starters, bench } = useMemo(() => {
    const slots = getFormationSlots(currentFormation);
    const gkp = squad.filter((p) => p.position_slot === "GKP" && !p.is_bench);
    const def = squad.filter((p) => p.position_slot === "DEF" && !p.is_bench);
    const mid = squad.filter((p) => p.position_slot === "MID" && !p.is_bench);
    const fwd = squad.filter((p) => p.position_slot === "FWD" && !p.is_bench);
    const explicitBench = squad.filter((p) => p.is_bench);
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

  const fplManagerId = selectedParticipant
    ? (participants.find((p) => p.id === selectedParticipant)?.fpl_manager_id ?? null)
    : null;
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
      .update({ is_bench: true })
      .eq("id", player.auction_result_id);
    if (!error) {
      setResults((prev) =>
        prev.map((r) =>
          r.id === player.auction_result_id ? { ...r, is_bench: true } : r,
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
      (p) => p.position_slot === position && !p.is_bench && p.auction_result_id !== player.auction_result_id,
    );
    if (positionStarters.length < maxSlots) {
      const { error } = await supabase
        .from("auction_results")
        .update({ position_slot: position, is_bench: false })
        .eq("id", player.auction_result_id);
      if (!error) {
        setResults((prev) =>
          prev.map((r) =>
            r.id === player.auction_result_id
              ? { ...r, position_slot: position, is_bench: false }
              : r,
          ),
        );
        setSelectedPlayer(null);
      }
    } else {
      const sorted = [...positionStarters].sort((a, b) => a.total_points - b.total_points);
      const toBench = sorted[0];
      if (!toBench) return;
      const [r1, r2] = await Promise.all([
        supabase.from("auction_results").update({ is_bench: true }).eq("id", toBench.auction_result_id),
        supabase.from("auction_results").update({ position_slot: position, is_bench: false }).eq("id", player.auction_result_id),
      ]);
      if (!r1.error && !r2.error) {
        setResults((prev) =>
          prev.map((r) => {
            if (r.id === toBench.auction_result_id) return { ...r, is_bench: true };
            if (r.id === player.auction_result_id) return { ...r, position_slot: position, is_bench: false };
            return r;
          }),
        );
        setSelectedPlayer(null);
      }
    }
    setSaving(false);
  }, [selectedParticipant, squad, currentFormation, supabase]);

  useEffect(() => {
    if (!fplTeamOpen || !fplManagerId) return;

    let cancelled = false;

    const load = async () => {
      try {
        const entryRes = await fetch(`/api/fpl/entry/${fplManagerId}`);
        if (!entryRes.ok) throw new Error("Failed to load FPL entry");

        const entryData = await entryRes.json();
        if (cancelled) return;

        const managerName =
          `${entryData.player_first_name ?? ""} ${entryData.player_last_name ?? ""}`.trim();
        setFplTeamManager(managerName);

        const candidates = [
          currentGameweek,
          entryData.current_event,
          entryData.started_event,
        ].filter((e): e is number => typeof e === "number" && e > 0);
        const seen = new Set<number>();

        let picksData: { picks: FPLPick[] } | null = null;
        for (const event of candidates) {
          if (seen.has(event)) continue;
          seen.add(event);
          const res = await fetch(`/api/fpl/entry/${fplManagerId}/picks?event=${event}`);
          if (res.ok) {
            picksData = await res.json();
            break;
          }
        }

        if (!picksData) {
          throw new Error(
            `No team data found for ${managerName} — they may not have registered for any gameweek yet`,
          );
        }

        if (!cancelled) setFplTeamPicks(picksData.picks ?? []);
      } catch (err) {
        if (!cancelled) {
          setFplTeamError(
            err instanceof Error ? err.message : "Failed to load FPL team",
          );
        }
      } finally {
        if (!cancelled) setFplTeamLoading(false);
      }
    };

    load();

    return () => { cancelled = true; };
  }, [fplTeamOpen, fplManagerId, currentGameweek]);

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
    ? !selectedPlayer.is_bench
    : false;

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6">
      {/* ─── Toolbar (Apple Refined Controls) ─────────────────── */}
      <div className="mb-4 sm:mb-5 flex flex-wrap items-center gap-3">
        <Select
          value={selectedLeague ?? ""}
          onValueChange={(v) => v && setSelectedLeague(v)}
        >
          <SelectTrigger className="h-8 rounded-full bg-muted/60 border border-border/50 text-xs px-3.5 py-1 text-foreground hover:bg-muted/80 transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 w-auto min-w-[160px]">
            <span className="text-xs text-foreground font-semibold">{selectedLeagueName}</span>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            side="bottom"
            align="start"
            sideOffset={6}
            className="w-max min-w-[180px] rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-2xl p-1.5 text-xs text-foreground z-50"
          >
            <SelectGroup>
              {leagues.filter((l) => userLeagueIds.includes(l.id)).map((l) => (
                <SelectItem key={l.id} value={l.id} className="text-xs rounded-xl py-2 px-3 cursor-pointer focus:bg-primary/15 focus:text-primary transition-colors">
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
            <SelectTrigger className="h-8 rounded-full bg-muted/60 border border-border/50 text-xs px-3.5 py-1 text-foreground hover:bg-muted/80 transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 w-auto min-w-[100px]">
              <span className="font-mono font-semibold">{currentFormation}</span>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              side="bottom"
              align="start"
              sideOffset={6}
              className="w-max min-w-[120px] rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-2xl p-1.5 text-xs text-foreground z-50"
            >
              <SelectGroup>
                {FORMATIONS.map((f) => (
                  <SelectItem key={f} value={f} className="text-xs rounded-xl py-2 px-3 cursor-pointer focus:bg-primary/15 focus:text-primary transition-colors font-mono">
                    {f}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : (
          <div className="h-8 rounded-full bg-muted/40 border border-border/40 text-muted-foreground text-xs px-3.5 py-1 flex items-center select-none cursor-default font-mono">
            {currentFormation}
          </div>
        )}

        {fplManagerId && (
          <Drawer
            open={fplTeamOpen}
            onOpenChange={(open) => {
              setFplTeamOpen(open);
              if (open && fplManagerId) {
                setFplTeamLoading(true);
                setFplTeamError(null);
                setFplTeamPicks(null);
              }
            }}
            direction="right"
          >
            <DrawerTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-8 text-xs rounded-full border-border/50 bg-muted/60 text-foreground hover:bg-muted/90 px-3.5 transition-all shadow-xs"
              >
                FPL Team
              </Button>
            </DrawerTrigger>
            <DrawerContent className="bg-card/95 backdrop-blur-2xl border-l border-border/70 text-foreground max-w-[400px] shadow-2xl">
              <DrawerHeader className="border-b border-border/50 px-5 py-4">
                <DrawerTitle className="text-sm font-bold text-foreground tracking-tight">
                  {fplTeamLoading ? "Loading..." : fplTeamManager ? `${fplTeamManager}'s FPL Team` : "FPL Team"}
                </DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto p-4">
                {fplTeamLoading && (
                  <div className="space-y-2">
                    {Array.from({ length: 11 }).map((_, i) => (
                      <div key={i} className="h-10 bg-muted/60 rounded-xl animate-pulse" />
                    ))}
                  </div>
                )}
                {fplTeamError && (
                  <div className="flex items-center justify-center h-32 text-sm text-destructive">
                    {fplTeamError}
                  </div>
                )}
                {fplTeamPicks && fplTeamPicks.length > 0 && (
                  <div className="space-y-1.5">
                    {fplTeamPicks
                      .sort((a, b) => a.position - b.position)
                      .map((pick) => {
                        const player = players.find((p) => p.id === pick.element);
                        if (!player) return null;
                        const isStarting = pick.position <= 11;
                        return (
                          <div
                            key={pick.position}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${
                              isStarting
                                ? "bg-card/90 hover:bg-muted/60 border border-border/60 shadow-xs"
                                : "bg-muted/40 hover:bg-muted/70 border border-border/30"
                            }`}
                          >
                            <span className="w-5 text-center text-muted-foreground font-mono text-[10px]">
                              {pick.position}
                            </span>
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              {(player as EnrichedPlayer).team_crest_url && (
                                <img
                                  src={(player as EnrichedPlayer).team_crest_url}
                                  alt=""
                                  className="w-4 h-4 object-contain shrink-0"
                                />
                              )}
                              <span className="font-semibold truncate text-foreground">
                                {player.web_name}
                              </span>
                              <span className="text-muted-foreground text-[10px] uppercase font-mono">
                                {player.element_type === 1
                                  ? "GKP"
                                  : player.element_type === 2
                                    ? "DEF"
                                    : player.element_type === 3
                                      ? "MID"
                                      : "FWD"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                              {pick.is_captain && (
                                <span className="text-amber-500 font-bold bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-full">(C)</span>
                              )}
                              {pick.is_vice_captain && !pick.is_captain && (
                                <span className="text-sky-500 font-bold bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.5 rounded-full">(VC)</span>
                              )}
                              <span className="text-muted-foreground font-mono">
                                £{(player.now_cost / 10).toFixed(1)}m
                              </span>
                              <span className="text-emerald-700 dark:text-primary font-bold w-6 text-right tabular-nums">
                                {player.total_points}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
                {fplTeamPicks && fplTeamPicks.length === 0 && !fplTeamLoading && !fplTeamError && (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                    No picks found for any gameweek
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        )}

        {currentLeague && (
          <div className="text-xs text-muted-foreground ml-auto tracking-tight">
            Spent{" "}
            <span className="font-mono text-emerald-700 dark:text-primary font-bold tabular-nums">
              £{totalSpent.toFixed(1)}m
            </span>
            {" / "}
            <span className="text-foreground font-semibold">£{budget}m</span>
            {" · "}
            <span className="font-mono text-emerald-700 dark:text-primary font-bold tabular-nums">
              £{remaining.toFixed(1)}m
            </span>{" "}
            left
          </div>
        )}
      </div>

      {/* ─── Team Tabs (Apple Segmented Rail) ─────────── */}
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-none">
        <div className="relative inline-flex items-center p-1 rounded-full bg-muted/60 border border-border/50 backdrop-blur-md gap-1">
          {participants.length > 0 &&
            participants.map((p) => {
              const isActive = selectedParticipant === p.id;
              return (
                <motion.button
                  key={p.id}
                  onClick={() => {
                    setSelectedParticipant(p.id);
                    setSelectedPlayer(null);
                  }}
                  whileTap={shouldReduce ? undefined : { scale: 0.96 }}
                  className={cn(
                    "relative px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 shrink-0 select-none",
                    isActive
                      ? "text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-team-tab-pill"
                      transition={
                        shouldReduce
                          ? { duration: 0 }
                          : { type: "spring", bounce: 0, duration: 0.26 }
                      }
                      className="absolute inset-0 rounded-full bg-primary"
                    />
                  )}
                  <span className="relative z-10">{p.name}</span>
                </motion.button>
              );
            })}
        </div>
      </div>



      {/* ─── Main content: 2-column grid ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] border border-border/60 rounded-2xl overflow-hidden bg-card shadow-sm" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)" }}>
        {/* ─── Left: Stadium Pitch + Bench ──────────────────── */}
        <div className="flex flex-col">
          <div
            style={{
              backgroundColor: "#156434",
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 48px, transparent 48px, transparent 96px)",
            }}
            className="p-6 pb-4 min-h-[520px] relative overflow-hidden flex-1 dark:bg-[#0c2e19]"
          >
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
                    <div className="text-[10px] font-bold text-white/70 tracking-widest text-center mb-1 uppercase">
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
                      <div className="w-full my-2 border-t border-white/20" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bench strip */}
          <div
            style={{ backgroundColor: "#114f2a" }}
            className="border-t border-white/15 py-3.5 min-h-[120px] dark:bg-[#082012]"
          >
            <div className="text-[10px] font-bold text-white/70 tracking-widest text-center mb-2 uppercase">
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
        <div className="border-t lg:border-t-0 lg:border-l border-border/60 flex flex-col bg-card">
          <div className="px-5 py-4 border-b border-border/50 bg-card/60 backdrop-blur-sm">
            <div className="text-sm font-bold text-foreground tracking-tight">
              {participants.find((p) => p.id === selectedParticipant)?.name ??
                "Squad"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {squad.length} players ·{" "}
              {currentLeague
                ? Math.max(0, (currentLeague.squad_size ?? 15) - squad.length)
                : 0}{" "}
              empty slots
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {(["GKP", "DEF", "MID", "FWD", "BENCH"] as const).map((pos) => {
              const posPlayers = sortedSquad.filter((p) =>
                (p.is_bench ? "BENCH" : p.position_slot) === pos,
              );
              if (posPlayers.length === 0) return null;
              return (
                <div key={pos}>
                  <div className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase px-5 pt-3.5 pb-1">
                    {pos} ({posPlayers.length})
                  </div>
                  {posPlayers.map((p) => (
                    <div
                      key={p.auction_result_id}
                      className="flex items-center gap-2.5 px-5 py-2 border-b border-border/40 last:border-0 cursor-pointer hover:bg-muted/60 transition-colors group active:scale-[0.99]"
                      onClick={() => setSelectedPlayer(p)}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 shadow-xs ${POSITION_DOT[p.is_bench ? "BENCH" : p.position_slot] ?? POSITION_DOT.BENCH}`}
                      />
                      <span className="text-xs font-medium text-foreground flex-1 truncate">
                        {p.web_name}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">
                        {p.total_points}
                      </span>
                      <span className="text-xs text-emerald-700 dark:text-primary min-w-[42px] text-right font-mono font-bold tabular-nums">
                        £{p.price_paid.toFixed(1)}m
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
            {squad.length === 0 && (
              <div className="p-6 text-xs text-muted-foreground text-center">
                No players yet
              </div>
            )}
          </div>

          {/* Budget bar */}
          <div className="px-5 py-4 border-t border-border/50 mt-auto space-y-2.5 bg-card/60 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Budget spent</span>
              <span className="font-mono text-foreground font-semibold tabular-nums">
                £{totalSpent.toFixed(1)}m / £{budget}m
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden border border-border/40 p-[1px]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${budgetBarColor}`}
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
                    className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold tabular-nums ${
                      remainingSlots > 0
                        ? "border-amber-500/40 text-amber-800 dark:text-amber-400 bg-amber-500/10 font-bold"
                        : "border-border/60 text-muted-foreground bg-muted/40"
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
        <DialogContent className="bg-card/95 backdrop-blur-2xl border border-border/70 text-foreground w-[calc(100%-2rem)] max-w-3xl mx-auto rounded-3xl p-6 shadow-2xl">
          {displayPlayer && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3.5">
                  <div className="relative h-14 w-12 sm:h-16 sm:w-14 shrink-0 rounded-2xl overflow-hidden bg-muted border border-border/60 shadow-sm">
                    {!dialogImgLoaded && !dialogImgError && (
                      <div className="absolute inset-0 rounded-2xl bg-muted animate-pulse" />
                    )}
                    {dialogImgError ? (
                      <img
                        src="/player-fallback.png"
                        alt={displayPlayer.web_name}
                        className="h-full w-full rounded-2xl object-cover bg-muted"
                      />
                    ) : (
                      <img
                        src={displayPlayer.image_url}
                        alt={displayPlayer.web_name}
                        className={`h-full w-full rounded-2xl object-cover bg-muted ${dialogImgLoaded ? "" : "opacity-0 absolute inset-0"}`}
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
                    <DialogTitle className="text-lg sm:text-xl font-bold truncate tracking-tight text-foreground">
                      {displayPlayer.web_name}
                    </DialogTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      {POSITION_LABELS[displayPlayer.position] ??
                        displayPlayer.position}
                      {" · "}
                      {displayPlayer.team_name}
                      {" · "}
                      <span className="text-emerald-700 dark:text-primary font-mono font-bold">
                        £{displayPlayer.price_paid.toFixed(1)}m
                      </span>
                    </p>
                  </div>
                  {displayPlayer.team_crest_url &&
                    (dialogCrestError ? (
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-muted border border-border/60 flex items-center justify-center mr-4 sm:mr-8 shrink-0">
                        <span className="text-xs font-bold text-muted-foreground">
                          {displayPlayer.team_short?.charAt(0) ?? "?"}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={displayPlayer.team_crest_url}
                        alt={displayPlayer.team_name}
                        className={`h-8 w-8 sm:h-10 sm:w-10 object-contain mr-4 sm:mr-8 shrink-0 ${dialogCrestLoaded ? "" : "opacity-0 absolute"}`}
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
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-muted animate-pulse mr-4 sm:mr-8 shrink-0" />
                    )}
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-4">
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
                <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-2 leading-relaxed">
                  {displayPlayer.news}
                </p>
              )}

              {/* Swap actions */}
              <div className="border-t border-border/50 pt-3">
                {isStarting ? (
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={() => handleMoveToBench(displayPlayer)}
                    className="h-9 px-4 rounded-full text-xs font-semibold bg-muted text-foreground hover:bg-muted/80 border border-border/60 transition-all active:scale-95"
                  >
                    Send to Bench
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={() => handlePromoteToXI(displayPlayer)}
                    className="h-9 px-4 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all active:scale-95"
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
  const shouldReduce = useReducedMotion();
  const name = player.web_name;
  const initial = name.charAt(0).toUpperCase();
  const colorClass = POSITION_COLORS[position] ?? POSITION_COLORS.BENCH;
  const isGkp = player.position === "GKP";
  const shirtUrl = isGkp
    ? `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${player.team_code}_1-66.webp`
    : `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${player.team_code}-110.webp`;
  const [imgError, setImgError] = useState(false);

  return (
    <motion.button
      whileTap={shouldReduce ? undefined : { scale: 0.94 }}
      className="flex flex-col items-center gap-0.5 group focus:outline-none"
      onClick={() => onSelect(player)}
    >
      {imgError ? (
        <div
          className={`w-14 h-16 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-sm border border-white/20 transition-transform duration-200 group-hover:scale-105 ${colorClass}`}
        >
          {initial}
        </div>
      ) : (
        <div className="w-14 h-16 rounded-xl flex items-center justify-center bg-black/30 backdrop-blur-sm border border-white/15 shadow-sm transition-transform duration-200 group-hover:scale-105 group-hover:border-primary group-hover:shadow-md">
          <img
            src={shirtUrl}
            alt={name}
            className="w-11 h-13 object-contain drop-shadow-sm"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        </div>
      )}
      <div className="bg-[#021e14]/85 backdrop-blur-md border border-white/20 rounded-lg px-2 py-0.5 text-center min-w-[70px] max-w-[90px] shadow-sm">
        <div className="text-[11px] text-white font-semibold truncate leading-tight tracking-tight">
          {name}
        </div>
        <div className="text-[10px] text-emerald-300 dark:text-primary font-mono font-bold tabular-nums">
          £{player.price_paid.toFixed(1)}m
        </div>
      </div>
    </motion.button>
  );
}

function EmptySlot() {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-14 h-16 rounded-xl border-2 border-dashed border-white/35 bg-white/10 flex items-center justify-center opacity-70" />
      <div className="bg-[#021e14]/60 backdrop-blur-sm border border-white/15 rounded-lg px-2 py-0.5 text-center min-w-[64px]">
        <div className="h-3 bg-white/20 rounded w-10 mx-auto mb-0.5" />
        <div className="h-2.5 bg-white/20 rounded w-8 mx-auto" />
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
    <div className="bg-muted/50 rounded-xl p-2.5 sm:p-3 border border-border/40 text-center hover:bg-muted/70 transition-colors">
      <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={`font-mono font-bold text-sm sm:text-base tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}
