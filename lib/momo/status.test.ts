import { describe, expect, it } from "vitest";
import {
  formatMomoAmount,
  mapMomoProviderStatus,
  payeeMsisdnForPayout,
  transferAmountForMomo,
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
  it("requires the sandbox override in sandbox", () => {
    expect(
      payeeMsisdnForPayout({
        intentMsisdn: "250788123456",
        targetEnvironment: "sandbox",
        sandboxPayeeMsisdn: "46733123450",
      }),
    ).toBe("46733123450");

    expect(
      payeeMsisdnForPayout({
        intentMsisdn: "250788123456",
        targetEnvironment: "sandbox",
        sandboxPayeeMsisdn: null,
      }),
    ).toBeNull();
  });

  it("keeps the intent number in production", () => {
    expect(
      payeeMsisdnForPayout({
        intentMsisdn: "250788123456",
        targetEnvironment: "mtnrwanda",
        sandboxPayeeMsisdn: "46733123450",
      }),
    ).toBe("250788123456");
  });
});

describe("transferAmountForMomo", () => {
  it("uses a fixed eur amount in sandbox", () => {
    expect(
      transferAmountForMomo({ netRwf: 10000, targetEnvironment: "sandbox" }),
    ).toBe("1");
  });

  it("uses net rwf outside sandbox", () => {
    expect(
      transferAmountForMomo({
        netRwf: 10000,
        targetEnvironment: "mtnrwanda",
      }),
    ).toBe("10000");
  });
});
