import { Suspense } from "react";
import type { Metadata } from "next";
import { LobbyLoader } from "./lobby-loader";
import { LobbySkeleton } from "./lobby-skeleton";

export const metadata: Metadata = {
  title: "Auction Lobby | FPL Auction Hub",
  description:
    "View auction status, participants, and upcoming nominations. Manage your auction room from the lobby.",
};

export default function AuctionLobbyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<LobbySkeleton />}>
      <LobbyLoader params={params} />
    </Suspense>
  );
}
