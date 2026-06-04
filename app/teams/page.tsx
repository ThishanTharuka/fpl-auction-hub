import { TeamsClient } from "./teams-client";
import { getFplData } from "@/lib/fpl-data";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const data = await getFplData().catch(() => null);
  if (!data) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-12 text-center">
        <p className="text-red-400 text-sm">
          Failed to load player data. Please try again.
        </p>
      </div>
    );
  }
  return <TeamsClient players={data.players} />;
}
