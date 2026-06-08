import Link from "next/link";
import { version } from "../package.json";

const REPO = "https://github.com/ThishanTharuka/fpl-auction-hub";

function getCommitSha(): string | null {
  if (typeof process === "undefined") return null;
  return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
    ?? process.env.VERCEL_GIT_COMMIT_SHA
    ?? null;
}

export function Footer() {
  const commitSha = getCommitSha();
  const shortSha = commitSha?.slice(0, 7) ?? null;

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
        {shortSha && (
          <>
            <span aria-hidden="true">·</span>
            <Link
              href={`${REPO}/commit/${commitSha}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono hover:text-[#d6e4f9] transition-colors"
            >
              {shortSha}
            </Link>
          </>
        )}
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
