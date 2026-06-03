"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const supabase = createSupabaseBrowserClient();

const POSITION_COLORS: Record<string, string> = {
  GKP: "bg-yellow-500/20 text-yellow-400",
  DEF: "bg-green-500/20 text-green-400",
  MID: "bg-blue-500/20 text-blue-400",
  FWD: "bg-red-500/20 text-red-400",
};

interface LeagueSettings {
  name: string;
  room_password: string | null;
  budget_per_team: number;
  timer_seconds: number;
  bid_increment: number;
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
}: {
  leagueId: string;
  settings: LeagueSettings;
  onSaved: (updated: LeagueSettings) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(settings.name);
  const [roomPassword, setRoomPassword] = useState(settings.room_password ?? "");

  const [budget, setBudget] = useState(settings.budget_per_team);
  const [timerSeconds, setTimerSeconds] = useState(settings.timer_seconds);
  const [bidIncrement, setBidIncrement] = useState(settings.bid_increment);
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

  function resetForm() {
    setName(settings.name);
    setRoomPassword(settings.room_password ?? "");
    setBudget(settings.budget_per_team);
    setTimerSeconds(settings.timer_seconds);
    setBidIncrement(settings.bid_increment);
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
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const { error: e } = await supabase
      .from("leagues")
      .update({
        name: name.trim(),
        room_password: roomPassword.trim() || null,
        budget_per_team: budget,
        timer_seconds: timerSeconds,
        bid_increment: bidIncrement,
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
      room_password: roomPassword.trim() || null,
      budget_per_team: budget,
      timer_seconds: timerSeconds,
      bid_increment: bidIncrement,
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
    setDrawerOpen(false);
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
      </div>

      {/* Rules */}
      <div>
        <h3 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-3">
          Rules
        </h3>
        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
          <Field label="Budget (£m)">
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
          <Field label="Bid Inc (£m)">
            <NumberInput
              value={bidIncrement}
              onChange={setBidIncrement}
              min={0.1}
              max={2}
              step={0.1}
              decimals={1}
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
      </div>

      {/* Starting Prices */}
      <div>
        <h3 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-3">
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
        <h3 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-3">
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
        <p className="text-sm text-red-400 bg-red-950/30 rounded p-2">
          {error}
        </p>
      )}

      <Button
        onClick={save}
        disabled={saving || !name.trim()}
        className="w-full bg-[#00e478] text-[#003919] hover:bg-[#00e478]/90 font-semibold"
      >
        {saving ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );

  return (
    <>
      {/* Desktop: inline sidebar */}
      <div className="hidden lg:block rounded-2xl border border-[#3b4b3d] bg-[#0f1c2c] p-5 overflow-y-auto max-h-[calc(100vh-5rem)] sticky top-20">
        <h2 className="text-xs font-semibold text-[#849585] uppercase tracking-wider mb-5">
          League Settings
        </h2>
        {formContent}
      </div>

      {/* Mobile: trigger button + bottom drawer */}
      <div className="lg:hidden">
        <Button
          onClick={() => {
            resetForm();
            setDrawerOpen(true);
          }}
          variant="outline"
          className="border-[#3b4b3d] text-[#849585] hover:bg-[#132030]"
        >
          Edit Settings
        </Button>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-[#0a1522] rounded-t-xl border-t border-[#3b4b3d] flex flex-col overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#3b4b3d] shrink-0">
              <h2 className="text-xs font-semibold text-[#849585] uppercase tracking-wider">
                League Settings
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-[#849585] hover:text-[#d6e4f9]"
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
