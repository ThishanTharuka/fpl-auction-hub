"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/players", label: "Players" },
  { href: "/index-builder", label: "Index Builder" },
  { href: "/auction", label: "Auctions" },
  { href: "/auction/setup", label: "New Auction" },
  { href: "/teams", label: "Teams" },
];

export function Nav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (pathname === "/") {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#3b4b3d] bg-[#020f1e]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 sm:gap-8 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-[#00e478] shrink-0"
        >
          <Image
            src="/fplah.webp"
            alt="FPL Auction Hub"
            width={32}
            height={32}
            className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
            priority
          />
          <span className="hidden sm:inline">FPL Auction Hub</span>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-1 ml-4">
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
        )}

        <div className="ml-auto flex items-center gap-2 sm:gap-3 text-sm text-[#b9cbb9]">
          {user ? (
            <>
              <Link
                href="/profile"
                className="text-xs hidden sm:block truncate max-w-[180px] hover:text-[#00e478] transition-colors"
                title={user.email}
              >
                {user.email}
              </Link>
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

          {user && (
            <button
              className="md:hidden p-1.5 text-[#b9cbb9] hover:text-[#d6e4f9]"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle navigation menu"
            >
              {menuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 top-14 bg-black/50 md:hidden z-40"
            onClick={() => setMenuOpen(false)}
          />
          {user && (
            <nav className="absolute top-full left-0 right-0 bg-[#020f1e] border-b border-[#3b4b3d] md:hidden z-50 px-4 pb-3 pt-2">
              {links.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "block rounded px-3 py-2.5 text-sm font-medium transition-colors",
                    pathname.startsWith(href)
                      ? "bg-[#1e2b3b] text-[#00e478]"
                      : "text-[#b9cbb9] hover:text-[#d6e4f9] hover:bg-[#132030]",
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/profile"
                className="block sm:hidden rounded px-3 py-2.5 text-sm font-medium text-[#b9cbb9] hover:text-[#d6e4f9] hover:bg-[#132030] transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
            </nav>
          )}
        </>
      )}
    </header>
  );
}
