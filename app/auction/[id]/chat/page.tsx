import { Suspense } from "react";
import type { Metadata } from "next";
import { ChatLoader } from "./chat-loader";
import { ChatSkeleton } from "./chat-skeleton";

export const metadata: Metadata = {
  title: "Auction Chat | FPL Auction Hub",
  description: "Auction chat window",
};

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ChatLoader params={params} />
    </Suspense>
  );
}
