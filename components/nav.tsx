"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/players", label: "Players" },
  { href: "/index-builder", label: "Index Builder" },
  { href: "/auction", label: "Auction" },
  { href: "/teams", label: "Teams" },
];

export function Nav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-[#3b4b3d] bg-[#020f1e]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-8 px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-[#00e478]"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="#00e478" strokeWidth="2" />
            <path
              d="M10 5v10M5 10h10"
              stroke="#00e478"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          FPL Auction Hub
        </Link>

        <nav className="flex items-center gap-1 ml-4">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-[#1e2b3b] text-[#00e478]"
                  : "text-[#b9cbb9] hover:text-[#d6e4f9] hover:bg-[#132030]",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm text-[#b9cbb9]">
          {user ? (
            <>
              <span
                className="text-xs hidden sm:block truncate max-w-[180px]"
                title={user.email}
              >
                {user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-[#3b4b3d] hover:bg-[#132030]"
                onClick={signOut}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-[#3b4b3d] hover:bg-[#132030]"
              >
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
