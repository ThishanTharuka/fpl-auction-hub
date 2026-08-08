import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import Aurora from "@/components/ui/aurora";
import { BentoGrid, type BentoItem } from "@/components/ui/bento-grid";
import { cn } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase-server";
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
    visual: (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 rounded-md bg-[#061423] p-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-yellow-500/20 text-[9px] font-medium text-yellow-400">
            GKP
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-medium text-[#d6e4f9]">Pickford</p>
            <p className="text-[9px] text-[#b9cbb9]">EVE</p>
          </div>
          <span className="font-mono text-[11px] text-[#00d166]">&pound;5.0m</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "Pts", value: "124", color: "#d6e4f9" },
            { label: "PPG", value: "4.1", color: "#d6e4f9" },
            { label: "Form", value: "7.8", color: "#00e478" },
            { label: "ICT", value: "14.2", color: "#00e478" },
          ].map((stat) => (
            <div key={stat.label} className="rounded bg-[#132030] p-1.5">
              <p className="text-[8px] uppercase tracking-wider text-[#849585]">
                {stat.label}
              </p>
              <p
                className="font-mono text-[11px] font-semibold"
                style={{ color: stat.color }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {["800+ players", "GW stats", "FDR"].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-[#849585]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Index Builder",
    description:
      "Build custom player indices by filtering positions, teams, and stat thresholds.",
    icon: <Layers className="h-4 w-4 text-[#bbc6e2]" />,
    visual: (
      <div className="space-y-2.5">
        {[
          { label: "PPG", value: 80 },
          { label: "xG", value: 60 },
          { label: "Form", value: 50 },
          { label: "FDR", value: 30 },
        ].map((slider) => (
          <div key={slider.label} className="flex items-center gap-2">
            <span className="w-8 text-[10px] text-[#b9cbb9]">
              {slider.label}
            </span>
            <div className="relative flex-1">
              <div className="h-1 rounded-full bg-[#1e2b3b]">
                <div
                  className="h-full rounded-full bg-[#00e478]"
                  style={{ width: `${slider.value}%` }}
                />
              </div>
              <div
                className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00e478]"
                style={{ left: `${slider.value}%` }}
              />
            </div>
            <span className="w-8 text-right font-mono text-[10px] text-[#00e478]">
              {slider.value}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 rounded bg-[#061423] px-2 py-1.5">
          <span className="w-4 font-mono text-[9px] text-[#849585]">01</span>
          <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/20 text-[8px] text-blue-400">
            MID
          </div>
          <span className="flex-1 text-[10px] font-medium text-[#d6e4f9]">
            Salah
          </span>
          <span className="font-mono text-[10px] font-bold text-[#00e478]">
            98.5
          </span>
        </div>
        <div className="flex items-center gap-2 rounded bg-[#0a1828] px-2 py-1.5">
          <span className="w-4 font-mono text-[9px] text-[#849585]">02</span>
          <div className="flex h-5 w-5 items-center justify-center rounded bg-red-500/20 text-[8px] text-red-400">
            FWD
          </div>
          <span className="flex-1 text-[10px] font-medium text-[#d6e4f9]">
            Haaland
          </span>
          <span className="font-mono text-[10px] font-bold text-[#00e478]">
            97.1
          </span>
        </div>
      </div>
    ),
  },
  {
    title: "Custom Leagues",
    description:
      "Set your own budget, rules, squad size, and scoring for each league.",
    icon: <Users className="h-4 w-4 text-[#c9e0ff]" />,
    visual: (
      <div className="space-y-2 rounded-md border border-[#3b4b3d] bg-[#0f1c2c] p-2.5">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-[#849585]">
          League Settings
        </p>
        <div className="space-y-1.5">
          {[
            { label: "Budget", value: "£200m" },
            { label: "Squad Size", value: "15" },
            { label: "Teams", value: "6" },
            { label: "Increment", value: "£0.5m" },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between rounded bg-[#132030] px-2 py-1"
            >
              <span className="text-[10px] text-[#849585]">{row.label}</span>
              <span className="text-[10px] font-medium text-[#d6e4f9]">
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { bg: "#00e478", l: "T" },
            { bg: "#3b82f6", l: "J" },
            { bg: "#a78bfa", l: "M" },
            { bg: "#fb923c", l: "S" },
          ].map((a, i) => (
            <div
              key={i}
              className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-medium text-white"
              style={{ backgroundColor: a.bg }}
            >
              {a.l}
            </div>
          ))}
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1e3a2f] text-[8px] text-[#00d166]">
            +2
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Live Auctions",
    description:
      "Host real-time player auctions with your league mates. Nominate, bid, and win.",
    icon: <Gavel className="h-4 w-4 text-[#ffb4ab]" />,
    colSpan: 2,
    visual: (
      <div className="space-y-2.5 rounded-md border border-[#3b4b3d] bg-[#0f1c2c] p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-red-500/20 text-[10px] font-bold text-red-400">
            H
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#d6e4f9]">Haaland</p>
            <p className="text-[9px] text-[#b9cbb9]">MCI &middot; FWD</p>
          </div>
          <span className="ml-auto font-mono text-[14px] font-bold text-[#00d166]">
            &pound;13.5m
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-0.5 rounded-full bg-[#1e2b3b]">
            <div className="h-full w-[60%] rounded-full bg-[#00d166]" />
          </div>
          <span className="font-mono text-[11px] font-bold text-[#d6e4f9]">
            18s
          </span>
        </div>
        <div className="rounded-lg bg-[#132030] p-2.5 text-center">
          <p className="text-[9px] text-[#849585]">Current Bid</p>
          <p className="font-mono text-[16px] font-bold text-[#00e478]">
            &pound;13.5m
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="rounded border border-[#00d166]/30 bg-[#00d166]/[0.06] px-1.5 py-0.5 text-[9px] text-[#00d166]">
            KRAPOSTAS FC
          </span>
          {["FPL MASTERS", "LEHMANN", "+3"].map((chip) => (
            <span
              key={chip}
              className="rounded border border-[#3b4b3d] px-1.5 py-0.5 text-[9px] text-[#b9cbb9]"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Squad Hub",
    description:
      "Build and manage your squad after the draft. View stats, set lineups, and track performance.",
    icon: <Shield className="h-4 w-4 text-[#afc9ea]" />,
    visual: (
      <div className="space-y-1.5">
        <div className="rounded-md bg-[#1a5c35] p-2">
          <div className="mb-0.5 flex justify-center gap-1">
            {[{ c: "#c05a00", l: "P" }].map((p, i) => (
              <div
                key={i}
                className="flex h-5 w-5 items-center justify-center rounded-full text-[7px] font-medium text-white"
                style={{ backgroundColor: p.c }}
              >
                {p.l}
              </div>
            ))}
          </div>
          <div className="mb-0.5 flex justify-center gap-1">
            {[
              { c: "#0058c0", l: "A" },
              { c: "#0058c0", l: "V" },
              { c: "#0058c0", l: "G" },
              { c: "#0058c0", l: "R" },
            ].map((p, i) => (
              <div
                key={i}
                className="flex h-5 w-5 items-center justify-center rounded-full text-[7px] font-medium text-white"
                style={{ backgroundColor: p.c }}
              >
                {p.l}
              </div>
            ))}
          </div>
          <div className="mb-0.5 flex justify-center gap-1">
            {[
              { c: "#6a00c0", l: "S" },
              { c: "#6a00c0", l: "O" },
              { c: "#6a00c0", l: "R" },
            ].map((p, i) => (
              <div
                key={i}
                className="flex h-5 w-5 items-center justify-center rounded-full text-[7px] font-medium text-white"
                style={{ backgroundColor: p.c }}
              >
                {p.l}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-1">
            {[
              { c: "#c00028", l: "H" },
              { c: "#c00028", l: "W" },
              { c: "#c00028", l: "I" },
            ].map((p, i) => (
              <div
                key={i}
                className="flex h-5 w-5 items-center justify-center rounded-full text-[7px] font-medium text-white"
                style={{ backgroundColor: p.c }}
              >
                {p.l}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded bg-[#0f1c2c] px-2 py-1">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-[#849585]">&pound;85.2m spent</span>
            <span className="text-[#00d166]">&pound;14.8m left</span>
          </div>
          <div className="mt-0.5 h-1 rounded-full bg-[#1e2b3b]">
            <div className="h-full w-[85%] rounded-full bg-[#00d166]" />
          </div>
          <div className="mt-1 flex gap-1.5">
            {["GKP 1/2", "DEF 4/5", "MID 3/5", "FWD 3/3"].map((tag) => (
              <span
                key={tag}
                className="rounded bg-[#132030] px-1.5 py-0.5 text-[8px] text-[#b9cbb9]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  return (
    <div className="flex flex-col items-center">
      <section className="relative isolate flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-4 text-center">
        <div className="pointer-events-none absolute inset-0 z-0">
          <Aurora
            colorStops={["#00e478", "#B497CF", "#5227FF"]}
            blend={0.5}
            amplitude={1.0}
            speed={0.5}
          />
        </div>
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
            {user ? (
              <>
                <Link
                  href="/auction"
                  className={cn(buttonVariants({ size: "lg" }))}
                >
                  Go to Auctions
                </Link>
                <Link
                  href="/players"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                >
                  Players
                </Link>
              </>
            ) : (
              <>
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
              </>
            )}
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
