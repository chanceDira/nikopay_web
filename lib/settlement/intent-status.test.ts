import { describe, expect, it } from "vitest";
import {
  assertTransition,
  IntentTransitionError,
  isPaymentStatus,
  isTerminalStatus,
  transitionStatus,
} from "@/lib/settlement/intent-status";
import {
  allowedTransitions,
  canTransition,
} from "@/lib/settlement/transitions";
import type { PaymentStatus } from "@/lib/settlement/types";
import { PAYMENT_STATUSES } from "@/lib/settlement/types";

describe("isPaymentStatus", () => {
  it("accepts known statuses", () => {
    for (const status of PAYMENT_STATUSES) {
      expect(isPaymentStatus(status)).toBe(true);
    }
  });

  it("rejects unknown values", () => {
    expect(isPaymentStatus("draft")).toBe(false);
    expect(isPaymentStatus(null)).toBe(false);
    expect(isPaymentStatus(1)).toBe(false);
  });
});

describe("isTerminalStatus", () => {
  it("marks paid failed and expired as terminal", () => {
    expect(isTerminalStatus("paid")).toBe(true);
    expect(isTerminalStatus("failed")).toBe(true);
    expect(isTerminalStatus("expired")).toBe(true);
  });

  it("keeps in-flight statuses non-terminal", () => {
    expect(isTerminalStatus("awaiting_payment")).toBe(false);
    expect(isTerminalStatus("manual_review")).toBe(false);
    expect(isTerminalStatus("payout_pending")).toBe(false);
  });
});

describe("happy path transitions", () => {
  const path: PaymentStatus[] = [
    "awaiting_payment",
    "detected",
    "credited",
    "payout_pending",
    "paid",
  ];

  it("allows each forward system step", () => {
    for (let i = 0; i < path.length - 1; i += 1) {
      const from = path[i];
      const to = path[i + 1];
      expect(canTransition(from, to, "system")).toBe(true);
      expect(transitionStatus(from, to, "system")).toEqual({
        ok: true,
        from,
        to,
      });
    }
  });
});

describe("system transition guards", () => {
  it("rejects no-op transitions", () => {
    expect(canTransition("credited", "credited")).toBe(false);
    expect(transitionStatus("credited", "credited")).toMatchObject({
      ok: false,
      reason: "status is unchanged",
    });
  });

  it("rejects skipping steps", () => {
    expect(canTransition("awaiting_payment", "credited")).toBe(false);
    expect(canTransition("detected", "paid")).toBe(false);
  });

  it("rejects leaving terminal states as system", () => {
    expect(canTransition("paid", "failed")).toBe(false);
    expect(canTransition("expired", "awaiting_payment")).toBe(false);
    expect(allowedTransitions("paid", "system")).toEqual([]);
  });

  it("allows awaiting_payment to expire or enter review", () => {
    expect(canTransition("awaiting_payment", "expired")).toBe(true);
    expect(canTransition("awaiting_payment", "manual_review")).toBe(true);
  });

  it("allows failure and review from credited and payout_pending", () => {
    expect(canTransition("credited", "failed")).toBe(true);
    expect(canTransition("credited", "manual_review")).toBe(true);
    expect(canTransition("payout_pending", "failed")).toBe(true);
    expect(canTransition("payout_pending", "manual_review")).toBe(true);
  });
});

describe("admin transitions", () => {
  it("allows retry from failed to payout_pending", () => {
    expect(canTransition("failed", "payout_pending", "admin")).toBe(true);
    expect(canTransition("failed", "payout_pending", "system")).toBe(false);
  });

  it("allows resolving manual_review", () => {
    expect(canTransition("manual_review", "payout_pending", "admin")).toBe(
      true,
    );
    expect(canTransition("manual_review", "failed", "admin")).toBe(true);
    expect(canTransition("manual_review", "credited", "admin")).toBe(true);
    expect(canTransition("manual_review", "payout_pending", "system")).toBe(
      false,
    );
  });

  it("still allows normal system edges when actor is admin", () => {
    expect(canTransition("awaiting_payment", "detected", "admin")).toBe(true);
  });
});

describe("assertTransition", () => {
  it("does not throw for a valid edge", () => {
    expect(() =>
      assertTransition("detected", "credited", "system"),
    ).not.toThrow();
  });

  it("throws IntentTransitionError for an invalid edge", () => {
    expect(() => assertTransition("paid", "failed", "system")).toThrow(
      IntentTransitionError,
    );

    try {
      assertTransition("paid", "failed", "system");
    } catch (error) {
      expect(error).toBeInstanceOf(IntentTransitionError);
      if (error instanceof IntentTransitionError) {
        expect(error.from).toBe("paid");
        expect(error.to).toBe("failed");
      }
    }
  });
});
