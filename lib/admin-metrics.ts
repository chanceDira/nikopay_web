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
  | "status"
  | "chain"
  | "currency"
  | "usdtAmount"
  | "feeRwf"
  | "netRwf"
  | "depositTx"
>;

export type AdminIntentSummary = {
  matchedUsdt: number;
  matchedUsdtByChain: Record<ChainId, number>;
  paidLocalByCurrency: Record<string, number>;
  paidFeesByCurrency: Record<string, number>;
  paidCount: number;
  failedCount: number;
  reviewCount: number;
  successRate: number | null;
  averageFeePercent: number | null;
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
  const paidLocalByCurrency: Record<string, number> = {};
  const paidFeesByCurrency: Record<string, number> = {};
  let matchedUsdt = 0;
  let paidCount = 0;
  let failedCount = 0;
  let reviewCount = 0;
  let paidLocalTotal = 0;
  let paidFeesTotal = 0;

  for (const intent of intents) {
    statusCounts[intent.status] += 1;
    const currency = intent.currency?.trim().toUpperCase() || "RWF";

    if (intent.status === "paid") {
      paidCount += 1;
      paidLocalByCurrency[currency] =
        (paidLocalByCurrency[currency] ?? 0) + intent.netRwf;
      paidFeesByCurrency[currency] =
        (paidFeesByCurrency[currency] ?? 0) + intent.feeRwf;
      paidLocalTotal += intent.netRwf;
      paidFeesTotal += intent.feeRwf;
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
  const grossPaid = paidLocalTotal + paidFeesTotal;

  return {
    matchedUsdt,
    matchedUsdtByChain,
    paidLocalByCurrency,
    paidFeesByCurrency,
    paidCount,
    failedCount,
    reviewCount,
    successRate: settled > 0 ? Math.round((paidCount / settled) * 100) : null,
    averageFeePercent:
      paidCount > 0 && grossPaid > 0
        ? Math.round((paidFeesTotal / grossPaid) * 1000) / 10
        : null,
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

export function currencyTotalsLines(
  totals: Record<string, number>,
): { currency: string; amount: number }[] {
  return Object.entries(totals)
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
