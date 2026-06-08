import Link from "next/link";

const REPO = "https://github.com/ThishanTharuka/fpl-auction-hub";

function getVersion(): string {
  if (typeof process === "undefined") return "0.0.0";
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require("../package.json");
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export function Footer() {
  const version = getVersion();

  return (
    <footer className="border-t border-[#3b4b3d]/50">
      <nav className="mx-auto flex h-9 max-w-[1440px] items-center justify-center gap-1.5 px-4 text-xs text-[#849585]">
        <span>FPL Auction Hub</span>
        <span aria-hidden="true">·</span>
        <Link
          href={`${REPO}/releases/tag/v${version}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#d6e4f9] transition-colors"
        >
          v{version}
        </Link>
        <span aria-hidden="true">·</span>
        <Link
          href={`${REPO}/releases`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#d6e4f9] transition-colors"
        >
          Release Notes
        </Link>
        <span aria-hidden="true">·</span>
        <Link
          href={`${REPO}/issues/new/choose`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#d6e4f9] transition-colors"
        >
          Report an Issue
        </Link>
        <span aria-hidden="true">·</span>
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
