import { Suspense } from "react";
import { LobbyLoader } from "./lobby-loader";
import { LobbySkeleton } from "./lobby-skeleton";

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
