import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Team Settings | FPL Auction Hub",
  description:
    "Edit your team name, crest, color, and link your FPL manager ID for live matchday points.",
};

export default function TeamEditLayout({ children }: { children: ReactNode }) {
  return children;
}
