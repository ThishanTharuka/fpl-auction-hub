import { describe, it } from "vitest";
import { syncDailyPrices } from "../fpl-data";

describe("syncDailyPrices diagnostic", () => {
  it("runs syncDailyPrices", async () => {
    const result = await syncDailyPrices(false);
    console.log("SYNC RESULT:", JSON.stringify(result, null, 2));
  }, 60000);
});
