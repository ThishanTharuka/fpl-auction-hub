import { Suspense } from "react";
import type { Metadata } from "next";
import { BidLoader } from "./bid-loader";
import { BidSkeleton } from "./bid-skeleton";

export const metadata: Metadata = {
  title: "Bid | FPL Auction Hub",
  description:
    "Place bids on nominated players in real time. Track the auction timer and manage your budget.",
};

export default function BidPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<BidSkeleton />}>
      <BidLoader params={params} />
    </Suspense>
  );
}
