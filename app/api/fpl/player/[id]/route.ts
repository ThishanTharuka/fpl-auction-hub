import { NextResponse } from "next/server";
import type { FPLElementSummary } from "@/lib/fpl-types";

const FPL_ELEMENT_SUMMARY_URL =
  "https://fantasy.premierleague.com/api/element-summary";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const playerId = parseInt(id, 10);

  if (isNaN(playerId) || playerId <= 0) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }

  try {
    const res = await fetch(`${FPL_ELEMENT_SUMMARY_URL}/${playerId}/`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const data: FPLElementSummary = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[FPL element-summary] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
