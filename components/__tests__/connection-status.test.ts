import { describe, it, expect } from "vitest";
import { deriveOverallStatus } from "@/components/connection-status";
import type {
  ServiceName,
  ServiceStatus,
} from "@/components/connection-status";

function statuses(
  partial: Partial<Record<ServiceName, ServiceStatus>>,
): Record<ServiceName, ServiceStatus> {
  return {
    supabase: "online",
    realtime: "online",
    fpl: "online",
    browser: "online",
    ...partial,
  } as Record<ServiceName, ServiceStatus>;
}

describe("deriveOverallStatus", () => {
  it("returns online when every service is online", () => {
    expect(deriveOverallStatus(statuses({}))).toBe("online");
  });

  it("returns offline when any service is offline", () => {
    expect(deriveOverallStatus(statuses({ supabase: "offline" }))).toBe(
      "offline",
    );
    expect(
      deriveOverallStatus(statuses({ browser: "offline" })),
    ).toBe("offline");
  });

  it("returns degraded when any service is degraded and none is offline", () => {
    expect(deriveOverallStatus(statuses({ fpl: "degraded" }))).toBe("degraded");
  });

  it("returns checking while services are still being probed", () => {
    expect(deriveOverallStatus(statuses({ realtime: "checking" }))).toBe(
      "checking",
    );
  });

  it("treats offline as the worst state over degraded", () => {
    expect(
      deriveOverallStatus(
        statuses({ realtime: "offline", fpl: "degraded" }),
      ),
    ).toBe("offline");
  });

  it("treats degraded as worse than checking", () => {
    expect(
      deriveOverallStatus(statuses({ supabase: "checking", fpl: "degraded" })),
    ).toBe("degraded");
  });
});
