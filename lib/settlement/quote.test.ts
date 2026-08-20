import { describe, expect, it } from "vitest";
import { createQuote, netRwfForUsdt, usdtForTargetRwf } from "@/lib/settlement/quote";
import type { FxConfig } from "@/lib/settlement/types";

const fx: FxConfig = {
  usdtToRwf: 1350,
  feePercent: 1.5,
  minUsdt: 10,
};

describe("createQuote", () => {
  it("builds a quote with fee and net payout", () => {
    const result = createQuote({
      usdtAmount: 100,
      chain: "base",
      fx,
      expiresAt: "2026-08-12T13:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.quote).toEqual({
      usdtAmount: 100,
      chain: "base",
      rate: 1350,
      feePercent: 1.5,
      feeRwf: 2025,
      netRwf: 132975,
      expiresAt: "2026-08-12T13:00:00.000Z",
    });
  });

  it("accepts Date expiresAt", () => {
    const expiresAt = new Date("2026-08-12T13:00:00.000Z");
    const result = createQuote({
      usdtAmount: 10,
      chain: "polygon",
      fx,
      expiresAt,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.quote.expiresAt).toBe(expiresAt.toISOString());
  });

  it("rejects amounts below minimum", () => {
    const result = createQuote({
      usdtAmount: 9.99,
      chain: "base",
      fx,
      expiresAt: "2026-08-12T13:00:00.000Z",
    });

    expect(result).toEqual({
      ok: false,
      reason: "usdt amount must be at least 10",
    });
  });

  it("rejects non-positive amounts", () => {
    expect(
      createQuote({
        usdtAmount: 0,
        chain: "base",
        fx,
        expiresAt: "2026-08-12T13:00:00.000Z",
      }).ok,
    ).toBe(false);
  });

  it("rejects invalid fx config", () => {
    expect(
      createQuote({
        usdtAmount: 20,
        chain: "base",
        fx: { ...fx, usdtToRwf: 0 },
        expiresAt: "2026-08-12T13:00:00.000Z",
      }).ok,
    ).toBe(false);

    expect(
      createQuote({
        usdtAmount: 20,
        chain: "base",
        fx: { ...fx, feePercent: -1 },
        expiresAt: "2026-08-12T13:00:00.000Z",
      }).ok,
    ).toBe(false);
  });
});

describe("usdtForTargetRwf", () => {
  it("inverts quote math for a target payout", () => {
    expect(usdtForTargetRwf(132975, 1350, 1.5)).toBe(100);
  });

  it("returns null for invalid inputs", () => {
    expect(usdtForTargetRwf(0, 1350, 1.5)).toBeNull();
    expect(usdtForTargetRwf(1000, 0, 1.5)).toBeNull();
    expect(usdtForTargetRwf(1000, 1350, 100)).toBeNull();
  });
});

describe("netRwfForUsdt", () => {
  it("matches createQuote net", () => {
    expect(netRwfForUsdt(100, 1350, 1.5)).toBe(132975);
  });

  it("returns null for invalid inputs", () => {
    expect(netRwfForUsdt(0, 1350, 1.5)).toBeNull();
    expect(netRwfForUsdt(10, -1, 1.5)).toBeNull();
  });
});
