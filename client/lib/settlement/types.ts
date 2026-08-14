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

export type PaymentIntent = {
  id: string;
  status: PaymentStatus;
  chain: ChainId;
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
};

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
