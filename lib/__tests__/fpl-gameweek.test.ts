import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFplGameweekInfo } from "@/lib/fpl-data";

const mocks = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockClient = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    })),
  };
  return { mockSingle, mockClient };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mocks.mockClient),
}));

describe("getFplGameweekInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts currentGameweek and liveGameweek directly from fpl_cache JSON", async () => {
    mocks.mockSingle.mockResolvedValueOnce({
      data: {
        currentGameweek: 7,
        liveGameweek: 7,
        updated_at: new Date().toISOString(),
        ttl_ms: 120000,
      },
      error: null,
    });

    const info = await getFplGameweekInfo();
    expect(info).toEqual({
      currentGameweek: 7,
      liveGameweek: 7,
    });
  });

  it("parses stringified numbers safely", async () => {
    mocks.mockSingle.mockResolvedValueOnce({
      data: {
        currentGameweek: "8",
        liveGameweek: "8",
        updated_at: new Date().toISOString(),
        ttl_ms: 120000,
      },
      error: null,
    });

    const info = await getFplGameweekInfo();
    expect(info).toEqual({
      currentGameweek: 8,
      liveGameweek: 8,
    });
  });
});
