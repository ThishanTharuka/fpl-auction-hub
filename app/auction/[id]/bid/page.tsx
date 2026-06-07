import { Suspense } from "react";
import { BidLoader } from "./bid-loader";
import { BidSkeleton } from "./bid-skeleton";

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
