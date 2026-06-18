import { redirect } from "next/navigation";
import TournamentWizard from "@/components/tournament/tournament-wizard";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function TournamentNewPage({
  params,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, created_by")
    .eq("id", id)
    .single();

  if (!league) {
    return <div className="flex items-center justify-center h-64 text-red-400">Not found.</div>;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || league.created_by !== user.id) {
    redirect(`/auction/${id}`);
  }

  const { data: participants } = await supabase
    .from("participants")
    .select("id, name, color")
    .eq("league_id", id);

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-4 sm:py-6 lg:py-10">
      <TournamentWizard
        leagueId={id}
        teamCount={participants?.length ?? 0}
        participants={participants as { id: string; name: string; color: string | null }[]}
      />
    </div>
  );
}
