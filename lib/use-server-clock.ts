"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const RESYNC_INTERVAL_MS = 5 * 60 * 1000;

export interface ServerClock {
  ready: boolean;
  getServerNow: () => number;
  toISO: (serverMs: number) => string;
}

async function syncSkew(skewRef: { current: number }, signal: AbortSignal) {
  const supabase = createSupabaseBrowserClient();
  const t0 = Date.now();
  const { data, error } = await supabase.rpc("get_server_time");
  if (signal.aborted || error || !data) return;
  const t1 = Date.now();
  const serverMs = new Date(data).getTime();
  skewRef.current = serverMs - (t0 + t1) / 2;
}

export function useServerClock(): ServerClock {
  const skewRef = useRef<number>(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    syncSkew(skewRef, abortController.signal).then(() => {
      if (!abortController.signal.aborted) setReady(true);
    });

    const intervalId = setInterval(() => {
      syncSkew(skewRef, abortController.signal).catch(() => {});
    }, RESYNC_INTERVAL_MS);

    return () => {
      abortController.abort();
      clearInterval(intervalId);
    };
  }, []);

  return {
    ready,
    getServerNow: () => Date.now() + skewRef.current,
    toISO: (serverMs: number) => new Date(serverMs).toISOString(),
  };
}
