import Link from "next/link";

const REPO = "https://github.com/ThishanTharuka/fpl-auction-hub";

export function Footer() {
  return (
    <footer className="border-t border-[#3b4b3d]/50">
      <nav className="mx-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-xs text-[#849585]">
        <span>FPL Auction Hub</span>
        <span aria-hidden="true">&middot;</span>
        <Link
          href={`${REPO}/releases`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#d6e4f9] transition-colors"
        >
          Release Notes
        </Link>
        <span aria-hidden="true">&middot;</span>
        <Link
          href={`${REPO}/issues/new/choose`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#d6e4f9] transition-colors"
        >
          Report an Issue
        </Link>
        <span aria-hidden="true">&middot;</span>
        <Link
          href="/privacy"
          className="hover:text-[#d6e4f9] transition-colors"
        >
          Privacy
        </Link>
        <span aria-hidden="true">&middot;</span>
        <Link
          href="/terms"
          className="hover:text-[#d6e4f9] transition-colors"
        >
          Terms
        </Link>
        <span aria-hidden="true">&middot;</span>
        <Link
          href={REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#d6e4f9] transition-colors"
        >
          GitHub
        </Link>
      </nav>
    </footer>
  );
}
