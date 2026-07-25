import { Suspense } from "react";
import { AuctioneerLoader } from "./auctioneer-loader";

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
