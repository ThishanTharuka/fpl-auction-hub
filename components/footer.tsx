import Link from "next/link";
import { ConnectionStatusIndicator } from "@/components/connection-status";

const REPO = "https://github.com/ThishanTharuka/fpl-auction-hub";

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-sidebar/50 backdrop-blur-xs">
      <nav className="mx-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">FPL Auction Hub</span>
        <span aria-hidden="true">&middot;</span>
        <Link
          href={`${REPO}/releases`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          Release Notes
        </Link>
        <span aria-hidden="true">&middot;</span>
        <Link
          href={`${REPO}/issues/new/choose`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          Report an Issue
        </Link>
        <span aria-hidden="true">&middot;</span>
        <Link
          href="/privacy"
          className="hover:text-foreground transition-colors"
        >
          Privacy
        </Link>
        <span aria-hidden="true">&middot;</span>
        <Link
          href="/terms"
          className="hover:text-foreground transition-colors"
        >
          Terms
        </Link>
        <span aria-hidden="true">&middot;</span>
        <Link
          href={REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          GitHub
        </Link>
      </nav>
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        <ConnectionStatusIndicator />
      </div>
    </footer>
  );
}
