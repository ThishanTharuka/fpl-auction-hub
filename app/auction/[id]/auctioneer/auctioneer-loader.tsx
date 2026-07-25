import { getFplData } from "@/lib/fpl-data";
import { AuctioneerContent } from "./auctioneer-content";
import type { EnrichedPlayer } from "@/lib/fpl-types";

export async function AuctioneerLoader() {
  const fplData = await getFplData().catch(() => null);
  const players = (fplData?.players ?? []) as EnrichedPlayer[];

  return <AuctioneerContent initialPlayers={players} />;
}
