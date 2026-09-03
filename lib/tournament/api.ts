import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export async function getAuthedSupabase(
  request: Request,
): Promise<
  | { ok: true; supabase: SupabaseClient<Database>; userId: string }
  | { ok: false; response: NextResponse }
> {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;
  if (origin && origin !== expectedOrigin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid origin" }, { status: 403 }),
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  return { ok: true, supabase, userId: user.id };
}