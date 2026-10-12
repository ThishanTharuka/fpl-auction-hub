"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}


function SunGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2" />
      <path d="M12 19.5v2" />
      <path d="M4.5 4.5l1.6 1.6" />
      <path d="M17.9 17.9l1.6 1.6" />
      <path d="M2.5 12h2" />
      <path d="M19.5 12h2" />
      <path d="M4.5 19.5l1.6-1.6" />
      <path d="M17.9 6.1l1.6-1.6" />
    </svg>
  );
}

function MoonGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isTransitioning = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client mounted guard to prevent SSR hydration mismatch
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  const toggleTheme = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isTransitioning.current) return;
      const targetTheme = isDark ? "light" : "dark";

      // Calculate origin coordinates from the button center
      const rect = buttonRef.current?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : e.clientX;
      const y = rect ? rect.top + rect.height / 2 : e.clientY;

      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      // Use native View Transitions API if supported
      if (document.startViewTransition && !prefersReducedMotion) {
        isTransitioning.current = true;
        try {
          const transition = document.startViewTransition(() => {
            setTheme(targetTheme);
            if (targetTheme === "dark") {
              document.documentElement.classList.add("dark");
              document.documentElement.classList.remove("light");
            } else {
              document.documentElement.classList.add("light");
              document.documentElement.classList.remove("dark");
            }
          });

          transition.ready.then(() => {
            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${endRadius}px at ${x}px ${y}px)`,
                ],
              },
              {
                duration: 500,
                easing: "ease-in-out",
                pseudoElement: "::view-transition-new(root)",
              },
            );
          });

          transition.finished.finally(() => {
            isTransitioning.current = false;
          });
          return;
        } catch {
          isTransitioning.current = false;
        }
      }

      // Fallback radiating ripple for browsers without native View Transitions
      if (!prefersReducedMotion && typeof document !== "undefined") {
        const ripple = document.createElement("div");
        ripple.className = "radiating-theme-ripple";
        ripple.style.setProperty("--ripple-x", `${x}px`);
        ripple.style.setProperty("--ripple-y", `${y}px`);
        ripple.style.setProperty("--ripple-radius", `${endRadius}px`);
        ripple.style.backgroundColor = targetTheme === "dark" ? "#061423" : "#fbf9f4";
        document.body.appendChild(ripple);
        setTheme(targetTheme);
        setTimeout(() => {
          ripple.remove();
        }, 520);
      } else {
        setTheme(targetTheme);
      }
    },
    [isDark, setTheme],
  );

  return (
    <button
      ref={buttonRef}
      type="button"
      role="switch"
      aria-checked={!isDark}
      aria-label="Toggle light and dark theme"
      title={mounted ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Toggle theme"}
      onClick={toggleTheme}
      className={cn(
        "group relative inline-flex h-[28px] w-[52px] shrink-0 cursor-pointer items-center rounded-full border p-[4px] transition-all duration-300 select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isDark
          ? "bg-[#293545] border-[#3b4b5e] shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] hover:border-[#4b5d73]"
          : "bg-[#ffffff] border-[#e2dcd2] shadow-[0_2px_6px_rgba(0,0,0,0.06),_inset_0_1px_2px_rgba(0,0,0,0.02)] hover:border-[#d0c8bb]",
        className,
      )}
    >
      {/* Left Slot: Sun Icon (enlarged 19px icon) */}
      <span
        className={cn(
          "absolute left-[3.5px] top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 pointer-events-none transition-all duration-300",
          isDark ? "opacity-0 scale-75" : "opacity-100 scale-100",
        )}
      >
        <SunGlyph className="w-[19px] h-[19px] text-amber-500" />
      </span>

      {/* Right Slot: Moon Icon (enlarged 18px icon) */}
      <span
        className={cn(
          "absolute right-[3.5px] top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 pointer-events-none transition-all duration-300",
          isDark ? "opacity-100 scale-100" : "opacity-0 scale-75",
        )}
      >
        <MoonGlyph className="w-[18px] h-[18px] text-white" />
      </span>

      {/* Sliding Knob:
          - Delicate 18px circle (smaller, sleek aesthetic)
          - Dark mode (left): white ring with transparent center (matches reference 1)
          - Light mode (right): amber ring with warm cream fill (matches reference 2)
      */}
      <span
        className={cn(
          "relative z-10 flex items-center justify-center h-[18px] w-[18px] rounded-full border-[2px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          isDark
            ? "translate-x-0 border-white bg-transparent shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
            : "translate-x-[26px] border-amber-500 bg-[#fef3c7] shadow-[0_2px_5px_rgba(245,158,11,0.25)]",
        )}
      />
    </button>
  );
}
