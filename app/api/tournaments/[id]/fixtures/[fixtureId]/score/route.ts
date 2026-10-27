import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getAuthedSupabase } from "@/lib/tournament/api";

export const dynamic = "force-dynamic";

const MAX_POINTS = 300;

function toScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 0 || value > MAX_POINTS) return null;
  return value;
}

/**
 * Authenticates the caller and confirms they own the tournament, so only the
 * tournament admin can pin or clear a score override.
 */
async function resolveOwner(
  request: Request,
  competitionId: string,
): Promise<
  | { ok: true; supabase: SupabaseClient<Database>; userId: string }
  | { ok: false; response: NextResponse }
> {
  const authed = await getAuthedSupabase(request);
  if (!authed.ok) return authed;

  const { data: comp, error } = await authed.supabase
    .from("competitions")
    .select("created_by")
    .eq("id", competitionId)
    .single();

  if (error || !comp) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Tournament not found." },
        { status: 404 },
      ),
    };
  }
  if (comp.created_by !== authed.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  return { ok: true, supabase: authed.supabase, userId: authed.userId };
}

/**
 * Pins (POST) or clears (DELETE) an admin score override on a fixture.
 * Auto-score never overwrites an overridden side, so a corrected score sticks
 * across future scoring runs.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; fixtureId: string }> },
) {
  const { id, fixtureId } = await params;

  const owner = await resolveOwner(request, id);
  if (!owner.ok) return owner.response;

  const body = (await request.json().catch(() => null)) as {
    homePoints?: unknown;
    awayPoints?: unknown;
    reason?: unknown;
  } | null;

  const homePoints = toScore(body?.homePoints);
  const awayPoints = toScore(body?.awayPoints);
  if (homePoints === null || awayPoints === null) {
    return NextResponse.json(
      { error: `Scores must be whole numbers between 0 and ${MAX_POINTS}.` },
      { status: 400 },
    );
  }

  const reason =
    typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!reason) {
    return NextResponse.json(
      { error: "A reason is required for a score override." },
      { status: 400 },
    );
  }

  const { data, error } = await owner.supabase
    .from("competition_fixtures")
    .update({
      home_points: homePoints,
      away_points: awayPoints,
      home_points_override: homePoints,
      away_points_override: awayPoints,
      override_reason: reason,
      overridden_by: owner.userId,
      overridden_at: new Date().toISOString(),
      status: "scored",
    })
    .eq("id", fixtureId)
    .eq("competition_id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[fixture score override] update failed", error);
    return NextResponse.json(
      { error: "Could not save the override." },
      { status: 500 },
    );
  }

  return NextResponse.json({ fixture: data });
}

/** Removes the override so the next auto-score recomputes from FPL. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; fixtureId: string }> },
) {
  const { id, fixtureId } = await params;

  const owner = await resolveOwner(request, id);
  if (!owner.ok) return owner.response;

  const { data, error } = await owner.supabase
    .from("competition_fixtures")
    .update({
      home_points_override: null,
      away_points_override: null,
      override_reason: null,
      overridden_by: null,
      overridden_at: null,
    })
    .eq("id", fixtureId)
    .eq("competition_id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[fixture score override] clear failed", error);
    return NextResponse.json(
      { error: "Could not clear the override." },
      { status: 500 },
    );
  }

  return NextResponse.json({ fixture: data });
}
