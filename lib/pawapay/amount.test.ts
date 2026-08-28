import { describe, expect, it } from "vitest";
import { formatPayoutAmount } from "@/lib/pawapay/amount";

describe("formatPayoutAmount", () => {
  it("formats NONE as a whole number", () => {
    expect(formatPayoutAmount(1, "NONE")).toBe("1");
    expect(formatPayoutAmount(1.5, "NONE")).toBeNull();
  });

  it("strips trailing zeros for TWO_PLACES", () => {
    expect(formatPayoutAmount(15, "TWO_PLACES")).toBe("15");
    expect(formatPayoutAmount(15.5, "TWO_PLACES")).toBe("15.5");
    expect(formatPayoutAmount(15.1, "TWO_PLACES")).toBe("15.1");
  });

  it("rejects non-positive amounts", () => {
    expect(formatPayoutAmount(0, "NONE")).toBeNull();
  });
});
