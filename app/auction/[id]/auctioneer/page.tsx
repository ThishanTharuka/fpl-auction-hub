import { Suspense } from "react";
import type { Metadata } from "next";
import { AuctioneerLoader } from "./auctioneer-loader";

export const metadata: Metadata = {
  title: "Auctioneer Dashboard | FPL Auction Hub",
  description:
    "Run your FPL auction live — nominate players, manage the queue, and control the bidding flow.",
};

function AuctioneerSkeleton() {
  return (
    <div className="flex items-center justify-center h-64 text-[#849585]">
      Loading…
    </div>
  );
}

export default function AuctioneerPage() {
  return (
    <Suspense fallback={<AuctioneerSkeleton />}>
      <AuctioneerLoader />
    </Suspense>
  );
}
