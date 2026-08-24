import {
  PAYMENT_STATUSES,
  type ChainId,
  type PaymentIntent,
  type PaymentStatus,
} from "@/lib/settlement/types";

const RECEIVED_STATUSES = new Set<PaymentStatus>([
  "detected",
  "credited",
  "payout_pending",
  "paid",
  "failed",
  "manual_review",
]);

export type AdminIntentTotalsInput = Pick<
  PaymentIntent,
  "status" | "chain" | "usdtAmount" | "feeRwf" | "netRwf" | "depositTx"
>;

export type AdminIntentSummary = {
  matchedUsdt: number;
  matchedUsdtByChain: Record<ChainId, number>;
  paidRwf: number;
  paidFeesRwf: number;
  paidCount: number;
  failedCount: number;
  reviewCount: number;
  successRate: number | null;
  averageFeePercent: number | null;
  averageFeeRwf: number | null;
  statusCounts: Record<PaymentStatus, number>;
};

export type PayoutRunSummaryInput = {
  intentStatus: PaymentStatus;
};

function emptyChainTotals(): Record<ChainId, number> {
  return { polygon: 0, base: 0 };
}

function emptyStatusCounts(): Record<PaymentStatus, number> {
  return Object.fromEntries(
    PAYMENT_STATUSES.map((status) => [status, 0]),
  ) as Record<PaymentStatus, number>;
}

export function receivedUsdt(intent: AdminIntentTotalsInput): boolean {
  return Boolean(intent.depositTx) || RECEIVED_STATUSES.has(intent.status);
}

export function summarizeAdminIntents(
  intents: AdminIntentTotalsInput[],
): AdminIntentSummary {
  const statusCounts = emptyStatusCounts();
  const matchedUsdtByChain = emptyChainTotals();
  let matchedUsdt = 0;
  let paidRwf = 0;
  let paidFeesRwf = 0;
  let paidCount = 0;
  let failedCount = 0;
  let reviewCount = 0;

  for (const intent of intents) {
    statusCounts[intent.status] += 1;

    if (intent.status === "paid") {
      paidCount += 1;
      paidRwf += intent.netRwf;
      paidFeesRwf += intent.feeRwf;
    }
    if (intent.status === "failed") {
      failedCount += 1;
    }
    if (intent.status === "manual_review") {
      reviewCount += 1;
    }
    if (!receivedUsdt(intent)) {
      continue;
    }
    matchedUsdt += intent.usdtAmount;
    matchedUsdtByChain[intent.chain] += intent.usdtAmount;
  }

  const settled = paidCount + failedCount;
  const grossPaidRwf = paidRwf + paidFeesRwf;

  return {
    matchedUsdt,
    matchedUsdtByChain,
    paidRwf,
    paidFeesRwf,
    paidCount,
    failedCount,
    reviewCount,
    successRate: settled > 0 ? Math.round((paidCount / settled) * 100) : null,
    averageFeePercent:
      paidCount > 0 && grossPaidRwf > 0
        ? Math.round((paidFeesRwf / grossPaidRwf) * 1000) / 10
        : null,
    averageFeeRwf: paidCount > 0 ? Math.round(paidFeesRwf / paidCount) : null,
    statusCounts,
  };
}

export function formatPayoutRunSummary(
  payouts: PayoutRunSummaryInput[],
): string {
  if (payouts.length === 0) {
    return "No payouts ready.";
  }

  const paid = payouts.filter((row) => row.intentStatus === "paid").length;
  const pending = payouts.filter(
    (row) => row.intentStatus === "payout_pending",
  ).length;
  const failed = payouts.filter((row) => row.intentStatus === "failed").length;
  const review = payouts.filter(
    (row) => row.intentStatus === "manual_review",
  ).length;

  return `Checked ${payouts.length}. ${paid} paid, ${pending} pending, ${failed} failed, ${review} in review.`;
}
