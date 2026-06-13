import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { BentoGrid, type BentoItem } from "@/components/ui/bento-grid";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Gavel,
  Layers,
  Shield,
  Users,
} from "lucide-react";

const bentoItems: BentoItem[] = [
  {
    title: "Player Stats",
    description:
      "Browse comprehensive stats, form, ICT index, and pricing for every Premier League player.",
    icon: <BarChart3 className="h-4 w-4 text-[#00e478]" />,
  },
  {
    title: "Index Builder",
    description:
      "Build custom player indices by filtering positions, teams, and stat thresholds.",
    icon: <Layers className="h-4 w-4 text-[#bbc6e2]" />,
  },
  {
    title: "Custom Leagues",
    description:
      "Set your own budget, rules, squad size, and scoring for each league.",
    icon: <Users className="h-4 w-4 text-[#c9e0ff]" />,
  },
  {
    title: "Auctions",
    description:
      "Host real-time player auctions with your league mates. Nominate, bid, and win.",
    icon: <Gavel className="h-4 w-4 text-[#ffb4ab]" />,
    colSpan: 2,
  },
  {
    title: "Squad Management",
    description:
      "Build and manage your squad after the draft. View stats, set lineups, and track performance.",
    icon: <Shield className="h-4 w-4 text-[#afc9ea]" />,
  },
];

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      <section className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-4 text-center">
        <BackgroundPaths />
        <div className="relative z-10 flex flex-col items-center">
          <p className="mb-6 text-xs font-semibold tracking-[0.2em] text-muted-foreground">
            AUCTION PLATFORM
          </p>
          <p className="mb-3 text-4xl font-bold text-foreground sm:text-5xl">
            FPL AUCTION HUB
          </p>
          <p className="mb-8 max-w-lg text-sm text-muted-foreground">
            Create custom fantasy auction leagues with your own budget and
            rules. Host live drafts with your friends.
          </p>
          <div className="flex gap-3">
            <Link
              href="/login?mode=sign_up"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <div className="w-full border-t border-border" />

      <section className="w-full px-4 py-28">
        <p className="mb-12 text-center text-xs font-semibold tracking-[0.2em] text-muted-foreground">
          AUCTION TOOLS
        </p>
        <BentoGrid items={bentoItems} />
      </section>
    </div>
  );
}
