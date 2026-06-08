"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const REPO = "https://github.com/ThishanTharuka/fpl-auction-hub";

let cachedVersion: string | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 3_600_000;

export function Footer() {
  const [version, setVersion] = useState(cachedVersion ?? "...");

  useEffect(() => {
    if (cachedVersion && Date.now() < cacheExpiry) return;

    fetch("https://api.github.com/repos/ThishanTharuka/fpl-auction-hub/releases/latest")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch release");
        return res.json() as Promise<{ tag_name: string }>;
      })
      .then((data) => {
        cachedVersion = data.tag_name.replace("v", "");
        cacheExpiry = Date.now() + CACHE_TTL;
        setVersion(cachedVersion);
      })
      .catch(() => setVersion("0.0.0"));
  }, []);

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
