export const PAYMENT_STATUSES = [
  "awaiting_payment",
  "detected",
  "credited",
  "payout_pending",
  "paid",
  "failed",
  "expired",
  "manual_review",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const CHAIN_IDS = ["polygon", "base"] as const;

export type ChainId = (typeof CHAIN_IDS)[number];

export function isChainId(value: unknown): value is ChainId {
  return (
    typeof value === "string" &&
    (CHAIN_IDS as readonly string[]).includes(value)
  );
}

export type FxConfig = {
  usdtToRwf: number;
  feePercent: number;
  minUsdt: number;
};

export type Quote = {
  usdtAmount: number;
  rate: number;
  feePercent: number;
  feeRwf: number;
  netRwf: number;
  chain: ChainId;
  expiresAt: string;
};

export type IntentPayout = {
  status: "pending" | "successful" | "failed" | "timeout";
  referenceId: string;
  providerRef?: string;
  providerReason?: string;
  updatedAt: string;
};

export type PaymentIntent = {
  id: string;
  status: PaymentStatus;
  chain: ChainId;
  walletAddress: string;
  msisdn: string;
  usdtAmount: number;
  rate: number;
  feePercent: number;
  feeRwf: number;
  netRwf: number;
  treasuryAddress: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  depositTx?: string;
  momoRef?: string;
  notifyEmail?: string;
  payout?: IntentPayout;
};

// Returned by the public list endpoint:
// msisdn and notifyEmail omitted to avoid leaking PII
export type PaymentIntentSummary = Omit<PaymentIntent, "msisdn" | "notifyEmail">;

export type TransitionActor = "system" | "admin";

export type TransitionSuccess = {
  ok: true;
  from: PaymentStatus;
  to: PaymentStatus;
};

export type TransitionFailure = {
  ok: false;
  from: PaymentStatus;
  to: PaymentStatus;
  reason: string;
};

export type TransitionResult = TransitionSuccess | TransitionFailure;
