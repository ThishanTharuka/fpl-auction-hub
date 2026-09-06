import { NextResponse } from "next/server";
import { getFixtureBreakdown } from "@/lib/tournament/fixture-breakdown";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; fixtureId: string }> },
) {
  const { fixtureId } = await params;
  if (!fixtureId) {
    return NextResponse.json({ error: "Fixture ID is required." }, { status: 400 });
  }

  const result = await getFixtureBreakdown(fixtureId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const response = NextResponse.json(result);
  response.headers.set(
    "Cache-Control",
    "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  );
  return response;
}
