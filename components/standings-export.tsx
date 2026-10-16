"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Camera, Download, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type {
  CompetitionTeamRow,
  StandingRow,
} from "@/lib/tournament/types";

type ExportScope = "both" | "A" | "B";

interface StandingsExportProps {
  competitionName: string;
  sublabel: string;
  standings: StandingRow[];
  teams: CompetitionTeamRow[];
}

function isHexColor(value: string | null | undefined): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value);
}

function zoneColor(index: number): string {
  if (index < 4) return "#00e478";
  if (index < 8) return "#f59e0b";
  return "#ef4444";
}

async function renderPng(node: HTMLElement, fileName: string): Promise<{ dataUrl: string; file: File }> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    backgroundColor: "#061423",
    cacheBust: true,
  });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], fileName, { type: "image/png" });
  return { dataUrl, file };
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function StandingsExport({
  competitionName,
  sublabel,
  standings,
  teams,
}: StandingsExportProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useState<ExportScope>("both");
  const [busy, setBusy] = useState<"png" | "share" | null>(null);

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const groups = (["A", "B"] as const).filter((g) => scope === "both" || scope === g);
  const fileName = `${competitionName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-standings-${scope === "both" ? "a-b" : `group-${scope.toLowerCase()}`}.png`;
  const canNativeShare =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function";

  async function handleDownload() {
    if (!exportRef.current || busy) return;
    setBusy("png");
    try {
      const { dataUrl } = await renderPng(exportRef.current, fileName);
      downloadDataUrl(dataUrl, fileName);
      toast.success("Standings image downloaded.");
    } catch {
      toast.error("Could not render the image. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    if (!exportRef.current || busy) return;
    setBusy("share");
    try {
      const { file } = await renderPng(exportRef.current, fileName);
      if (canNativeShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${competitionName} standings`,
          text: `${competitionName} — Group ${groups.join(" & ")} standings`,
        });
      } else {
        const { dataUrl } = await renderPng(exportRef.current, fileName);
        downloadDataUrl(dataUrl, fileName);
        toast.success("Image downloaded — attach it in WhatsApp to share.");
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

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Camera className="h-3.5 w-3.5" />
          Export as image
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Groups to include"
            className="flex overflow-hidden rounded-md border border-border text-xs"
          >
            {(["both", "A", "B"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                aria-pressed={scope === s}
                className={`px-2.5 py-1.5 font-medium transition-colors ${
                  scope === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {s === "both" ? "A + B" : `Group ${s}`}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={busy !== null}
            className="border-border"
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
            className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
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

      {/* Off-screen render node. Inline hex styles only — Tailwind v4 emits
          oklch() which image rasterizers cannot parse. */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-10000px",
          top: "0",
        }}
      >
        <div
          ref={exportRef}
          style={{
            width: "1200px",
            backgroundColor: "#061423",
            color: "#d6e4f9",
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
            padding: "36px 40px 28px",
          }}
        >
          <div style={{ fontSize: "12px", letterSpacing: "3px", color: "#849585", fontWeight: 700 }}>
            FPL AUCTION HUB
          </div>
          <div style={{ marginTop: "6px", fontSize: "34px", fontWeight: 800, lineHeight: 1.15 }}>
            {competitionName}
          </div>

          <div
            style={{
              marginTop: "24px",
              display: "flex",
              gap: "24px",
              alignItems: "flex-start",
            }}
          >
            {groups.map((g) => (
              <div
                key={g}
                style={{
                  flex: "1",
                  minWidth: "0",
                  backgroundColor: "#0f1c2c",
                  border: "1px solid #3b4b3d",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid #3b4b3d",
                    fontSize: "16px",
                    fontWeight: 700,
                  }}
                >
                  Group {g}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ color: "#849585", fontSize: "12px", textAlign: "left" }}>
                      <th style={{ padding: "10px 8px 10px 20px", fontWeight: 400 }}>#</th>
                      <th style={{ padding: "10px 8px", fontWeight: 400 }}>Team</th>
                      <th style={{ padding: "10px 8px", fontWeight: 400, textAlign: "center" }}>P</th>
                      <th style={{ padding: "10px 8px", fontWeight: 400, textAlign: "center" }}>W</th>
                      <th style={{ padding: "10px 8px", fontWeight: 400, textAlign: "center" }}>D</th>
                      <th style={{ padding: "10px 8px", fontWeight: 400, textAlign: "center" }}>L</th>
                      <th style={{ padding: "10px 8px", fontWeight: 400, textAlign: "center" }}>SD</th>
                      <th style={{ padding: "10px 8px", fontWeight: 400, textAlign: "center" }}>PS</th>
                      <th style={{ padding: "10px 8px", fontWeight: 400, textAlign: "center" }}>PC</th>
                      <th style={{ padding: "10px 20px 10px 8px", fontWeight: 400, textAlign: "right" }}>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings
                      .filter((s) => s.group === g)
                      .map((s, i) => {
                        const team = teamById.get(s.teamId);
                        const dot = isHexColor(team?.color) ? team.color : "#1e2b3b";
                        return (
                          <tr
                            key={s.teamId}
                            style={{ borderTop: "1px solid rgba(59,75,61,0.5)" }}
                          >
                            <td style={{ padding: "10px 8px 10px 16px", color: "#849585" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  width: "3px",
                                  height: "18px",
                                  backgroundColor: zoneColor(i),
                                  borderRadius: "2px",
                                  marginRight: "10px",
                                  verticalAlign: "middle",
                                }}
                              />
                              {i + 1}
                            </td>
                            <td style={{ padding: "10px 8px", fontWeight: 600 }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  width: "24px",
                                  height: "24px",
                                  lineHeight: "24px",
                                  textAlign: "center",
                                  borderRadius: "50%",
                                  backgroundColor: dot,
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  marginRight: "10px",
                                  verticalAlign: "middle",
                                }}
                              >
                                {s.name.charAt(0).toUpperCase()}
                              </span>
                              {s.name}
                            </td>
                            <td style={{ padding: "10px 8px", textAlign: "center", color: "#849585" }}>{s.played}</td>
                            <td style={{ padding: "10px 8px", textAlign: "center" }}>{s.won}</td>
                            <td style={{ padding: "10px 8px", textAlign: "center" }}>{s.drawn}</td>
                            <td style={{ padding: "10px 8px", textAlign: "center" }}>{s.lost}</td>
                            <td style={{ padding: "10px 8px", textAlign: "center" }}>
                              {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                            </td>
                            <td style={{ padding: "10px 8px", textAlign: "center" }}>{s.pointsFor}</td>
                            <td style={{ padding: "10px 8px", textAlign: "center" }}>{s.pointsAgainst}</td>
                            <td style={{ padding: "10px 20px 10px 8px", textAlign: "right", fontWeight: 800, color: "#00e478" }}>
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

          <div
            style={{
              marginTop: "20px",
              display: "flex",
              gap: "20px",
              fontSize: "12px",
              color: "#849585",
            }}
          >
            <span>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#00e478", marginRight: "6px" }} />
              Qualifiers (1-4)
            </span>
            <span>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f59e0b", marginRight: "6px" }} />
              Eliminators (5-8)
            </span>
            <span>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444", marginRight: "6px" }} />
              Out (9-10)
            </span>
          </div>

          <div
            style={{
              marginTop: "16px",
              paddingTop: "14px",
              borderTop: "1px solid #3b4b3d",
              fontSize: "12px",
              color: "#849585",
            }}
          >
            {sublabel} · {generatedLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
