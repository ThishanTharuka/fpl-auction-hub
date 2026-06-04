import { NextResponse } from "next/server";
import { getFplData } from "@/lib/fpl-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getFplData();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[FPL bootstrap] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
