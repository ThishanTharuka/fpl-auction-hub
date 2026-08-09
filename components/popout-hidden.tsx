"use client";

import { useSearchParams } from "next/navigation";

// Hides site chrome (Nav/Footer) when the page was opened as a pop-out chat
// window via ?popout=1.
export function PopoutHidden({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();

  if (searchParams.get("popout") === "1") return null;
  return <>{children}</>;
}
