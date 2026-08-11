"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Wifi, WifiLow, WifiOff } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export type ServiceName = "supabase" | "realtime" | "fpl" | "browser";
export type ServiceStatus = "online" | "degraded" | "offline" | "checking";

export interface ServiceState {
  status: ServiceStatus;
  detail: string;
  checkedAt: number | null;
}

export const STATUS_COLOR: Record<ServiceStatus, string> = {
  online: "#00e478",
  degraded: "#f5b759",
  offline: "#ff5959",
  checking: "#849585",
};

const SERVICE_LABELS: Record<ServiceName, string> = {
  supabase: "Supabase API",
  realtime: "Realtime",
  fpl: "FPL data",
  browser: "Internet",
};

const REST_PING_MS = 20_000;
const FPL_CHECK_MS = 60_000;
const FPL_DEFAULT_TTL_MS = 2 * 60 * 60 * 1000;

const INITIAL_STATE: ServiceState = {
  status: "checking",
  detail: "Checking",
  checkedAt: null,
};

export function deriveOverallStatus(
  statuses: Record<ServiceName, ServiceStatus>,
): ServiceStatus {
  const values = Object.values(statuses);
  if (values.includes("offline")) return "offline";
  if (values.includes("degraded")) return "degraded";
  if (values.includes("checking")) return "checking";
  return "online";
}

function timeAgo(ms: number | null): string {
  if (ms === null) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function subscribeToOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getIsOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function subscribeToVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => {
    document.removeEventListener("visibilitychange", callback);
  };
}

function getIsVisible() {
  return typeof document === "undefined"
    ? true
    : document.visibilityState === "visible";
}

type ProbedService = Exclude<ServiceName, "browser">;

export function useServiceStatus() {
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const isOnline = useSyncExternalStore(
    subscribeToOnline,
    getIsOnline,
    () => true,
  );
  const isVisible = useSyncExternalStore(
    subscribeToVisibility,
    getIsVisible,
    () => true,
  );

  const onlineRef = useRef(true);
  const visibleRef = useRef(true);

  const [services, setServices] = useState<
    Record<ProbedService, ServiceState>
  >({
    supabase: INITIAL_STATE,
    realtime: INITIAL_STATE,
    fpl: INITIAL_STATE,
  });

  const setService = useCallback(
    (name: ProbedService, status: ServiceStatus, detail: string) => {
      setServices((prev) => ({
        ...prev,
        [name]: { status, detail, checkedAt: Date.now() },
      }));
    },
    [],
  );

  const failRef = useRef(0);

  const checkSupabase = useCallback(async () => {
    try {
      const { error } = await supabase.rpc("get_server_time");
      if (error) throw error;
      failRef.current = 0;
      setService("supabase", "online", "Connected");
    } catch {
      failRef.current += 1;
      if (failRef.current >= 2) {
        setService("supabase", "offline", "Unreachable");
      } else {
        setService("supabase", "degraded", "Degraded");
      }
    }
  }, [setService, supabase]);

  const checkFpl = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("fpl_cache")
        .select("updated_at, ttl_ms")
        .eq("key", "fpl_data")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setService("fpl", "degraded", "Not cached");
        return;
      }
      const age = Date.now() - new Date(data.updated_at).getTime();
      const ttl = data.ttl_ms ?? FPL_DEFAULT_TTL_MS;
      const fresh = age < ttl;
      setService("fpl", fresh ? "online" : "degraded", fresh ? "Fresh" : "Stale");
    } catch {
      setService("fpl", "offline", "Unreachable");
    }
  }, [setService, supabase]);

  const probe = useCallback(() => {
    if (!onlineRef.current || !visibleRef.current) return;
    void checkSupabase();
    void checkFpl();
  }, [checkSupabase, checkFpl]);

  useEffect(() => {
    onlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    visibleRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    if (!isOnline || !isVisible) return;
    let removed = false;
    const channel = supabase.channel("connection-health");
    channel.subscribe((status) => {
      if (removed) return;
      if (status === "SUBSCRIBED") {
        setService("realtime", "online", "Connected");
      } else if (status === "CHANNEL_ERROR" || status === "CLOSED") {
        setService("realtime", "offline", "Disconnected");
      } else if (status === "TIMED_OUT") {
        setService("realtime", "degraded", "Connecting");
      }
    });
    return () => {
      removed = true;
      void supabase.removeChannel(channel);
    };
  }, [isOnline, isVisible, setService, supabase]);

  useEffect(() => {
    if (isOnline && isVisible) probe();
  }, [isOnline, isVisible, probe]);

  useEffect(() => {
    const restId = window.setInterval(() => {
      if (onlineRef.current && visibleRef.current) void checkSupabase();
    }, REST_PING_MS);
    const fplId = window.setInterval(() => {
      if (onlineRef.current && visibleRef.current) void checkFpl();
    }, FPL_CHECK_MS);
    return () => {
      window.clearInterval(restId);
      window.clearInterval(fplId);
    };
  }, [checkSupabase, checkFpl]);

  return { services, isOnline };
}

const OVERALL_STYLE: Record<
  ServiceStatus,
  { icon: typeof Wifi; color: string; label: string }
> = {
  online: { icon: Wifi, color: "text-primary", label: "All services connected" },
  degraded: {
    icon: WifiLow,
    color: "text-[#f5b759]",
    label: "Some services degraded",
  },
  offline: {
    icon: WifiOff,
    color: "text-[#ff5959]",
    label: "Service connection lost",
  },
  checking: {
    icon: WifiLow,
    color: "text-foreground-dim",
    label: "Checking connections",
  },
};

function ServiceRow({
  label,
  status,
  detail,
  checkedAt,
}: {
  label: string;
  status: ServiceStatus;
  detail: string;
  checkedAt: string;
}) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span
        className="inline-block size-2 shrink-0 rounded-full"
        style={{ backgroundColor: STATUS_COLOR[status] }}
      />
      <span>{label}</span>
      <span className="text-muted-foreground">{detail}</span>
      <span className="ml-auto text-[#849585]">{checkedAt}</span>
    </div>
  );
}

export function ConnectionStatusIndicator() {
  const { services, isOnline } = useServiceStatus();

  const browserStatus: ServiceStatus = isOnline ? "online" : "offline";
  const effectiveStatus = (name: ProbedService): ServiceStatus =>
    isOnline ? services[name].status : "offline";
  const effectiveDetail = (name: ProbedService): string =>
    isOnline ? services[name].detail : "No internet";

  const overall = deriveOverallStatus({
    supabase: effectiveStatus("supabase"),
    realtime: effectiveStatus("realtime"),
    fpl: effectiveStatus("fpl"),
    browser: browserStatus,
  });

  const { icon: Icon, color, label } = OVERALL_STYLE[overall];
  const rows: ServiceName[] = ["supabase", "realtime", "fpl", "browser"];

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={label}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-[#849585] transition-colors hover:text-[#d6e4f9]"
      >
        <Icon className={`h-4 w-4 ${color}`} />
      </TooltipTrigger>
      <TooltipContent side="top" align="end">
        <div className="flex flex-col gap-1.5 py-1">
          {rows.map((name) =>
            name === "browser" ? (
              <ServiceRow
                key={name}
                label={SERVICE_LABELS.browser}
                status={browserStatus}
                detail={isOnline ? "Online" : "Offline"}
                checkedAt="now"
              />
            ) : (
              <ServiceRow
                key={name}
                label={SERVICE_LABELS[name]}
                status={effectiveStatus(name)}
                detail={effectiveDetail(name)}
                checkedAt={timeAgo(services[name].checkedAt)}
              />
            ),
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
