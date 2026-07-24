import { type NextRequest, NextResponse } from "next/server";
import { getFplData, fetchAndCacheFplData } from "@/lib/fpl-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const refresh = request.nextUrl.searchParams.get("refresh") === "true";
    const data = refresh ? await fetchAndCacheFplData() : await getFplData();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[FPL bootstrap] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
