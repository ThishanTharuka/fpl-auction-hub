"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { BidIncrementTierEditor } from "@/components/bid-increment-tiers";
import { DEFAULT_TIERS } from "@/lib/bid-increment";
import type { BidIncrementTier } from "@/lib/bid-increment";

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-400",
  DEF: "bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400",
  MID: "bg-blue-500/15 border border-blue-500/25 text-blue-700 dark:text-blue-400",
  FWD: "bg-red-500/15 border border-red-500/25 text-red-700 dark:text-red-400",
};

interface LeagueSettings {
  name: string;
  allow_spectator_chat: boolean;
  room_password: string | null;
  budget_per_team: number;
  timer_seconds: number;
  bid_increment: number;
  bid_increment_tiers: BidIncrementTier[];
  max_per_club: number;
  base_price_gkp: number;
  base_price_def: number;
  base_price_mid: number;
  base_price_fwd: number;
  squad_size: number;
  max_gkp: number;
  max_def: number;
  max_mid: number;
  max_fwd: number;
}

export function LeagueSettingsPanel({
  leagueId,
  settings,
  onSaved,
  mobileOpen,
  onMobileOpenChange,
}: {
  leagueId: string;
  settings: LeagueSettings;
  onSaved: (updated: LeagueSettings) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevOpen = useRef(mobileOpen);
  const prevSettings = useRef(settings);

  const [name, setName] = useState(settings.name);
  const [allowSpectatorChat, setAllowSpectatorChat] = useState(settings.allow_spectator_chat);
  const [roomPassword, setRoomPassword] = useState(settings.room_password ?? "");

  const [budget, setBudget] = useState(settings.budget_per_team);
  const [timerSeconds, setTimerSeconds] = useState(settings.timer_seconds);
  const [bidIncrementTiers, setBidIncrementTiers] = useState<BidIncrementTier[]>(
    settings.bid_increment_tiers && settings.bid_increment_tiers.length > 0
      ? settings.bid_increment_tiers
      : DEFAULT_TIERS,
  );
  const [maxPerClub, setMaxPerClub] = useState(settings.max_per_club);

  const [baseGkp, setBaseGkp] = useState(settings.base_price_gkp);
  const [baseDef, setBaseDef] = useState(settings.base_price_def);
  const [baseMid, setBaseMid] = useState(settings.base_price_mid);
  const [baseFwd, setBaseFwd] = useState(settings.base_price_fwd);

  const [squadSize, setSquadSize] = useState(settings.squad_size);
  const [maxGkp, setMaxGkp] = useState(settings.max_gkp);
  const [maxDef, setMaxDef] = useState(settings.max_def);
  const [maxMid, setMaxMid] = useState(settings.max_mid);
  const [maxFwd, setMaxFwd] = useState(settings.max_fwd);

  const resetForm = useCallback(function resetForm() {
    setName(settings.name);
    setAllowSpectatorChat(settings.allow_spectator_chat);
    setRoomPassword(settings.room_password ?? "");
    setBudget(settings.budget_per_team);
    setTimerSeconds(settings.timer_seconds);
    setBidIncrementTiers(
      settings.bid_increment_tiers && settings.bid_increment_tiers.length > 0
        ? settings.bid_increment_tiers
        : DEFAULT_TIERS,
    );
    setMaxPerClub(settings.max_per_club);
    setBaseGkp(settings.base_price_gkp);
    setBaseDef(settings.base_price_def);
    setBaseMid(settings.base_price_mid);
    setBaseFwd(settings.base_price_fwd);
    setSquadSize(settings.squad_size);
    setMaxGkp(settings.max_gkp);
    setMaxDef(settings.max_def);
    setMaxMid(settings.max_mid);
    setMaxFwd(settings.max_fwd);
    setError(null);
  }, [settings]);

  useEffect(() => {
    if (mobileOpen && !prevOpen.current) resetForm();
    prevOpen.current = mobileOpen;
  }, [mobileOpen, resetForm]);

  useEffect(() => {
    if (settings !== prevSettings.current) {
      const wasOpen = prevOpen.current;
      if (!wasOpen) resetForm();
      prevSettings.current = settings;
    }
  }, [settings, resetForm]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const { error: e } = await supabase
      .from("leagues")
      .update({
        name: name.trim(),
        allow_spectator_chat: allowSpectatorChat,
        room_password: roomPassword.trim() || null,
        budget_per_team: budget,
        timer_seconds: timerSeconds,
        bid_increment_tiers: bidIncrementTiers,
        bid_increment: bidIncrementTiers[0]?.increment ?? 0.5,
        max_per_club: maxPerClub,
        base_price_gkp: baseGkp,
        base_price_def: baseDef,
        base_price_mid: baseMid,
        base_price_fwd: baseFwd,
        squad_size: squadSize,
        max_gkp: maxGkp,
        max_def: maxDef,
        max_mid: maxMid,
        max_fwd: maxFwd,
      })
      .eq("id", leagueId);

    if (e) {
      setError("Failed to save settings.");
      setSaving(false);
      return;
    }

    onSaved({
      name: name.trim(),
      allow_spectator_chat: allowSpectatorChat,
      room_password: roomPassword.trim() || null,
      budget_per_team: budget,
      timer_seconds: timerSeconds,
      bid_increment: bidIncrementTiers[0]?.increment ?? 0.5,
      bid_increment_tiers: bidIncrementTiers,
      max_per_club: maxPerClub,
      base_price_gkp: baseGkp,
      base_price_def: baseDef,
      base_price_mid: baseMid,
      base_price_fwd: baseFwd,
      squad_size: squadSize,
      max_gkp: maxGkp,
      max_def: maxDef,
      max_mid: maxMid,
      max_fwd: maxFwd,
    });

    setSaving(false);
    onMobileOpenChange(false);
  }

  const formContent = (
    <div className="space-y-5">
      {/* League */}
      <div>
        <div className="space-y-3">
          <Field label="League Name">
            <Input
              placeholder="e.g. FPL Auction 2025/26"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </Field>
          <Field label="Room Password (optional)">
            <Input
              placeholder="Managers must enter this to join"
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </Field>
          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={allowSpectatorChat}
              onChange={(e) => setAllowSpectatorChat(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary"
            />
            <span className="text-xs text-foreground leading-snug">
              Allow spectators to chat
            </span>
          </label>
        </div>
      </div>

      {/* Rules */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Rules
        </h3>
        <div className="grid grid-cols-3 gap-x-5 gap-y-3 mb-3">
          <Field label="Budget (&pound;m)">
            <NumberInput
              value={budget}
              onChange={setBudget}
              min={50}
              max={1000}
              step={10}
            />
          </Field>
          <Field label="Timer (s)">
            <NumberInput
              value={timerSeconds}
              onChange={setTimerSeconds}
              min={15}
              max={120}
              step={5}
            />
          </Field>
          <Field label="Max/Club">
            <NumberInput
              value={maxPerClub}
              onChange={setMaxPerClub}
              min={1}
              max={5}
              step={1}
            />
          </Field>
        </div>
        <BidIncrementTierEditor tiers={bidIncrementTiers} onChange={setBidIncrementTiers} />
      </div>

      {/* Starting Prices */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Starting Prices (£m)
        </h3>
        <div className="grid grid-cols-4 gap-x-4 gap-y-3">
          {(
            [
              { pos: "GKP", val: baseGkp, set: setBaseGkp },
              { pos: "DEF", val: baseDef, set: setBaseDef },
              { pos: "MID", val: baseMid, set: setBaseMid },
              { pos: "FWD", val: baseFwd, set: setBaseFwd },
            ] as const
          ).map(({ pos, val, set }) => (
            <Field key={pos} label={<PosLabel pos={pos} />}>
              <NumberInput
                value={val}
                onChange={set}
                min={0.5}
                max={20}
                step={0.5}
                decimals={1}
              />
            </Field>
          ))}
        </div>
      </div>

      {/* Squad Limits */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Squad Limits
        </h3>
        <div className="grid grid-cols-3 gap-x-5 gap-y-3">
          <Field label="Squad">
            <NumberInput
              value={squadSize}
              onChange={setSquadSize}
              min={11}
              max={25}
              step={1}
            />
          </Field>
          <Field label="Max GKP">
            <NumberInput
              value={maxGkp}
              onChange={setMaxGkp}
              min={1}
              max={5}
              step={1}
            />
          </Field>
          <Field label="Max DEF">
            <NumberInput
              value={maxDef}
              onChange={setMaxDef}
              min={1}
              max={8}
              step={1}
            />
          </Field>
          <Field label="Max MID">
            <NumberInput
              value={maxMid}
              onChange={setMaxMid}
              min={1}
              max={8}
              step={1}
            />
          </Field>
          <Field label="Max FWD">
            <NumberInput
              value={maxFwd}
              onChange={setMaxFwd}
              min={1}
              max={5}
              step={1}
            />
          </Field>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded p-2">
          {error}
        </p>
      )}

      <Button
        onClick={save}
        disabled={saving || !name.trim()}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
      >
        {saving ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );

  return (
    <>
      {/* Desktop: inline sidebar */}
      <div className="hidden lg:block rounded-2xl border border-border bg-card p-5 overflow-y-auto max-h-[calc(100vh-5rem)] sticky top-20 shadow-sm">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">
          League Settings
        </h2>
        {formContent}
      </div>

      {/* Mobile: bottom drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => onMobileOpenChange(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-card rounded-t-xl border-t border-border flex flex-col overflow-hidden animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                League Settings
              </h2>
              <button
                onClick={() => onMobileOpenChange(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain flex-1 p-5">
              {formContent}
            </div>
          </div>
        </div>
      )}
    </>
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
      <label className="block text-xs text-muted-foreground mb-1.5">{label}</label>
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
        className="w-7 h-8 rounded bg-muted border border-border text-foreground hover:bg-secondary text-sm transition-colors"
      >
        −
      </button>
      <span className="flex-1 text-center text-sm font-mono text-foreground bg-muted/40 border border-border rounded h-8 flex items-center justify-center min-w-[3.5rem]">
        {decimals > 0 ? value.toFixed(decimals) : value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, Number((value + step).toFixed(decimals))))}
        className="w-7 h-8 rounded bg-muted border border-border text-foreground hover:bg-secondary text-sm transition-colors"
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
