"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";
import type { Database } from "@/lib/database.types";

type Participant = Database["public"]["Tables"]["participants"]["Row"];

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;

const COLOR_PRESETS = ["#4ade80", "#3b82f6", "#ef4444", "#a78bfa", "#fb923c", "#facc15", "#2dd4bf", "#f472b6"];

export default function TeamEditPage() {
  const { id: leagueId, participantId } = useParams<{ id: string; participantId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [participant, setParticipant] = useState<Participant | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#888888");
  const [hexInput, setHexInput] = useState("#888888");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [fplManagerId, setFplManagerId] = useState("");
  const [fplVerifiedName, setFplVerifiedName] = useState<string | null>(null);
  const [fplVerifying, setFplVerifying] = useState(false);
  const [fplError, setFplError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customKey, setCustomKey] = useState(0);

  const handleSetColor = useCallback((hex: string) => {
    setColor(hex);
    setHexInput(hex.toUpperCase());
  }, []);

  const fetchData = useCallback(async () => {
    if (!user || !leagueId || !participantId) return;

    const [{ data: p }, { data: members }] = await Promise.all([
      supabase.from("participants").select("*").eq("id", participantId).single(),
      supabase
        .from("team_members")
        .select("*")
        .eq("league_id", leagueId)
        .eq("participant_id", participantId)
        .eq("user_id", user.id)
        .eq("status", "approved"),
    ]);

    if (p) {
      const pt = p as unknown as Participant;
      setParticipant(pt);
      setName(pt.name);
      handleSetColor(pt.color ?? "#888888");
      setFplManagerId(pt.fpl_manager_id?.toString() ?? "");
      setAvatarPreview(pt.avatar_url);

      if (pt.fpl_manager_id) {
        fetch(`/api/fpl/entry/${pt.fpl_manager_id}`)
          .then((r) => r.json() as Promise<{ player_first_name: string; player_last_name: string }>)
          .then((data) => setFplVerifiedName(`${data.player_first_name} ${data.player_last_name}`))
          .catch(() => {});
      }
    }

    setIsManager(members !== null && members.length > 0);
    setLoading(false);
  }, [user, leagueId, participantId, supabase, handleSetColor]);

  /* eslint-disable react-hooks/set-state-in-effect -- intentional: fetch on mount */
  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchData().catch(() => {});
  }, [user, fetchData, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setUploadError(null);
    if (!file) {
      setAvatarFile(null);
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError("Only PNG, JPEG, and WebP images are accepted.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File must be under 2MB.");
      e.target.value = "";
      return;
    }
    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(previewUrl);
  }

  function handleAvatarFile(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError("Only PNG, JPEG, and WebP images are accepted.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File must be under 2MB.");
      return;
    }
    setUploadError(null);
    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(previewUrl);
  }

  async function handleVerifyFpl() {
    const id = fplManagerId.trim();
    if (!id) return;
    setFplVerifying(true);
    setFplError(null);
    setFplVerifiedName(null);
    try {
      const res = await fetch(`/api/fpl/entry/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json() as { player_first_name: string; player_last_name: string };
      setFplVerifiedName(`${data.player_first_name} ${data.player_last_name}`);
    } catch {
      setFplError("Could not verify this FPL Manager ID. Check the number and try again.");
    } finally {
      setFplVerifying(false);
    }
  }

  async function handleSave() {
    if (!user || !leagueId || !participantId) return;
    setSaving(true);
    setError(null);

    let avatarUrl: string | null = participant?.avatar_url ?? null;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() ?? "png";
      const storagePath = `${leagueId}/${participantId}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("team-avatars")
        .upload(storagePath, avatarFile, { upsert: true });

      if (uploadErr) {
        setError("Failed to upload avatar. Please try again.");
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("team-avatars")
        .getPublicUrl(storagePath);

      avatarUrl = urlData?.publicUrl ?? avatarUrl;
    }

    const updateData: Database["public"]["Tables"]["participants"]["Update"] = {
      name: (name.trim() || participant?.name) ?? "Unnamed Team",
      color: color || null,
      avatar_url: avatarUrl,
      fpl_manager_id: fplManagerId.trim() ? Number(fplManagerId.trim()) : null,
    };

    const { error: updateErr } = await supabase
      .from("participants")
      .update(updateData)
      .eq("id", participantId);

    if (updateErr) {
      setError("Failed to save team settings.");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push(`/auction/${leagueId}/teams`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#8b97aa]">
        Loading...
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-[#8b97aa] mb-4">
          You must be an approved manager of this team to edit its settings.
        </p>
        <Link href={`/auction/${leagueId}/teams`}>
          <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4ade80] text-[#06281a] font-semibold text-sm hover:brightness-110 transition-all active:scale-[0.98]">
            Back to Teams
          </button>
        </Link>
      </div>
    );
  }

  const crestInitial = (name.trim() || "T").charAt(0).toUpperCase();

  return (
    <>
      <style>{`
        .crest-clip {
          width: 84px;
          height: 92px;
          clip-path: polygon(50% 0%, 100% 16%, 100% 58%, 50% 100%, 0% 58%, 0% 16%);
        }
        .avatar-drop.drag-over {
          border-color: #4ade80 !important;
          background: rgba(74,222,128,0.12) !important;
        }
      `}</style>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6">
        <Link
          href={`/auction/${leagueId}/teams`}
          className="inline-flex items-center gap-1.5 text-sm text-[#8b97aa] font-medium hover:text-[#edf1f7] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to Teams
        </Link>

        <header className="mt-5 mb-8">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#4ade80] block mb-2">
            Squad Identity
          </span>
          <h1 className="text-[32px] font-bold tracking-[-0.01em] text-[#edf1f7] leading-tight">
            Team Settings
          </h1>
          <p className="mt-2 text-sm text-[#8b97aa] max-w-[520px] leading-relaxed">
            Set your crest, name, and colors &mdash; and link your official FPL squad to pull live matchday points.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="flex flex-col gap-[18px]">
            <section className="bg-[#121826] border border-[#1a2333] rounded-[18px] p-[22px_24px]">
              <div className="flex items-baseline justify-between mb-[14px]">
                <span className="text-[#8b97aa] text-[12.5px] tracking-[0.08em] uppercase font-semibold">
                  Team Avatar
                </span>
              </div>
              <div className="flex items-center gap-[18px]">
                <div
                  className={`avatar-drop w-[74px] h-[74px] rounded-[20px] border-[1.5px] border-dashed flex items-center justify-center shrink-0 cursor-pointer transition-[border-color,background] duration-150 overflow-hidden relative ${dragOver ? "drag-over" : ""}`}
                  style={{
                    borderColor: dragOver ? "#4ade80" : "#222c3e",
                    background: dragOver ? "rgba(74,222,128,0.12)" : "#161f30",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleAvatarFile(file);
                  }}
                >
                  {avatarPreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#586278] text-[10.5px] font-medium text-center tracking-[0.02em]">
                      No<br />image
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <label
                    className="inline-flex items-center gap-2 px-4 py-[9px] rounded-lg bg-[#161f30] border border-[#222c3e] text-sm font-medium text-[#edf1f7] cursor-pointer hover:border-[#4ade80] hover:bg-[#121826] transition-[border-color,background] duration-150"
                  >
                    Upload image
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      key={customKey}
                      onChange={(e) => {
                        handleFileSelect(e);
                        setCustomKey((k) => k + 1);
                      }}
                      hidden
                    />
                  </label>
                  {uploadError && (
                    <p className="mt-1.5 text-xs text-[#f87171]">{uploadError}</p>
                  )}
                  <p className="mt-[9px] text-[12.5px] text-[#586278] leading-relaxed">
                    PNG, JPEG, or WebP. Max 2MB.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-[#121826] border border-[#1a2333] rounded-[18px] p-[22px_24px]">
              <div className="flex items-baseline justify-between mb-[14px]">
                <span className="text-[#8b97aa] text-[12.5px] tracking-[0.08em] uppercase font-semibold">
                  Team Name
                </span>
              </div>
              <input
                className="w-full bg-[#161f30] border border-[#222c3e] text-[#edf1f7] font-sans text-sm px-[14px] py-[11px] rounded-lg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#586278] focus:border-[#4ade80] focus:shadow-[0_0_0_3px_rgba(74,222,128,0.12)]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Salah's Saviours"
              />
            </section>

            <section className="bg-[#121826] border border-[#1a2333] rounded-[18px] p-[22px_24px]">
              <div className="flex items-baseline justify-between mb-[14px]">
                <span className="text-[#8b97aa] text-[12.5px] tracking-[0.08em] uppercase font-semibold">
                  FPL Manager ID
                </span>
                <span className="text-[11.5px] font-medium text-[#586278]">optional</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center bg-[#161f30] border border-[#222c3e] rounded-lg overflow-hidden transition-[border-color,box-shadow] duration-150 focus-within:border-[#4ade80] focus-within:shadow-[0_0_0_3px_rgba(74,222,128,0.12)]">
                  <span className="pl-[14px] text-[#586278] font-mono text-sm">#</span>
                  <input
                    className="flex-1 bg-transparent border-none outline-none text-[#edf1f7] font-mono text-sm px-[6px] py-[11px]"
                    type="text"
                    inputMode="numeric"
                    value={fplManagerId}
                    onChange={(e) => {
                      setFplManagerId(e.target.value);
                      setFplVerifiedName(null);
                      setFplError(null);
                    }}
                    placeholder="e.g. 565066"
                  />
                </div>
                <button
                  type="button"
                  disabled={fplVerifying || !fplManagerId.trim()}
                  onClick={handleVerifyFpl}
                  className="px-4 py-[11px] rounded-lg bg-[#161f30] border border-[#222c3e] text-sm font-medium text-[#8b97aa] cursor-pointer disabled:opacity-40 hover:border-[#8b97aa] hover:text-[#edf1f7] transition-all active:scale-[0.98] shrink-0"
                >
                  {fplVerifying ? "Verifying..." : "Verify"}
                </button>
              </div>
              {fplVerifiedName && (
                <p className="mt-1.5 text-xs text-[#4ade80]">
                  Confirmed: {fplVerifiedName}
                </p>
              )}
              {fplError && (
                <p className="mt-1.5 text-xs text-[#f87171]">{fplError}</p>
              )}
              <p className="mt-[9px] text-[12.5px] text-[#586278] leading-relaxed">
                Connect your official FPL team to track live matchday points.
              </p>
            </section>

            {error && (
              <p className="text-sm text-[#f87171] bg-red-900/20 rounded-lg px-4 py-2.5">{error}</p>
            )}

          </div>

          <aside className="lg:sticky lg:top-10">
            <div className="bg-[#121826] border border-[#1a2333] rounded-[18px] p-[26px_22px] flex flex-col items-center text-center">
              <span className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-[#586278] mb-[18px]">
                Live Preview
              </span>

              <div
                className="crest-clip flex items-center justify-center mb-4 overflow-hidden relative transition-colors duration-200"
                style={{
                  background: avatarPreview ? "transparent" : color,
                }}
              >
                {avatarPreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-[30px] text-[#06281a]" style={{ fontFamily: "Inter, sans-serif" }}>
                    {crestInitial}
                  </span>
                )}
              </div>

              <div
                className="font-bold text-[19px] text-[#edf1f7] mb-1.5 break-words"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {name.trim() || "Team"}
              </div>

              <div className="font-mono text-xs text-[#586278] mb-[18px]">
                {hexInput}
              </div>

              <div className="w-full h-px bg-[#1a2333] mb-4" />

              <div className="flex items-center gap-2 text-[12.5px] text-[#8b97aa] bg-[#161f30] rounded-full px-[13px] py-[7px]">
                <span
                  className="w-[6px] h-[6px] rounded-full"
                  style={{
                    background: fplManagerId.trim() ? "#4ade80" : "#586278",
                    boxShadow: fplManagerId.trim() ? "0 0 0 3px rgba(74,222,128,0.12)" : undefined,
                  }}
                />
                <span>
                  {fplManagerId.trim()
                    ? `Manager #${fplManagerId.trim()} linked`
                    : "No manager linked yet"}
                </span>
              </div>
            </div>

            <section className="bg-[#121826] border border-[#1a2333] rounded-[18px] p-[22px_24px]">
              <div className="flex items-baseline justify-between mb-[14px]">
                <span className="text-[#8b97aa] text-[12.5px] tracking-[0.08em] uppercase font-semibold">
                  Team Color
                </span>
              </div>
              <div className="flex gap-2.5 flex-wrap mb-4">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleSetColor(c)}
                    className="w-[30px] h-[30px] rounded-full cursor-pointer transition-transform duration-100 hover:-translate-y-0.5"
                    style={{
                      background: c,
                      border: c.toLowerCase() === color.toLowerCase() ? "2px solid #edf1f7" : "2px solid transparent",
                      boxShadow: c.toLowerCase() === color.toLowerCase()
                        ? "0 0 0 2px #0a0e16, 0 0 0 4px #edf1f7"
                        : undefined,
                    }}
                    title={c}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-[42px] h-[42px] rounded-lg border border-[#222c3e] shrink-0 relative cursor-pointer"
                >
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => handleSetColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="absolute inset-[3px] rounded-[6px] pointer-events-none"
                    style={{ background: color }}
                  />
                </div>
                <input
                  className="flex-1 bg-[#161f30] border border-[#222c3e] text-[#edf1f7] font-mono text-sm px-[14px] py-[11px] rounded-lg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#586278] focus:border-[#4ade80] focus:shadow-[0_0_0_3px_rgba(74,222,128,0.12)]"
                  value={hexInput}
                  maxLength={7}
                  onChange={(e) => {
                    let val = e.target.value.trim();
                    setHexInput(val);
                    if (!val.startsWith("#")) val = `#${val}`;
                    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                      setColor(val);
                    }
                  }}
                />
              </div>
            </section>

            <div className="flex justify-end gap-3">
              <Link href={`/auction/${leagueId}/teams`}>
                <button
                  type="button"
                  className="font-sans text-sm font-semibold px-[22px] py-[11px] rounded-lg bg-transparent border border-[#222c3e] text-[#8b97aa] cursor-pointer hover:border-[#586278] hover:text-[#edf1f7] transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
              </Link>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave().catch(() => {})}
                className="font-sans text-sm font-semibold px-[22px] py-[11px] rounded-lg bg-[#4ade80] text-[#06281a] cursor-pointer disabled:opacity-50 hover:brightness-110 transition-all active:scale-[0.98]"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
