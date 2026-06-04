import { PlayersTable } from "./players-table";
import { getFplData } from "@/lib/fpl-data";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  try {
    const data = await getFplData();
    return <PlayersTable players={data.players} />;
  } catch {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-12 text-center">
        <p className="text-red-400 text-sm">
          Failed to load player data. Please try again.
        </p>
      </div>
    );
  }
}
