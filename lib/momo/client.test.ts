import { describe, expect, it } from "vitest";
import { formatProviderReason } from "@/lib/momo/client";

describe("formatProviderReason", () => {
  it("prefers reason code and optional message", () => {
    expect(
      formatProviderReason({
        reason: "LOW_BALANCE_OR_PAYEE_LIMIT_REACHED",
      }),
    ).toBe("LOW_BALANCE_OR_PAYEE_LIMIT_REACHED");

    expect(
      formatProviderReason({
        reason: "PAYEE_NOT_FOUND",
        message: "Payee not found",
      }),
    ).toBe("PAYEE_NOT_FOUND: Payee not found");
  });

  it("falls back to reasonCode", () => {
    expect(formatProviderReason({ reasonCode: "TIMEOUT" })).toBe("TIMEOUT");
  });

  it("returns null when empty", () => {
    expect(formatProviderReason({})).toBeNull();
    expect(formatProviderReason(null)).toBeNull();
  });
});
