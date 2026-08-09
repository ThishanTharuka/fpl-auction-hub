import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ChatWindow } from "@/components/auction-chat/chat-window";
import type { ChatParticipant } from "@/components/auction-chat/chat-message-list";

export type ChatLeague = {
  id: string;
  name: string;
  created_by: string | null;
  allow_spectator_chat: boolean;
};

type ChatMember = {
  participant_id: string;
};

export async function ChatLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [leagueRes, participantsRes] = await Promise.all([
    supabase
      .from("leagues")
      .select("id,name,created_by,allow_spectator_chat")
      .eq("id", id)
      .single(),
    supabase
      .from("participants")
      .select("id,name,color,avatar_url")
      .eq("league_id", id)
      .order("name"),
  ]);

  if (!leagueRes.data) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        Auction not found.
      </div>
    );
  }

  const league = leagueRes.data as unknown as ChatLeague;
  const participants = (participantsRes.data ?? []) as ChatParticipant[];

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return <AccessDenied />;
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const display =
    (typeof meta?.display_name === "string" ? meta.display_name : undefined) ??
    (typeof meta?.["full_name"] === "string" ? meta["full_name"] : undefined) ??
    user.email ??
    "Unknown";

  let userName: string;
  let participantId: string | null = null;

  if (league.created_by === user.id) {
    userName = `Auctioneer - ${display}`;
  } else {
    const { data: membership } = await supabase
      .from("team_members")
      .select("participant_id")
      .eq("league_id", id)
      .eq("user_id", user.id)
      .eq("status", "approved")
      .single();

    if (membership) {
      const member = membership as unknown as ChatMember;
      const team = participants.find((p) => p.id === member.participant_id);
      userName = team ? `${team.name} - ${display}` : `Team - ${display}`;
      participantId = member.participant_id;
    } else if (league.allow_spectator_chat) {
      userName = `Viewer - ${display}`;
    } else {
      return <AccessDenied />;
    }
  }

  return (
    <ChatWindow
      leagueId={id}
      leagueName={league.name}
      userId={user.id}
      userName={userName}
      participantId={participantId}
      participants={participants}
      auctioneerId={league.created_by}
    />
  );
}

function AccessDenied() {
  return (
    <div className="flex items-center justify-center h-64 text-[#849585] text-sm">
      You don&apos;t have access to this chat.
    </div>
  );
}
