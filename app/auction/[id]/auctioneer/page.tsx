import { Suspense } from "react";
import type { Metadata } from "next";
import { AuctioneerLoader } from "./auctioneer-loader";
import { AuctioneerSkeleton } from "./auctioneer-skeleton";

export const metadata: Metadata = {
  title: "Auctioneer Dashboard | FPL Auction Hub",
  description:
    "Run your FPL auction live — nominate players, manage the queue, and control the bidding flow.",
};

export default function AuctioneerPage() {
  return (
    <Suspense fallback={<AuctioneerSkeleton />}>
      <AuctioneerLoader />
    </Suspense>
  );
}
