"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EnrichedPlayer } from "@/lib/fpl-types";

interface League {
  id: string;
  name: string;
  budget_per_team: number;
}

interface ParticipantRow {
  id: string;
  name: string;
  color: string | null;
  league_id: string | null;
  user_id: string | null;
}

interface AuctionResult {
  id: string;
  participant_id: string | null;
  fpl_player_id: number;
  price_paid: number;
  position_slot: string | null;
  league_id: string | null;
  created_at: string | null;
}

interface SquadPlayer extends EnrichedPlayer {
  price_paid: number;
  position_slot: string;
}

const FORMATION_ROWS: Record<string, number[]> = {
  "4-4-2": [4, 4, 2],
  "4-3-3": [4, 3, 3],
  "3-5-2": [3, 5, 2],
  "5-3-2": [5, 3, 2],
  "5-4-1": [5, 4, 1],
  "4-5-1": [4, 5, 1],
  "3-4-3": [3, 4, 3],
};

export default function TeamsPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(
    null,
  );
  const [results, setResults] = useState<AuctionResult[]>([]);
  const [players, setPlayers] = useState<EnrichedPlayer[]>([]);
  const [formation, setFormation] = useState("4-3-3");
  const [selectedPlayer, setSelectedPlayer] = useState<SquadPlayer | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/fpl/bootstrap").then((r) => r.json()),
      supabase.from("leagues").select("*"),
    ]).then(([fpl, { data: lgs }]) => {
      setPlayers(fpl.players ?? []);
      setLeagues(lgs ?? []);
      if (lgs && lgs.length > 0) setSelectedLeague(lgs[0]?.id ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedLeague) return;
    supabase
      .from("participants")
      .select("*")
      .eq("league_id", selectedLeague)
      .then(({ data }) => {
        setParticipants(data ?? []);
        if (data && data.length > 0)
          setSelectedParticipant(data[0]?.id ?? null);
      });
  }, [selectedLeague]);

  useEffect(() => {
    if (!selectedLeague) return;
    supabase
      .from("auction_results")
      .select("*")
      .eq("league_id", selectedLeague)
      .then(({ data }) => setResults(data ?? []));
  }, [selectedLeague]);

  const squad = useMemo<SquadPlayer[]>(() => {
    if (!selectedParticipant) return [];
    const myResults = results.filter(
      (r) => r.participant_id === selectedParticipant,
    );
    return myResults.flatMap((r) => {
      const p = players.find((pl) => pl.id === r.fpl_player_id);
      if (!p) return [];
      return [
        {
          ...p,
          price_paid: r.price_paid,
          position_slot: r.position_slot ?? "",
        },
      ];
    });
  }, [results, selectedParticipant, players]);

  const { starters, bench } = useMemo(() => {
    const gkp = squad.filter((p) => p.position_slot === "GKP");
    const def = squad.filter((p) => p.position_slot === "DEF");
    const mid = squad.filter((p) => p.position_slot === "MID");
    const fwd = squad.filter((p) => p.position_slot === "FWD");
    const bench = squad.filter((p) => p.position_slot === "BENCH");
    return { starters: { gkp, def, mid, fwd }, bench };
  }, [squad]);

  const totalSpent = useMemo(
    () => squad.reduce((s, p) => s + p.price_paid, 0),
    [squad],
  );

  const currentLeague = leagues.find((l) => l.id === selectedLeague);
  const currentParticipant = participants.find(
    (p) => p.id === selectedParticipant,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#849585]">
        Loading…
      </div>
    );
  }

  if (leagues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-[#849585]">
        <p>No leagues found. Create one in the Auction tab.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      {/* Header controls */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* League selector */}
        <select
          value={selectedLeague ?? ""}
          onChange={(e) => setSelectedLeague(e.target.value)}
          className="bg-[#132030] border border-[#3b4b3d] text-[#d6e4f9] rounded px-3 py-1.5 text-sm"
        >
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        {/* Formation selector */}
        <select
          value={formation}
          onChange={(e) => setFormation(e.target.value)}
          className="bg-[#132030] border border-[#3b4b3d] text-[#d6e4f9] rounded px-3 py-1.5 text-sm"
        >
          {Object.keys(FORMATION_ROWS).map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>

        {/* Team budget indicator */}
        {currentLeague && (
          <div className="ml-auto text-sm text-[#849585]">
            <span className="font-mono text-[#00e478]">
              £{(currentLeague.budget_per_team - totalSpent).toFixed(1)}m
            </span>
            <span className="mx-1">remaining</span>
            <span className="text-[#3b4b3d]">
              / £{currentLeague.budget_per_team}m
            </span>
          </div>
        )}
      </div>

      {/* Participant tabs */}
      {participants.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {participants.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedParticipant(p.id)}
              className="rounded-full px-4 py-1.5 text-sm font-medium transition-all"
              style={
                selectedParticipant === p.id
                  ? {
                      backgroundColor: `${p.color ?? "#888"}33`,
                      color: p.color ?? undefined,
                      border: `1px solid ${p.color ?? "#888"}88`,
                    }
                  : {
                      backgroundColor: "#132030",
                      color: "#b9cbb9",
                      border: "1px solid #3b4b3d",
                    }
              }
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Pitch */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #0a3d1c 0%, #0d4d22 40%, #0a3d1c 100%)",
          border: "1px solid #1a6b30",
          minHeight: 520,
        }}
      >
        {/* Pitch markings */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Centre line */}
          <div className="absolute left-0 right-0 top-1/2 h-px bg-white/15" />
          {/* Centre circle */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/15" />
          {/* Goal areas */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-10 border border-white/15 border-b-0" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-10 border border-white/15 border-t-0" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 py-6 px-4">
          <PitchRow players={starters.gkp} onSelect={setSelectedPlayer} />
          <PitchRow players={starters.def} onSelect={setSelectedPlayer} />
          <PitchRow players={starters.mid} onSelect={setSelectedPlayer} />
          <PitchRow players={starters.fwd} onSelect={setSelectedPlayer} />
        </div>
      </div>

      {/* Bench */}
      {bench.length > 0 && (
        <div className="mt-4 rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-4">
          <div className="text-xs text-[#849585] uppercase tracking-wider mb-3">
            Substitutes
          </div>
          <div className="flex flex-wrap gap-4">
            {bench.map((p) => (
              <PlayerToken key={p.id} player={p} onSelect={setSelectedPlayer} />
            ))}
          </div>
        </div>
      )}

      {squad.length === 0 && (
        <p className="mt-6 text-center text-sm text-[#849585]">
          {currentParticipant
            ? `${currentParticipant.name} has no players yet.`
            : "Select a participant."}
        </p>
      )}

      {/* Player detail modal */}
      <Dialog
        open={!!selectedPlayer}
        onOpenChange={(o) => !o && setSelectedPlayer(null)}
      >
        <DialogContent className="bg-[#0f1c2c] border-[#3b4b3d] text-[#d6e4f9] max-w-sm">
          {selectedPlayer && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {selectedPlayer.web_name}
                </DialogTitle>
                <p className="text-sm text-[#b9cbb9]">
                  {selectedPlayer.position} · {selectedPlayer.team_name}
                </p>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-4">
                <Stat
                  label="Auction Price"
                  value={`£${selectedPlayer.price_paid.toFixed(1)}m`}
                  highlight
                />
                <Stat
                  label="FPL Price"
                  value={`£${selectedPlayer.price.toFixed(1)}m`}
                />
                <Stat
                  label="Total Points"
                  value={selectedPlayer.total_points}
                />
                <Stat label="Form" value={selectedPlayer.form} />
                <Stat label="Goals" value={selectedPlayer.goals_scored} />
                <Stat label="Assists" value={selectedPlayer.assists} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PitchRow({
  players,
  onSelect,
}: Readonly<{ players: SquadPlayer[]; onSelect: (p: SquadPlayer) => void }>) {
  if (players.length === 0) return null;
  return (
    <div className="flex justify-center gap-6 w-full">
      {players.map((p) => (
        <PlayerToken key={p.id} player={p} onSelect={onSelect} />
      ))}
    </div>
  );
}

function PlayerToken({
  player,
  onSelect,
}: Readonly<{ player: SquadPlayer; onSelect: (p: SquadPlayer) => void }>) {
  return (
    <button
      className="flex flex-col items-center gap-1 group"
      onClick={() => onSelect(player)}
    >
      <div className="w-12 h-12 rounded-full bg-[#061423]/80 border-2 border-[#00e478]/60 flex items-center justify-center text-lg font-bold text-white group-hover:border-[#00e478] transition-colors">
        {player.web_name.charAt(0)}
      </div>
      <div className="bg-[#061423]/90 rounded px-1.5 py-0.5 text-center max-w-[80px]">
        <div className="text-[11px] text-white font-medium truncate leading-tight">
          {player.web_name}
        </div>
        <div className="text-[10px] text-[#00e478] font-mono">
          £{player.price_paid.toFixed(1)}m
        </div>
      </div>
    </button>
  );
}

function Stat({
  label,
  value,
  highlight,
}: Readonly<{ label: string; value: string | number; highlight?: boolean }>) {
  return (
    <div className="bg-[#132030] rounded p-2.5">
      <div className="text-[10px] text-[#849585] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={`font-mono font-bold ${highlight ? "text-[#00e478]" : "text-[#d6e4f9]"}`}
      >
        {value}
      </div>
    </div>
  );
}
