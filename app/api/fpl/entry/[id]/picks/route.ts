import { NextResponse } from "next/server";

const FPL_PICKS_URL = "https://fantasy.premierleague.com/api/entry";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
  }
  const entryId = Number(id);

  if (entryId <= 0 || !Number.isSafeInteger(entryId)) {
    return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
  }

  const { searchParams } = new URL(_req.url);
  const event = searchParams.get("event");

  if (!event || !/^\d+$/.test(event)) {
    return NextResponse.json({ error: "Missing or invalid event query param" }, { status: 400 });
  }

  const eventId = Number(event);
  if (eventId < 1 || eventId > 38) {
    return NextResponse.json({ error: "Event must be between 1 and 38" }, { status: 400 });
  }

  try {
    const res = await fetch(`${FPL_PICKS_URL}/${entryId}/event/${eventId}/picks/`, {
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
