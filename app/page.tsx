import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Custom Leagues",
    description:
      "Set your own budget, rules, squad size, and scoring for each league.",
  },
  {
    title: "Live Auctions",
    description:
      "Host real-time player auctions with your league mates. Nominate, bid, and win.",
  },
  {
    title: "Squad Management",
    description:
      "Build and manage your squad after the draft. View stats, set lineups, and track performance.",
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
        <div className="mx-auto max-w-5xl">
          <p className="mb-12 text-center text-xs font-semibold tracking-[0.2em] text-muted-foreground">
            AUCTION TOOLS
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border p-5 text-center"
                style={{
                  background: "#0a1828",
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              >
                <h3 className="mb-2 text-base font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="w-full border-t border-border" />

      <section className="w-full px-4 py-28 text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
          Ready to get started?
        </h2>
        <p className="mb-8 text-sm text-muted-foreground">
          Create your league and start the auction draft today.
        </p>
        <Link
          href="/login?mode=sign_up"
          className={cn(buttonVariants({ size: "lg" }))}
        >
          Get Started
        </Link>
      </section>
    </div>
  );
}
