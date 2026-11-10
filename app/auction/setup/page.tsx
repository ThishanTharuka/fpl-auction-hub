"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, AlertCircle, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";
import { BidIncrementTierEditor } from "@/components/bid-increment-tiers";
import { DEFAULT_TIERS } from "@/lib/bid-increment";
import type { BidIncrementTier } from "@/lib/bid-increment";

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25",
  DEF: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/25",
  MID: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25",
  FWD: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25",
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
  const shouldReduce = useReducedMotion();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

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

  const isFormValid = leagueName.trim().length > 0 && teams.length >= 2;

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Header — Consistent across Hub */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          New Auction
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
          Configure room settings, timer rules, position base prices, and roster teams.
        </p>
      </div>

      {(loading || !user) && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-8 text-center text-sm text-muted-foreground animate-pulse">
          Loading auction studio…
        </div>
      )}

      {!loading && user && (
        /* Full-Row Studio Layout: Config Column (8 cols) + Blueprint Column (4 cols) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Configuration (8 Columns) */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. League Details */}
            <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-6 sm:p-7 space-y-5 shadow-xs">
              <div className="pb-2 border-b border-border/40">
                <h2 className="text-base font-semibold text-foreground tracking-tight">League Details</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Name your auction and optionally restrict access with a room password.</p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    League Name
                  </label>
                  <Input
                    placeholder="e.g. FPL Auction 2025/26"
                    value={leagueName}
                    onChange={(e) => setLeagueName(e.target.value)}
                    className="rounded-xl bg-muted/40 border-border/70 text-foreground placeholder:text-muted-foreground h-10 px-3.5 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Room Password (Optional)
                  </label>
                  <Input
                    placeholder="Managers must enter this to join"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    className="rounded-xl bg-muted/40 border-border/70 text-foreground placeholder:text-muted-foreground h-10 px-3.5 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 2. Auction Rules & Timer */}
            <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-6 sm:p-7 space-y-5 shadow-xs">
              <div className="pb-2 border-b border-border/40">
                <h2 className="text-base font-semibold text-foreground tracking-tight">Auction Rules &amp; Limits</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Set the manager starting budget, countdown duration, and squad constraints.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Budget per Team (£m)
                  </label>
                  <NumberInput value={budget} onChange={setBudget} min={50} max={1000} step={10} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Timer (seconds)
                  </label>
                  <NumberInput value={timerSeconds} onChange={setTimerSeconds} min={15} max={120} step={5} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Max Players / Club
                  </label>
                  <NumberInput value={maxPerClub} onChange={setMaxPerClub} min={1} max={5} step={1} />
                </div>
              </div>

              <div className="pt-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Bid Increment Tiers
                </label>
                <BidIncrementTierEditor tiers={bidIncrementTiers} onChange={setBidIncrementTiers} />
              </div>
            </div>

            {/* 3. Starting Prices */}
            <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-6 sm:p-7 space-y-5 shadow-xs">
              <div className="pb-2 border-b border-border/40">
                <h2 className="text-base font-semibold text-foreground tracking-tight">Starting Prices (£m)</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Minimum nomination price for each position slot.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(
                  [
                    { pos: "GKP", val: baseGkp, set: setBaseGkp },
                    { pos: "DEF", val: baseDef, set: setBaseDef },
                    { pos: "MID", val: baseMid, set: setBaseMid },
                    { pos: "FWD", val: baseFwd, set: setBaseFwd },
                  ] as const
                ).map(({ pos, val, set }) => (
                  <div key={pos} className="space-y-2 p-3.5 rounded-xl border border-border/50 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${POSITION_COLORS[pos] ?? ""}`}>
                        {pos}
                      </span>
                    </div>
                    <NumberInput value={val} onChange={set} min={0.5} max={20} step={0.5} decimals={1} />
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Participating Teams */}
            <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-6 sm:p-7 space-y-5 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div>
                  <h2 className="text-base font-semibold text-foreground tracking-tight">Roster Teams</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Add at least two teams for managers to claim and draft.</p>
                </div>
                <Badge className="text-xs font-semibold rounded-full border border-border/60 bg-muted/60 text-foreground px-2.5 py-0.5">
                  {teams.length} / 30 Teams
                </Badge>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Team / manager name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTeam()}
                  className="rounded-xl bg-muted/40 border-border/70 text-foreground placeholder:text-muted-foreground h-10 px-3.5 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
                <motion.div whileTap={shouldReduce ? undefined : { scale: 0.96 }}>
                  <Button
                    onClick={addTeam}
                    disabled={!newTeamName.trim() || teams.length >= 30}
                    className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-4 h-10 gap-1 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </Button>
                </motion.div>
              </div>

              {teams.length === 0 ? (
                <div className="py-8 text-center rounded-xl border border-dashed border-border/60 bg-muted/10 text-xs text-muted-foreground">
                  No teams added yet. Add at least 2 teams to enable auction creation.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {teams.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/60 px-3.5 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs ring-1 ring-black/20"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="text-xs font-semibold text-foreground truncate">{t.name}</span>
                      </div>
                      <button
                        onClick={() => removeTeam(t.id)}
                        className="rounded-full p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label={`Remove ${t.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Right Column / Summary Card (4 Columns) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            <div className="rounded-2xl border border-border/60 bg-card/90 dark:bg-card/80 backdrop-blur-md p-6 sm:p-7 space-y-5 shadow-sm">
              <div className="pb-2 border-b border-border/40">
                <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">Auction Blueprint</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Room Name</span>
                  <span className="font-semibold text-foreground truncate max-w-[170px]">
                    {leagueName.trim() || "Untitled League"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Budget per Team</span>
                  <span className="font-mono font-bold text-foreground">£{budget}m</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Bid Timer</span>
                  <span className="font-mono font-bold text-foreground">{timerSeconds}s</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Squad Roster Size</span>
                  <span className="font-mono font-bold text-foreground">15 players</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Club Constraint</span>
                  <span className="font-mono font-bold text-foreground">Max {maxPerClub} / club</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Registered Teams</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-primary">
                    {teams.length} teams
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Password Protected</span>
                  <span className="font-semibold text-foreground">
                    {roomPassword.trim() ? "Yes" : "No"}
                  </span>
                </div>
              </div>

              {/* Readiness validation box */}
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 transition-colors ${
                  isFormValid
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                }`}
              >
                {isFormValid ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-primary" />
                    <span>Ready to launch auction lobby.</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      {!leagueName.trim()
                        ? "Enter a league name to proceed."
                        : "Add at least 2 teams to create the room."}
                    </span>
                  </>
                )}
              </div>

              <motion.div whileTap={shouldReduce ? undefined : { scale: 0.98 }}>
                <Button
                  onClick={createLeague}
                  disabled={saving || !isFormValid}
                  className="w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 hover:brightness-105 active:scale-98 font-bold h-12 text-sm shadow-sm transition-all gap-2"
                >
                  <span>{saving ? "Creating Auction…" : "Create Auction"}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small helper for tactile stepper ──────────────────────────────────────────

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
  const shouldReduce = useReducedMotion();
  return (
    <div className="flex items-center gap-1.5">
      <motion.button
        type="button"
        whileTap={shouldReduce ? undefined : { scale: 0.92 }}
        onClick={() => onChange(Math.max(min, Number((value - step).toFixed(decimals))))}
        className="w-9 h-9 rounded-xl bg-card border border-border/70 text-foreground hover:bg-muted active:scale-95 text-base font-semibold transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
      >
        −
      </motion.button>
      <span className="flex-1 text-center text-sm font-mono font-bold text-foreground bg-muted/40 border border-border/70 rounded-xl h-9 flex items-center justify-center min-w-[3.5rem] tabular-nums">
        {decimals > 0 ? value.toFixed(decimals) : value}
      </span>
      <motion.button
        type="button"
        whileTap={shouldReduce ? undefined : { scale: 0.92 }}
        onClick={() => onChange(Math.min(max, Number((value + step).toFixed(decimals))))}
        className="w-9 h-9 rounded-xl bg-card border border-border/70 text-foreground hover:bg-muted active:scale-95 text-base font-semibold transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
      >
        +
      </motion.button>
    </div>
  );
}
