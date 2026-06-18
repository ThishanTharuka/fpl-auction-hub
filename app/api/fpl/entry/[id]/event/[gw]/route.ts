import { NextResponse } from "next/server";

const FPL_ENTRY_URL = "https://fantasy.premierleague.com/api/entry";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; gw: string }> },
) {
  const { id, gw } = await params;
  const entryId = parseInt(id, 10);
  const eventId = parseInt(gw, 10);

  if (isNaN(entryId) || entryId <= 0) {
    return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
  }

  if (isNaN(eventId) || eventId <= 0 || eventId > 38) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${FPL_ENTRY_URL}/${entryId}/event/${eventId}/picks/`,
      { headers: HEADERS, next: { revalidate: 3600 } },
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Event data not found" }, { status: 404 });
    }

    const data = (await res.json()) as {
      entry_history?: { points?: number; total_points?: number };
    };

    return NextResponse.json({
      points: data.entry_history?.points ?? 0,
      totalPoints: data.entry_history?.total_points ?? 0,
    });
  } catch (err) {
    console.error("[FPL entry event] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
