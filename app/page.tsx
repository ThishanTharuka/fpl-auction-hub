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
  Swords,
  TrendingUp,
  Trophy,
} from "lucide-react";

const bentoItems: BentoItem[] = [
  {
    title: "Live Real-Time Auctions",
    description:
      "Synchronized draft room with millisecond-accurate countdowns, tiered bid increments, live chat, and spectator mode.",
    icon: <Gavel className="h-4 w-4 text-[#00e478]" />,
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
          <div className="ml-auto text-right">
            <span className="font-mono text-[14px] font-bold text-[#00e478]">
              &pound;14.0m
            </span>
            <p className="text-[8px] uppercase tracking-wider text-[#849585]">Leading Bid</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-[#1e2b3b]">
            <div className="h-full w-[45%] rounded-full bg-[#00e478]" />
          </div>
          <span className="font-mono text-[10.5px] font-bold text-[#00e478]">
            00:12s
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-[#132030] p-2 text-center">
            <p className="text-[8px] uppercase tracking-wider text-[#849585]">Bidder</p>
            <p className="text-[11px] font-semibold text-[#00e478]">KRAPOSTAS FC</p>
          </div>
          <div className="rounded-lg bg-[#132030] p-2 text-center">
            <p className="text-[8px] uppercase tracking-wider text-[#849585]">Next Increment</p>
            <p className="font-mono text-[11px] font-semibold text-[#d6e4f9]">+&pound;1.0m</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {["Server Clock Sync", "Tiered Increments", "Live Chat", "Spectator View"].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-[#061423] px-2 py-0.5 text-[9px] text-[#849585]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Player Database",
    description:
      "Sort and filter 800+ Premier League players with live form, xG, xA, ICT index, and historical metrics.",
    icon: <BarChart3 className="h-4 w-4 text-[#38bdf8]" />,
    visual: (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 rounded-md bg-[#061423] p-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/20 text-[9px] font-bold text-blue-400">
            MID
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-medium text-[#d6e4f9]">Salah</p>
            <p className="text-[9px] text-[#b9cbb9]">LIV &middot; Form 8.2</p>
          </div>
          <span className="font-mono text-[11px] font-bold text-[#00e478]">&pound;13.0m</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "xG", value: "0.78", color: "#00e478" },
            { label: "xA", value: "0.45", color: "#38bdf8" },
            { label: "ICT", value: "18.4", color: "#d6e4f9" },
            { label: "Pts", value: "187", color: "#00e478" },
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
          {["Streaming SSR", "TanStack Table v8", "Edge Cached"].map((tag) => (
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
    title: "Tournaments & Two-Path Brackets",
    description:
      "Run custom competitions with Berger round-robin schedules, group tables, and Champions & Europa League knockout trees.",
    icon: <Trophy className="h-4 w-4 text-[#facc15]" />,
    colSpan: 2,
    visual: (
      <div className="space-y-2 rounded-md border border-[#3b4b3d] bg-[#0f1c2c] p-2.5">
        <div className="flex items-center justify-between text-[9px]">
          <span className="font-semibold uppercase tracking-wider text-[#facc15]">
            Knockout Tree &middot; Champions Path
          </span>
          <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[8.5px] font-medium text-emerald-400">
            Auto-Scored GW3
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded border border-[#222c3e] bg-[#132030] p-2 space-y-1">
            <p className="text-[8px] uppercase text-[#849585]">Semi-Final 1</p>
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-medium text-[#edf1f7]">The Kop FC</span>
              <span className="font-mono font-bold text-[#00e478]">64</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#8b97aa]">Wirtz Class</span>
              <span className="font-mono text-[#8b97aa]">52</span>
            </div>
          </div>
          <div className="rounded border border-[#222c3e] bg-[#132030] p-2 space-y-1">
            <p className="text-[8px] uppercase text-[#849585]">Semi-Final 2</p>
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-medium text-[#edf1f7]">Vanta Reapers</span>
              <span className="font-mono font-bold text-[#00e478]">57</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#8b97aa]">Lord Pakeer</span>
              <span className="font-mono text-[#8b97aa]">38</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {["Group Stage Tables", "Two-Path Knockouts", "Berger Schedule", "Text Fixture Import"].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-[#061423] px-2 py-0.5 text-[9px] text-[#849585]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Match Breakdown",
    description:
      "Deep head-to-head matchday dialog: compare Starting 11, bench scores, captain multipliers, autosubs, and match stats.",
    icon: <Swords className="h-4 w-4 text-[#f87171]" />,
    visual: (
      <div className="space-y-2 rounded-md bg-[#061423] p-2.5">
        <div className="flex items-center justify-between border-b border-white/5 pb-1.5 text-[10px]">
          <span className="font-semibold text-[#d6e4f9]">Vanta Reapers</span>
          <span className="font-mono font-bold text-[#00e478]">57 &ndash; 38</span>
          <span className="font-medium text-[#849585]">Lord Pakeer</span>
        </div>
        <div className="rounded bg-[#132030] p-1.5 flex items-center justify-between text-[9px]">
          <span className="text-[#b9cbb9]">Haaland (C)</span>
          <span className="rounded bg-yellow-500/20 px-1 font-mono text-[8.5px] font-bold text-yellow-400">
            18 pts &times;2
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {[
            { label: "3 Goals", color: "text-[#00e478]" },
            { label: "2 Assists", color: "text-[#38bdf8]" },
            { label: "CS", color: "text-[#a78bfa]" },
            { label: "6 Bonus", color: "text-[#facc15]" },
          ].map((stat) => (
            <span
              key={stat.label}
              className={`rounded bg-[#101b2b] px-1.5 py-0.5 text-[8.5px] font-medium ${stat.color}`}
            >
              {stat.label}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Valuation Index Builder",
    description:
      "Design personalized player valuation weights (xG, xA, form, minutes) to uncover market bargains.",
    icon: <Layers className="h-4 w-4 text-[#a78bfa]" />,
    visual: (
      <div className="space-y-2">
        {[
          { label: "xG", value: 85 },
          { label: "Form", value: 70 },
          { label: "Points", value: 60 },
        ].map((slider) => (
          <div key={slider.label} className="flex items-center gap-2">
            <span className="w-8 text-[9px] text-[#b9cbb9]">
              {slider.label}
            </span>
            <div className="relative flex-1">
              <div className="h-1 rounded-full bg-[#1e2b3b]">
                <div
                  className="h-full rounded-full bg-[#a78bfa]"
                  style={{ width: `${slider.value}%` }}
                />
              </div>
            </div>
            <span className="w-6 text-right font-mono text-[9px] text-[#a78bfa]">
              {slider.value}%
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 rounded bg-[#061423] px-2 py-1">
          <span className="font-mono text-[8.5px] text-[#849585]">#1</span>
          <span className="flex-1 text-[9.5px] font-medium text-[#d6e4f9]">
            Salah (LIV)
          </span>
          <span className="font-mono text-[9.5px] font-bold text-[#00e478]">
            Index 98.5
          </span>
        </div>
      </div>
    ),
  },
  {
    title: "Squad Hub & Formations",
    description:
      "Pitch visualizer across 6 formations with drag-and-drop starter/bench allocation and 1-click Google Sheets export.",
    icon: <Shield className="h-4 w-4 text-[#34d399]" />,
    visual: (
      <div className="space-y-1.5">
        <div className="rounded-md bg-[#0f3d24] p-1.5">
          <div className="mb-0.5 flex justify-center gap-1">
            <div className="h-3.5 w-3.5 rounded-full bg-yellow-400 text-[6px] font-bold text-black flex items-center justify-center">G</div>
          </div>
          <div className="mb-0.5 flex justify-center gap-1">
            {["D", "D", "D", "D"].map((l, i) => (
              <div key={i} className="h-3.5 w-3.5 rounded-full bg-blue-500 text-[6px] font-bold text-white flex items-center justify-center">{l}</div>
            ))}
          </div>
          <div className="mb-0.5 flex justify-center gap-1">
            {["M", "M", "M"].map((l, i) => (
              <div key={i} className="h-3.5 w-3.5 rounded-full bg-emerald-500 text-[6px] font-bold text-white flex items-center justify-center">{l}</div>
            ))}
          </div>
          <div className="flex justify-center gap-1">
            {["F", "F", "F"].map((l, i) => (
              <div key={i} className="h-3.5 w-3.5 rounded-full bg-red-500 text-[6px] font-bold text-white flex items-center justify-center">{l}</div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-[8.5px] text-[#849585]">
          <span>Formation 4-3-3</span>
          <span className="text-[#00e478]">Google Sheets GIS Export</span>
        </div>
      </div>
    ),
  },
  {
    title: "Market Insights",
    description:
      "Track budget distribution, positional spending share, and value-over-replacement efficiency across all teams.",
    icon: <TrendingUp className="h-4 w-4 text-[#fb923c]" />,
    visual: (
      <div className="space-y-2 rounded-md bg-[#061423] p-2">
        <p className="text-[8px] uppercase tracking-wider text-[#849585]">Spending Share</p>
        <div className="flex h-2 overflow-hidden rounded-full bg-[#1e2b3b]">
          <div style={{ width: "26%" }} className="bg-blue-500" title="DEF" />
          <div style={{ width: "44%" }} className="bg-emerald-500" title="MID" />
          <div style={{ width: "30%" }} className="bg-red-500" title="FWD" />
        </div>
        <div className="flex justify-between text-[8px] text-[#b9cbb9]">
          <span>DEF 26%</span>
          <span>MID 44%</span>
          <span>FWD 30%</span>
        </div>
        <div className="rounded bg-[#132030] px-1.5 py-1 text-center text-[8.5px]">
          <span className="text-[#849585]">Top Value Buy: </span>
          <span className="font-semibold text-[#00e478]">Mbeumo (4.8x)</span>
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
            AUCTION &amp; TOURNAMENT PLATFORM
          </p>
          <p className="mb-3 text-4xl font-bold text-foreground sm:text-5xl">
            FPL AUCTION HUB
          </p>
          <p className="mb-8 max-w-xl text-sm text-muted-foreground">
            Live fantasy auctions, custom tournament brackets with automated FPL
            scoring, head-to-head match breakdowns, and player valuation analytics.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {user ? (
              <>
                <Link
                  href="/auction"
                  className={cn(buttonVariants({ size: "lg" }))}
                >
                  Go to Auctions
                </Link>
                <Link
                  href="/tournaments"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                >
                  Tournaments
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
          PLATFORM CAPABILITIES
        </p>
        <BentoGrid items={bentoItems} />
      </section>
    </div>
  );
}
