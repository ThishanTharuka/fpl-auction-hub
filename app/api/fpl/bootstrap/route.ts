import { type NextRequest, NextResponse } from "next/server";
import { getFplData, fetchAndCacheFplData } from "@/lib/fpl-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const refresh = request.nextUrl.searchParams.get("refresh") === "true";
    const data = refresh ? await fetchAndCacheFplData() : await getFplData();
    const response = NextResponse.json(data);
    if (refresh) {
      response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    } else {
      response.headers.set("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=60");
    }
    return response;
  } catch (err) {
    console.error("[FPL bootstrap] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
