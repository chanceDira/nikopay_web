import { equalUsdt } from "@/lib/numbers";
import { shouldExpireIntent } from "@/lib/settlement/expiry";
import type { ChainId, PaymentStatus } from "@/lib/settlement/types";

export type MatchableIntent = {
  id: string;
  status: PaymentStatus;
  chain: ChainId;
  treasuryAddress: string;
  usdtAmount: number;
  expiresAt: string;
};

export type DepositMatchInput = {
  chain: ChainId;
  toAddress: string;
  amount: number;
};

export type DepositMatch =
  | { outcome: "credited"; intentId: string }
  | { outcome: "manual_review"; intentIds: string[] }
  | { outcome: "expired"; intentIds: string[] }
  | { outcome: "unmatched" };

export function matchDeposit(
  deposit: DepositMatchInput,
  intents: readonly MatchableIntent[],
  now: Date = new Date(),
): DepositMatch {
  const treasury = deposit.toAddress.toLowerCase();
  const onTreasury = intents.filter(
    (intent) =>
      intent.status === "awaiting_payment" &&
      intent.chain === deposit.chain &&
      intent.treasuryAddress.toLowerCase() === treasury,
  );

  const live: MatchableIntent[] = [];
  const expired: MatchableIntent[] = [];
  for (const intent of onTreasury) {
    if (shouldExpireIntent(intent, now)) {
      expired.push(intent);
    } else {
      live.push(intent);
    }
  }

  const exact = [...live, ...expired].filter((intent) =>
    equalUsdt(intent.usdtAmount, deposit.amount),
  );
  if (exact.length === 1) {
    return { outcome: "credited", intentId: exact[0].id };
  }
  if (exact.length > 1) {
    return {
      outcome: "manual_review",
      intentIds: exact.map((intent) => intent.id),
    };
  }

  if (live.length === 1) {
    return { outcome: "manual_review", intentIds: [live[0].id] };
  }

  return { outcome: "unmatched" };
}
