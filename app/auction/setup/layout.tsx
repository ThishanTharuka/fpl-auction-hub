import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "New Auction | FPL Auction Hub",
  description:
    "Set up a new FPL auction league — configure rules, team names, budgets, and starting prices.",
};

export default function SetupLayout({ children }: { children: ReactNode }) {
  return children;
}
