import Link from "next/link";
import { ConnectionStatusIndicator } from "@/components/connection-status";

const REPO = "https://github.com/ThishanTharuka/fpl-auction-hub";

export function Footer() {
  return (
    <footer className="relative border-t border-border/40 dark:border-white/[0.06] bg-background/65 dark:bg-[#061423]/70 backdrop-blur-xl backdrop-saturate-180 transition-colors shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-[1440px] flex-col sm:flex-row items-center justify-between gap-3 px-4 pt-2.5 pb-2 sm:py-2.5 sm:px-6">
        {/* Left slot on desktop: connection indicator */}
        <div className="hidden sm:flex items-center gap-2">
          <ConnectionStatusIndicator />
        </div>

        {/* Center navigation */}
        <nav className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-[11px] sm:text-xs text-muted-foreground/80 tracking-wide font-normal">
          <span className="hidden sm:inline font-semibold text-foreground/90 px-2 py-0.5 tracking-tight">
            FPL Auction Hub
          </span>
          <span aria-hidden="true" className="hidden sm:inline text-muted-foreground/30 select-none">
            &middot;
          </span>
          <Link
            href={`${REPO}/releases`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-2.5 py-1 sm:py-0.5 hover:text-foreground hover:bg-foreground/[0.04] dark:hover:bg-white/[0.06] active:scale-95 transition-all duration-100 ease-out"
          >
            Release Notes
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/30 select-none">
            &middot;
          </span>
          <Link
            href={`${REPO}/issues/new/choose`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-2.5 py-1 sm:py-0.5 hover:text-foreground hover:bg-foreground/[0.04] dark:hover:bg-white/[0.06] active:scale-95 transition-all duration-100 ease-out"
          >
            Report an Issue
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/30 select-none">
            &middot;
          </span>
          <Link
            href="/privacy"
            className="rounded-full px-2.5 py-1 sm:py-0.5 hover:text-foreground hover:bg-foreground/[0.04] dark:hover:bg-white/[0.06] active:scale-95 transition-all duration-100 ease-out"
          >
            Privacy
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/30 select-none">
            &middot;
          </span>
          <Link
            href="/terms"
            className="rounded-full px-2.5 py-1 sm:py-0.5 hover:text-foreground hover:bg-foreground/[0.04] dark:hover:bg-white/[0.06] active:scale-95 transition-all duration-100 ease-out"
          >
            Terms
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/30 select-none">
            &middot;
          </span>
          <Link
            href={REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-2.5 py-1 sm:py-0.5 hover:text-foreground hover:bg-foreground/[0.04] dark:hover:bg-white/[0.06] active:scale-95 transition-all duration-100 ease-out"
          >
            GitHub
          </Link>
        </nav>

        {/* Mobile bottom row: brand & connection status gracefully aligned together */}
        <div className="flex sm:hidden items-center justify-center gap-2 pt-1 border-t border-border/30 dark:border-white/[0.04] w-full max-w-[280px]">
          <ConnectionStatusIndicator />
          <span className="text-[11px] font-medium text-foreground/80 tracking-tight">
            FPL Auction Hub
          </span>
        </div>

        {/* Right spacer for symmetrical centering on desktop */}
        <div className="hidden sm:block w-6" aria-hidden="true" />
      </div>
    </footer>
  );
}
