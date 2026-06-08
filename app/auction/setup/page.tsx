"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";
import { BidIncrementTierEditor } from "@/components/bid-increment-tiers";
import { DEFAULT_TIERS } from "@/lib/bid-increment";
import type { BidIncrementTier } from "@/lib/bid-increment";

const supabase = createSupabaseBrowserClient();

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-yellow-500/20 text-yellow-400",
  DEF: "bg-green-500/20 text-green-400",
  MID: "bg-blue-500/20 text-blue-400",
  FWD: "bg-red-500/20 text-red-400",
};

const TEAM_COLORS = [
  "#4ade80", "#60a5fa", "#f472b6", "#fb923c",
  "#a78bfa", "#34d399", "#fbbf24", "#f87171",
  "#38bdf8", "#e879f9", "#84cc16", "#f59e0b",
  "#10b981", "#6366f1", "#ec4899", "#14b8a6",
  "#8b5cf6", "#ef4444", "#3b82f6", "#22c55e",
];

interface TeamEntry {
  id: string;
  name: string;
  color: string;
}

export default function AuctionSetupPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // League config
  const [leagueName, setLeagueName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [budget, setBudget] = useState(200);
  const [timerSeconds, setTimerSeconds] = useState(45);
  const [bidIncrementTiers, setBidIncrementTiers] = useState<BidIncrementTier[]>(DEFAULT_TIERS);

  // Base prices per position
  const [baseGkp, setBaseGkp] = useState(4.0);
  const [baseDef, setBaseDef] = useState(4.5);
  const [baseMid, setBaseMid] = useState(5.0);
  const [baseFwd, setBaseFwd] = useState(5.0);

  // Squad limits
  const [maxPerClub, setMaxPerClub] = useState(3);

  // Teams
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [newTeamName, setNewTeamName] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTeam() {
    const name = newTeamName.trim();
    if (!name || teams.length >= 30) return;
    setTeams((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        color: TEAM_COLORS[prev.length % TEAM_COLORS.length] ?? "#888888",
      },
    ]);
    setNewTeamName("");
  }

  function removeTeam(id: string) {
    setTeams((prev) => prev.filter((t) => t.id !== id));
  }

  async function createLeague() {
    if (!leagueName.trim() || teams.length < 2 || !user) return;
    setSaving(true);
    setError(null);

    const { data: league, error: le } = await supabase
      .from("leagues")
      .insert({
        name: leagueName.trim(),
        room_password: roomPassword.trim() || null,
        created_by: user.id,
        budget_per_team: budget,
        timer_seconds: timerSeconds,
        bid_increment_tiers: bidIncrementTiers,
        bid_increment: bidIncrementTiers[0]?.increment ?? 0.5,
        base_price_gkp: baseGkp,
        base_price_def: baseDef,
        base_price_mid: baseMid,
        base_price_fwd: baseFwd,
        max_per_club: maxPerClub,
        squad_size: 15,
        max_gkp: 2,
        max_def: 5,
        max_mid: 5,
        max_fwd: 3,
        status: "setup",
      })
      .select()
      .single();

    if (le || !league) {
      setError("Failed to create league.");
      setSaving(false);
      return;
    }

    const { error: pe } = await supabase.from("participants").insert(
      teams.map((t) => ({
        league_id: league.id,
        name: t.name,
        color: t.color,
      })),
    );

    if (pe) {
      setError("Failed to add teams.");
      setSaving(false);
      return;
    }

    router.push(`/auction/${league.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      {(loading || !user) && (
        <p className="text-[#849585] text-sm">Loading…</p>
      )}
      {!loading && user && (<>
      <div>
        <h1 className="text-2xl font-bold text-[#d6e4f9]">New Auction</h1>
        <p className="text-sm text-[#849585] mt-1">
          Configure your league settings and add teams before starting.
        </p>
      </div>

      {/* League name */}
      <Section title="League">
        <div className="space-y-3">
          <Field label="League Name">
            <Input
              placeholder="e.g. FPL Auction 2025/26"
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              className="bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] placeholder:text-[#849585]"
            />
          </Field>
          <Field label="Room Password (optional)">
            <Input
              placeholder="Managers must enter this to join"
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              className="bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] placeholder:text-[#849585]"
            />
          </Field>
        </div>
      </Section>

      {/* Budget & timer */}
      <Section title="Rules">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Field label="Budget per Team (£m)">
            <NumberInput value={budget} onChange={setBudget} min={50} max={1000} step={10} />
          </Field>
          <Field label="Timer (seconds)">
            <NumberInput value={timerSeconds} onChange={setTimerSeconds} min={15} max={120} step={5} />
          </Field>
          <Field label="Max Players Per Club">
            <NumberInput value={maxPerClub} onChange={setMaxPerClub} min={1} max={5} step={1} />
          </Field>
        </div>
        <BidIncrementTierEditor tiers={bidIncrementTiers} onChange={setBidIncrementTiers} />
      </Section>

      {/* Base prices */}
      <Section title="Starting Prices (£m)">
        <p className="text-xs text-[#849585] mb-3">
          Minimum bid when a player is nominated.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(
            [
              { pos: "GKP", val: baseGkp, set: setBaseGkp },
              { pos: "DEF", val: baseDef, set: setBaseDef },
              { pos: "MID", val: baseMid, set: setBaseMid },
              { pos: "FWD", val: baseFwd, set: setBaseFwd },
            ] as const
          ).map(({ pos, val, set }) => (
            <Field key={pos} label={<PosLabel pos={pos} />}>
              <NumberInput value={val} onChange={set} min={0.5} max={20} step={0.5} decimals={1} />
            </Field>
          ))}
        </div>
      </Section>

      {/* Teams */}
      <Section title={`Teams (${teams.length})`}>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Team / manager name"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTeam()}
            className="bg-[#132030] border-[#3b4b3d] text-[#d6e4f9] placeholder:text-[#849585]"
          />
          <Button
            onClick={addTeam}
            disabled={!newTeamName.trim() || teams.length >= 30}
            className="bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 shrink-0"
          >
            Add
          </Button>
        </div>
        {teams.length === 0 && (
          <p className="text-xs text-[#849585] italic">No teams added yet. Add at least 2.</p>
        )}
        <div className="space-y-1.5">
          {teams.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-md bg-[#132030] border border-[#3b4b3d] px-3 py-2"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                <span className="text-sm text-[#d6e4f9]">{t.name}</span>
              </div>
              <button
                onClick={() => removeTeam(t.id)}
                className="text-[#849585] hover:text-red-400 text-lg leading-none"
                aria-label="Remove team"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </Section>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/30 rounded p-2">{error}</p>
      )}

      <Button
        onClick={createLeague}
        disabled={saving || !leagueName.trim() || teams.length < 2}
        className="w-full bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-semibold text-base py-5"
      >
        {saving ? "Creating…" : "Create Auction →"}
      </Button>
      </>)}
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#3b4b3d] bg-[#0f1c2c] p-5">
      <h2 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-[#849585] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  decimals = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  decimals?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(min, Number((value - step).toFixed(decimals))))}
        className="w-7 h-8 rounded bg-[#132030] border border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b] text-sm"
      >
        −
      </button>
      <span className="flex-1 text-center text-sm font-mono text-[#d6e4f9] bg-[#132030] border border-[#3b4b3d] rounded h-8 flex items-center justify-center min-w-[3.5rem]">
        {decimals > 0 ? value.toFixed(decimals) : value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, Number((value + step).toFixed(decimals))))}
        className="w-7 h-8 rounded bg-[#132030] border border-[#3b4b3d] text-[#b9cbb9] hover:bg-[#1e2b3b] text-sm"
      >
        +
      </button>
    </div>
  );
}

function PosLabel({ pos }: { pos: string }) {
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${POSITION_COLORS[pos] ?? ""}`}
    >
      {pos}
    </span>
  );
}
