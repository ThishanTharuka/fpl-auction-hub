import { NextResponse } from "next/server";
import { syncDailyPrices } from "@/lib/fpl-data";

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;

  const authHeader = request.headers.get("authorization");
  const providedSecret =
    authHeader?.replace(/^Bearer\s+/i, "") ||
    new URL(request.url).searchParams.get("secret");

  return providedSecret === cronSecret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("force") === "true";

  try {
    const result = await syncDailyPrices(force);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("[daily-prices-sync error]", error);
    return NextResponse.json(
      {
        error: "Failed to sync daily prices",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
