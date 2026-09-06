import { NextResponse } from "next/server";
import { getFplGameweekInfo } from "@/lib/fpl-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getFplGameweekInfo();
    const response = NextResponse.json(data);
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    );
    return response;
  } catch (err) {
    console.error("[FPL gameweek] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
