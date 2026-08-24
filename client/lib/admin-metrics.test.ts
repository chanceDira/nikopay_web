import { describe, expect, it } from "vitest";
import {
  formatPayoutRunSummary,
  summarizeAdminIntents,
  type AdminIntentTotalsInput,
} from "@/lib/admin-metrics";
import type { PaymentStatus } from "@/lib/settlement/types";

function intent(
  overrides: Partial<AdminIntentTotalsInput> & { status: PaymentStatus },
): AdminIntentTotalsInput {
  return {
    chain: "base",
    usdtAmount: 10,
    feeRwf: 217,
    netRwf: 14283,
    ...overrides,
  };
}

describe("summarizeAdminIntents", () => {
  it("counts only paid intents as disbursed rwf", () => {
    const summary = summarizeAdminIntents([
      intent({ status: "paid", usdtAmount: 10, netRwf: 14283, feeRwf: 217 }),
      intent({
        status: "credited",
        usdtAmount: 20,
        netRwf: 28565,
        feeRwf: 435,
        depositTx: "0xabc",
      }),
      intent({
        status: "payout_pending",
        usdtAmount: 5,
        netRwf: 7141,
        feeRwf: 109,
      }),
    ]);

    expect(summary.matchedUsdt).toBe(35);
    expect(summary.matchedUsdtByChain.base).toBe(35);
    expect(summary.paidRwf).toBe(14283);
    expect(summary.paidFeesRwf).toBe(217);
    expect(summary.paidCount).toBe(1);
    expect(summary.successRate).toBe(100);
    expect(summary.averageFeePercent).toBe(1.5);
    expect(summary.averageFeeRwf).toBe(217);
  });

  it("does not treat expired quotes as volume or as failed payouts", () => {
    const summary = summarizeAdminIntents([
      intent({ status: "expired", usdtAmount: 20, netRwf: 28565, feeRwf: 435 }),
      intent({
        status: "awaiting_payment",
        usdtAmount: 10,
        netRwf: 14283,
        feeRwf: 217,
      }),
    ]);

    expect(summary.matchedUsdt).toBe(0);
    expect(summary.paidCount).toBe(0);
    expect(summary.failedCount).toBe(0);
    expect(summary.successRate).toBeNull();
    expect(summary.statusCounts.expired).toBe(1);
    expect(summary.statusCounts.awaiting_payment).toBe(1);
  });

  it("uses paid over paid plus failed for success, not expired", () => {
    const summary = summarizeAdminIntents([
      intent({ status: "paid", usdtAmount: 10, netRwf: 14283, feeRwf: 217 }),
      intent({ status: "failed", usdtAmount: 10, netRwf: 14283, feeRwf: 217 }),
      intent({ status: "expired", usdtAmount: 20, netRwf: 28565, feeRwf: 435 }),
    ]);

    expect(summary.successRate).toBe(50);
    expect(summary.matchedUsdt).toBe(20);
  });

  it("counts a deposit hash as received even if still awaiting", () => {
    const summary = summarizeAdminIntents([
      intent({
        status: "awaiting_payment",
        usdtAmount: 7.001575,
        depositTx: "0xd5d4",
      }),
    ]);

    expect(summary.matchedUsdt).toBe(7.001575);
  });
});

describe("formatPayoutRunSummary", () => {
  it("does not call an attempted batch processed", () => {
    expect(formatPayoutRunSummary([])).toBe("No payouts ready.");
    expect(
      formatPayoutRunSummary([
        { intentStatus: "payout_pending" },
        { intentStatus: "payout_pending" },
        { intentStatus: "credited" },
      ]),
    ).toBe("Checked 3. 0 paid, 2 pending, 0 failed, 0 in review.");
  });
});
