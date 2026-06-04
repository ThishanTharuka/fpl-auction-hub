"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

function NProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    if (pathname !== pathnameRef.current) {
      NProgress.done();
      pathnameRef.current = pathname;
    }
  }, [pathname, searchParams]);

  return null;
}

export function NProgressProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  useEffect(() => {
    NProgress.configure({ showSpinner: false, minimum: 0.15 });
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
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
            NProgress.start();
          }
        } catch {
          // ignore invalid URLs
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
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
