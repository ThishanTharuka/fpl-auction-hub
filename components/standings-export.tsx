"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { toPng } from "html-to-image";
import { Camera, Download, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { teamInitials } from "@/components/team-avatar";
import type {
  CompetitionTeamRow,
  StandingRow,
} from "@/lib/tournament/types";

type ExportScope = "both" | "A" | "B";

interface StandingsExportProps {
  competitionName: string;
  gameweekLabel: string;
  standings: StandingRow[];
  teams: CompetitionTeamRow[];
}

const AVATAR_PX = 96;
const CARD_BG = "#0f1c2c";
const PAGE_BG = "#061423";
const INK = "#d6e4f9";
const DIM = "#849585";
const FAINT = "#b9cbb9";
const ACCENT = "#00e478";
const HAIRLINE = "#3b4b3d";
const HAIRLINE_SOFT = "rgba(59,75,61,0.5)";
const AVATAR_BG = "#132030";

function isSafeImageUrl(url: string | null | undefined): url is string {
  if (typeof url !== "string" || url.length === 0) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:" ||
      parsed.protocol === "blob:"
    );
  } catch {
    return false;
  }
}

function isHexColor(value: string | null | undefined): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value);
}

function zoneColor(index: number): string {
  if (index < 4) return ACCENT;
  if (index < 8) return "#f59e0b";
  return "#ef4444";
}

/** Square, centre-cropped data URL — keeps the payload small and inline-safe. */
const avatarCache = new Map<string, string | null>();

async function toSquareDataUrl(url: string): Promise<string | null> {
  const cached = avatarCache.get(url);
  if (cached !== undefined) return cached;

  let result: string | null = null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) {
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_PX;
      canvas.height = AVATAR_PX;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const scale = Math.max(AVATAR_PX / bitmap.width, AVATAR_PX / bitmap.height);
        const w = bitmap.width * scale;
        const h = bitmap.height * scale;
        ctx.drawImage(bitmap, (AVATAR_PX - w) / 2, (AVATAR_PX - h) / 2, w, h);
        result = canvas.toDataURL("image/png");
      }
      bitmap.close();
    }
  } catch {
    result = null;
  }

  avatarCache.set(url, result);
  return result;
}

async function resolveAvatars(
  teams: CompetitionTeamRow[],
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    teams
      .map((t) => [t.id, t.avatar_url] as const)
      .filter((entry): entry is readonly [string, string] => isSafeImageUrl(entry[1]))
      .map(async ([id, url]) => [id, await toSquareDataUrl(url)] as const),
  );
  const map: Record<string, string> = {};
  for (const [id, dataUrl] of entries) {
    if (dataUrl) map[id] = dataUrl;
  }
  return map;
}

function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll("img"));
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  ).then(() => undefined);
}

async function renderPng(
  node: HTMLElement,
  fileName: string,
): Promise<{ dataUrl: string; file: File }> {
  await waitForImages(node);
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    backgroundColor: PAGE_BG,
  });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return { dataUrl, file: new File([blob], fileName, { type: "image/png" }) };
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function AvatarCell({
  name,
  color,
  dataUrl,
}: {
  name: string;
  color: string | null | undefined;
  dataUrl: string | undefined;
}) {
  const ring = isHexColor(color) ? color : HAIRLINE;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <span
        style={{
          flex: "0 0 auto",
          width: "26px",
          height: "26px",
          borderRadius: "9999px",
          border: `1px solid ${ring}`,
          backgroundColor: AVATAR_BG,
          overflow: "hidden",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- rasterized off-screen, not served by Next
          <img
            src={dataUrl}
            alt={`${name} avatar`}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: FAINT,
              letterSpacing: "0.02em",
            }}
          >
            {teamInitials(name)}
          </span>
        )}
      </span>
      <span>{name}</span>
    </span>
  );
}

export function StandingsExport({
  competitionName,
  gameweekLabel,
  standings,
  teams,
}: StandingsExportProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useState<ExportScope>("both");
  const [busy, setBusy] = useState<"png" | "share" | null>(null);
  const [open, setOpen] = useState(false);
  const [avatarData, setAvatarData] = useState<Record<string, string>>({});

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const groups = (["A", "B"] as const).filter((g) => scope === "both" || scope === g);
  const slug = competitionName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const fileName = `${slug}-standings-${scope === "both" ? "a-b" : `group-${scope.toLowerCase()}`}.png`;
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.canShare === "function";

  // Warm the avatar cache so the click path rasterizes immediately.
  useEffect(() => {
    let cancelled = false;
    resolveAvatars(teams).then((map) => {
      if (!cancelled && Object.keys(map).length > 0) {
        setAvatarData((prev) => ({ ...prev, ...map }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [teams]);

  /** Guarantees every resolved avatar is committed to the DOM before rasterizing. */
  function commitAvatars(map: Record<string, string>) {
    if (Object.keys(map).length === 0) return;
    flushSync(() => {
      setAvatarData((prev) => {
        const next = { ...prev };
        for (const [id, url] of Object.entries(map)) next[id] = url;
        return next;
      });
    });
  }

  async function capture() {
    if (!exportRef.current) throw new Error("export node missing");
    commitAvatars(await resolveAvatars(teams));
    return renderPng(exportRef.current, fileName);
  }

  async function handleDownload() {
    if (busy) return;
    setBusy("png");
    try {
      const { dataUrl } = await capture();
      downloadDataUrl(dataUrl, fileName);
      toast.success("Standings image downloaded.");
      setOpen(false);
    } catch {
      toast.error("Could not render the image. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    if (busy) return;
    setBusy("share");
    try {
      const { file, dataUrl } = await capture();
      if (canNativeShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${competitionName} standings`,
          text: `${competitionName} — Group ${groups.join(" & ")} standings`,
        });
        setOpen(false);
      } else {
        downloadDataUrl(dataUrl, fileName);
        toast.success("Image downloaded — attach it in WhatsApp to share.");
        setOpen(false);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User dismissed the share sheet — not an error.
      } else {
        toast.error("Could not share the image. Try again.");
      }
    } finally {
      setBusy(null);
    }
  }

  const generatedLabel = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const thStyle: React.CSSProperties = {
    padding: "10px 8px",
    fontWeight: 400,
    fontSize: "12px",
    textAlign: "center",
  };

  return (
    <div className="flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              size="sm"
              variant="outline"
              className="border-[#3b4b3d] text-[#849585] hover:bg-[#132030] hover:text-[#d6e4f9] aria-expanded:bg-[#132030] aria-expanded:text-[#d6e4f9] max-sm:size-8 max-sm:p-0"
            />
          }
        >
          <Camera className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only">Export as image</span>
        </PopoverTrigger>
        <PopoverContent className="border-[#3b4b3d] bg-[#0f1c2c] text-[#d6e4f9]">
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-medium tracking-wide text-[#849585] uppercase">
                Include
              </p>
              <div
                role="group"
                aria-label="Groups to include"
                className="flex overflow-hidden rounded-md border border-[#3b4b3d] text-xs"
              >
                {(["both", "A", "B"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    aria-pressed={scope === s}
                    className={`flex-1 px-2 py-1.5 font-medium transition-colors ${
                      scope === s
                        ? "bg-[#00e478] text-[#003919]"
                        : "text-[#849585] hover:bg-[#132030] hover:text-[#d6e4f9]"
                    }`}
                  >
                    {s === "both" ? "A + B" : `Group ${s}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                disabled={busy !== null}
                className="flex-1 border-[#3b4b3d] text-[#d6e4f9] hover:bg-[#132030]"
              >
                {busy === "png" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                PNG
              </Button>
              <Button
                size="sm"
                onClick={handleShare}
                disabled={busy !== null}
                className="flex-1 bg-[#00e478] font-semibold text-[#003919] hover:bg-[#00e478]/90"
              >
                {busy === "share" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Share2 className="h-3.5 w-3.5" />
                )}
                Share
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Off-screen render node. Inline hex styles only — Tailwind v4 emits
          oklch() which image rasterizers cannot parse. */}
      <div aria-hidden="true" style={{ position: "fixed", left: "-10000px", top: 0 }}>
        <div
          ref={exportRef}
          style={{
            width: "1200px",
            backgroundColor: PAGE_BG,
            color: INK,
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
            padding: "36px 40px 28px",
          }}
        >
          <div style={{ fontSize: "12px", letterSpacing: "3px", color: DIM, fontWeight: 700 }}>
            FPL AUCTION HUB
          </div>
          <div style={{ marginTop: "6px", fontSize: "34px", fontWeight: 800, lineHeight: 1.15 }}>
            {competitionName}
          </div>

          <div style={{ marginTop: "24px", display: "flex", gap: "24px", alignItems: "stretch" }}>
            {groups.map((g) => (
              <div
                key={g}
                style={{
                  flex: "1",
                  minWidth: 0,
                  backgroundColor: CARD_BG,
                  border: `1px solid ${HAIRLINE}`,
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: `1px solid ${HAIRLINE}`,
                    fontSize: "16px",
                    fontWeight: 700,
                  }}
                >
                  Group {g}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ color: DIM, textAlign: "left" }}>
                      <th style={{ ...thStyle, padding: "10px 8px 10px 20px", textAlign: "left" }}>#</th>
                      <th style={{ ...thStyle, textAlign: "left" }}>Team</th>
                      <th style={thStyle}>P</th>
                      <th style={thStyle}>W</th>
                      <th style={thStyle}>D</th>
                      <th style={thStyle}>L</th>
                      <th style={thStyle}>SD</th>
                      <th style={thStyle}>PS</th>
                      <th style={thStyle}>PC</th>
                      <th style={{ ...thStyle, padding: "10px 20px 10px 8px", textAlign: "right" }}>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings
                      .filter((s) => s.group === g)
                      .map((s, i) => {
                        const team = teamById.get(s.teamId);
                        return (
                          <tr key={s.teamId} style={{ borderTop: `1px solid ${HAIRLINE_SOFT}` }}>
                            <td
                              style={{
                                position: "relative",
                                padding: "9px 8px 9px 16px",
                                color: DIM,
                              }}
                            >
                              <span
                                style={{
                                  position: "absolute",
                                  left: 0,
                                  top: "1px",
                                  bottom: "1px",
                                  width: "3px",
                                  backgroundColor: zoneColor(i),
                                  clipPath: "polygon(0 0, 100% 14%, 100% 86%, 0 100%)",
                                }}
                              />
                              {i + 1}
                            </td>
                            <td style={{ padding: "9px 8px", fontWeight: 600, whiteSpace: "nowrap" }}>
                              <AvatarCell
                                name={s.name}
                                color={team?.color}
                                dataUrl={avatarData[s.teamId]}
                              />
                            </td>
                            <td style={{ padding: "9px 8px", textAlign: "center", color: DIM }}>
                              {s.played}
                            </td>
                            <td style={{ padding: "9px 8px", textAlign: "center" }}>{s.won}</td>
                            <td style={{ padding: "9px 8px", textAlign: "center" }}>{s.drawn}</td>
                            <td style={{ padding: "9px 8px", textAlign: "center" }}>{s.lost}</td>
                            <td style={{ padding: "9px 8px", textAlign: "center" }}>
                              {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                            </td>
                            <td style={{ padding: "9px 8px", textAlign: "center" }}>{s.pointsFor}</td>
                            <td style={{ padding: "9px 8px", textAlign: "center" }}>
                              {s.pointsAgainst}
                            </td>
                            <td
                              style={{
                                padding: "9px 20px 9px 8px",
                                textAlign: "right",
                                fontWeight: 800,
                                color: ACCENT,
                              }}
                            >
                              {s.points}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "20px", display: "flex", gap: "20px", fontSize: "12px", color: DIM }}>
            {[
              { label: "Qualifiers (1-4)", color: ACCENT },
              { label: "Eliminators (5-8)", color: "#f59e0b" },
              { label: "Out (9-10)", color: "#ef4444" },
            ].map((legend) => (
              <span key={legend.label}>
                <span
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "9999px",
                    backgroundColor: legend.color,
                    marginRight: "6px",
                  }}
                />
                {legend.label}
              </span>
            ))}
          </div>

          <div
            style={{
              marginTop: "16px",
              paddingTop: "14px",
              borderTop: `1px solid ${HAIRLINE}`,
              fontSize: "12px",
              color: DIM,
            }}
          >
            {gameweekLabel} &middot; scored on official FPL gameweek points &middot;{" "}
            {generatedLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
