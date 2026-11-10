"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

// Only surface the bar if a navigation is genuinely slow. Fast menu
// switches finish inside this window and show no bar at all, so the
// progress bar never reads as an artificial delay.
const BAR_DELAY_MS = 250;

function NProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathnameRef = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Finish the bar once the route actually changes (covers back/forward too).
  useEffect(() => {
    if (pathname !== pathnameRef.current) {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      NProgress.done();
      pathnameRef.current = pathname;
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Skip modified clicks (new tab/window) and links the browser handles.
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const link = (e.target as HTMLElement).closest("a");
      if (
        link &&
        link.href &&
        link.target !== "_blank" &&
        !link.hasAttribute("download")
      ) {
        try {
          const url = new URL(link.href);
          if (
            url.origin === window.location.origin &&
            url.pathname !== window.location.pathname
          ) {
            if (timerRef.current !== null) {
              clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(() => {
              timerRef.current = null;
              NProgress.start();
            }, BAR_DELAY_MS);
          }
        } catch {
          // ignore invalid URLs
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return null;
}

export function NProgressProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  useEffect(() => {
    NProgress.configure({ showSpinner: false, minimum: 0.15 });
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <NProgressInner />
      </Suspense>
      {children}
    </>
  );
}
