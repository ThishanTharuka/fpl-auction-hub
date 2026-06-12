import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;
  if (origin && origin !== expectedOrigin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await supabase.rpc("delete_user");

  if (error) {
    console.error("[account delete] delete_user RPC failed:", error);
    return NextResponse.json(
      { error: "Failed to delete account." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
