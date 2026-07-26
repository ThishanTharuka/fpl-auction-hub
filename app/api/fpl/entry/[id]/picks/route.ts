import { NextResponse } from "next/server";

const FPL_PICKS_URL = "https://fantasy.premierleague.com/api/entry";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const entryId = parseInt(id, 10);

  if (isNaN(entryId) || entryId <= 0) {
    return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
  }

  const { searchParams } = new URL(_req.url);
  const event = searchParams.get("event");

  if (!event || isNaN(parseInt(event, 10))) {
    return NextResponse.json({ error: "Missing or invalid event query param" }, { status: 400 });
  }

  try {
    const res = await fetch(`${FPL_PICKS_URL}/${entryId}/event/${event}/picks/`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Picks not found" }, { status: 404 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[FPL picks] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
