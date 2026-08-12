import { describe, expect, it } from "vitest";
import {
  isPastExpiry,
  shouldExpireIntent,
  statusAfterExpiryCheck,
} from "@/lib/settlement/expiry";

describe("expiry", () => {
  const now = new Date("2026-08-12T12:00:00.000Z");

  it("detects past expiry", () => {
    expect(isPastExpiry("2026-08-12T11:59:59.000Z", now)).toBe(true);
    expect(isPastExpiry("2026-08-12T12:00:00.000Z", now)).toBe(true);
    expect(isPastExpiry("2026-08-12T12:00:01.000Z", now)).toBe(false);
  });

  it("only expires awaiting_payment intents", () => {
    const expiredAt = "2026-08-12T11:00:00.000Z";

    expect(
      shouldExpireIntent(
        { status: "awaiting_payment", expiresAt: expiredAt },
        now,
      ),
    ).toBe(true);

    expect(
      shouldExpireIntent({ status: "detected", expiresAt: expiredAt }, now),
    ).toBe(false);

    expect(
      shouldExpireIntent({ status: "credited", expiresAt: expiredAt }, now),
    ).toBe(false);
  });

  it("returns expired status when awaiting and past expiry", () => {
    expect(
      statusAfterExpiryCheck(
        {
          status: "awaiting_payment",
          expiresAt: "2026-08-12T11:00:00.000Z",
        },
        now,
      ),
    ).toBe("expired");

    expect(
      statusAfterExpiryCheck(
        {
          status: "awaiting_payment",
          expiresAt: "2026-08-12T13:00:00.000Z",
        },
        now,
      ),
    ).toBe("awaiting_payment");
  });

  it("rejects invalid timestamps", () => {
    expect(() => isPastExpiry("not-a-date", now)).toThrow(/invalid timestamp/);
  });
});
