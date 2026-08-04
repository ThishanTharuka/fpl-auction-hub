import { Suspense } from "react";
import type { Metadata } from "next";
import { SpectateLoader } from "./spectate-loader";
import { SpectateSkeleton } from "./spectate-skeleton";

export const metadata: Metadata = {
  title: "Spectate | FPL Auction Hub",
  description:
    "Watch an FPL auction live as a spectator — follow the bidding, the hammer, and every team's budget in real time.",
};

export default function SpectatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<SpectateSkeleton />}>
      <SpectateLoader params={params} />
    </Suspense>
  );
}
