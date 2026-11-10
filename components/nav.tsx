"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/players", label: "Players" },
  { href: "/insights", label: "Insights" },
  { href: "/index-builder", label: "Index Builder" },
  { href: "/auction", label: "Auctions" },
  { href: "/auction/setup", label: "New Auction" },
  { href: "/teams", label: "Teams" },
  { href: "/tournaments", label: "Tournaments" },
];

// The session only exists on the client (read from cookies in an effect), so
// nothing auth-dependent may render until hydration finishes. Otherwise the
// server HTML (always signed out) diverges from the client tree and React
// reports a hydration error. useSyncExternalStore also returns the server
// snapshot during deferred hydration, so late-hydrated Suspense boundaries
// stay consistent too.
const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;

export function Nav() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Prevent background scroll when mobile menu drawer is open
  useEffect(() => {
    if (!menuOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [menuOpen]);

  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  // Wait for the session read to settle so we never flash the wrong state.
  const authReady = hydrated && !loading;
  const signedIn = authReady && user !== null;

  if (pathname === "/" && !signedIn) {
    return null;
  }

  const isLinkActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/auction") {
      return (
        pathname.startsWith("/auction") && !pathname.startsWith("/auction/setup")
      );
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 dark:border-white/[0.06] bg-background/70 dark:bg-[#061423]/75 backdrop-blur-xl backdrop-saturate-180 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_2px_8px_-2px_rgba(0,0,0,0.04)] transition-colors">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 sm:gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold text-primary shrink-0 tracking-tight text-[15px] active:scale-[0.98] transition-transform duration-100 ease-out"
        >
          <Image
            src="/fplah.webp"
            alt="FPL Auction Hub"
            width={32}
            height={32}
            className="h-7 w-7 sm:h-8 sm:w-8 object-contain drop-shadow-xs"
            priority
          />
          <span className="hidden sm:inline font-semibold">FPL Auction Hub</span>
        </Link>

        {signedIn && (
          <nav className="hidden md:flex items-center gap-1 ml-2 p-1 rounded-full bg-foreground/[0.03] dark:bg-white/[0.04] border border-border/40 dark:border-white/[0.06] backdrop-blur-md">
            {links.map(({ href, label }) => {
              const active = isLinkActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative rounded-full px-3 py-1 text-[13px] font-medium tracking-normal transition-colors select-none",
                    "active:scale-[0.96] transition-transform duration-100 ease-out",
                    active
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-full bg-secondary/90 dark:bg-white/[0.12] shadow-xs -z-10"
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 380, damping: 30 }
                      }
                    />
                  )}
                  {label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
          <ThemeToggle />

          {authReady ? (
            user ? (
              <>
                <Link
                  href="/profile"
                  className="text-[12px] font-medium tracking-wide hidden sm:block truncate max-w-[180px] text-muted-foreground/90 hover:text-foreground px-2.5 py-1 rounded-full hover:bg-foreground/[0.04] dark:hover:bg-white/[0.06] active:scale-[0.97] transition-all duration-100 ease-out"
                  title={user.email}
                >
                  {user.email}
                </Link>
                {/* Desktop Sign out button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex text-xs h-7.5 rounded-full border-border/60 hover:border-border dark:border-white/10 dark:hover:border-white/20 bg-background/50 hover:bg-muted/80 backdrop-blur-xs active:scale-[0.96] transition-all duration-100 ease-out"
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
                  className="text-xs h-7.5 rounded-full border-border/60 hover:border-border dark:border-white/10 dark:hover:border-white/20 bg-background/50 hover:bg-muted/80 backdrop-blur-xs active:scale-[0.96] transition-all duration-100 ease-out"
                >
                  Sign in
                </Button>
              </Link>
            )
          ) : null}

          {signedIn && (
            <button
              className="md:hidden relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/40 bg-foreground/[0.02] dark:bg-white/[0.04] text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-90 transition-all duration-100 ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
            >
              <AnimatePresence mode="wait" initial={false}>
                {menuOpen ? (
                  <motion.span
                    key="close"
                    initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ opacity: 0, rotate: 45, scale: 0.8 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: -45, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-center"
                  >
                    <Menu className="w-4 h-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}
        </div>
      </div>

      {hydrated &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                key="nav-scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="fixed inset-0 top-14 bg-black/20 dark:bg-black/35 backdrop-blur-xl backdrop-saturate-150 z-40 md:hidden"
                style={{
                  WebkitBackdropFilter: "blur(20px) saturate(150%)",
                  backdropFilter: "blur(20px) saturate(150%)",
                }}
                onClick={() => setMenuOpen(false)}
              />
            )}
            {menuOpen && signedIn && (
              <motion.nav
                key="nav-drawer"
                initial={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -8, scale: 0.99 }
                }
                animate={
                  prefersReducedMotion
                    ? { opacity: 1 }
                    : { opacity: 1, y: 0, scale: 1 }
                }
                exit={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -8, scale: 0.99 }
                }
                transition={
                  prefersReducedMotion
                    ? { duration: 0.15 }
                    : { type: "spring", damping: 28, stiffness: 340 }
                }
                data-frost="background"
                className="fixed top-14 left-0 right-0 bg-background/60 dark:bg-[#061423]/65 backdrop-blur-3xl backdrop-saturate-180 border-b border-border/40 dark:border-white/[0.08] z-50 md:hidden px-4 pb-4 pt-2 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_20px_35px_-10px_rgba(0,0,0,0.4)] rounded-b-2xl max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain"
                style={{
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                  backdropFilter: "blur(24px) saturate(180%)",
                }}
              >
                    <div className="flex flex-col gap-1">
                      {links.map(({ href, label }) => {
                        const active = isLinkActive(href);
                        return (
                          <Link
                            key={href}
                            href={href}
                            className={cn(
                              "min-h-[44px] flex items-center rounded-xl px-3.5 py-2 text-sm font-medium transition-all select-none",
                              "active:scale-[0.98] duration-100 ease-out",
                              active
                                ? "bg-primary/15 text-primary font-semibold border border-primary/25 shadow-xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] dark:hover:bg-white/[0.06]",
                            )}
                            onClick={() => setMenuOpen(false)}
                          >
                            {label}
                          </Link>
                        );
                      })}
                      {user && (
                        <>
                          <div className="my-1.5 border-t border-border/40 dark:border-white/[0.06] sm:hidden" />
                          <Link
                            href="/profile"
                            className="min-h-[44px] flex items-center justify-between sm:hidden rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] dark:hover:bg-white/[0.06] active:scale-[0.98] transition-all duration-100 ease-out select-none"
                            onClick={() => setMenuOpen(false)}
                          >
                            <span>Profile</span>
                            {user.email && (
                              <span className="text-xs text-muted-foreground/70 font-normal truncate max-w-[160px]">
                                {user.email}
                              </span>
                            )}
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              signOut();
                            }}
                            className="min-h-[44px] flex items-center sm:hidden rounded-xl px-3.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all duration-100 ease-out select-none text-left w-full"
                          >
                            Sign out
                          </button>
                        </>
                      )}
                    </div>
              </motion.nav>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </header>
  );
}
