import { describe, expect, it } from "vitest";
import {
  formatMomoAmount,
  mapMomoProviderStatus,
  payeeMsisdnForPayout,
} from "@/lib/momo/status";

describe("mapMomoProviderStatus", () => {
  it("maps provider statuses", () => {
    expect(mapMomoProviderStatus("SUCCESSFUL")).toBe("successful");
    expect(mapMomoProviderStatus("PENDING")).toBe("pending");
    expect(mapMomoProviderStatus("FAILED")).toBe("failed");
    expect(mapMomoProviderStatus("nope")).toBeNull();
  });
});

describe("formatMomoAmount", () => {
  it("formats whole RWF without decimals", () => {
    expect(formatMomoAmount(28565)).toBe("28565");
  });

  it("rejects non-positive amounts", () => {
    expect(formatMomoAmount(0)).toBeNull();
  });
});

describe("payeeMsisdnForPayout", () => {
  it("uses the sandbox override when set", () => {
    expect(
      payeeMsisdnForPayout({
        intentMsisdn: "250788123456",
        targetEnvironment: "sandbox",
        sandboxPayeeMsisdn: "46733123453",
      }),
    ).toBe("46733123453");
  });

  it("keeps the intent number in production", () => {
    expect(
      payeeMsisdnForPayout({
        intentMsisdn: "250788123456",
        targetEnvironment: "mtnrwanda",
        sandboxPayeeMsisdn: "46733123453",
      }),
    ).toBe("250788123456");
  });
});
