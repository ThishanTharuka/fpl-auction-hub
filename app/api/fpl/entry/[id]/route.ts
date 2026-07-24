import { NextResponse } from "next/server";

const FPL_ENTRY_URL = "https://fantasy.premierleague.com/api/entry";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const entryId = parseInt(id, 10);

  if (isNaN(entryId) || entryId <= 0) {
    return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
  }

  try {
    const res = await fetch(`${FPL_ENTRY_URL}/${entryId}/`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[FPL entry] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
