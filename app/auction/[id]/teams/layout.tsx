import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Team Squads | FPL Auction Hub",
  description:
    "View all team squads in your auction league — players bought, budget remaining, and squad composition.",
};

export default function TeamsLayout({ children }: { children: ReactNode }) {
  return children;
}
