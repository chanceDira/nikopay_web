import type { ChainId, FxConfig, Quote } from "@/lib/settlement/types";

export type CreateQuoteInput = {
  usdtAmount: number;
  chain: ChainId;
  fx: FxConfig;
  expiresAt: Date | string;
};

export type CreateQuoteFailure = {
  ok: false;
  reason: string;
};

export type CreateQuoteSuccess = {
  ok: true;
  quote: Quote;
};

export type CreateQuoteResult = CreateQuoteSuccess | CreateQuoteFailure;

export function createQuote(input: CreateQuoteInput): CreateQuoteResult {
  const { usdtAmount, chain, fx } = input;

  if (!Number.isFinite(usdtAmount) || usdtAmount <= 0) {
    return { ok: false, reason: "usdt amount must be a positive number" };
  }

  if (usdtAmount < fx.minUsdt) {
    return {
      ok: false,
      reason: `usdt amount must be at least ${fx.minUsdt}`,
    };
  }

  if (!Number.isFinite(fx.usdtToRwf) || fx.usdtToRwf <= 0) {
    return { ok: false, reason: "exchange rate must be a positive number" };
  }

  if (!Number.isFinite(fx.feePercent) || fx.feePercent < 0) {
    return { ok: false, reason: "fee percent must be zero or positive" };
  }

  const expiresAt =
    typeof input.expiresAt === "string"
      ? input.expiresAt
      : input.expiresAt.toISOString();

  if (Number.isNaN(new Date(expiresAt).getTime())) {
    return { ok: false, reason: "expiresAt must be a valid timestamp" };
  }

  const grossRwf = usdtAmount * fx.usdtToRwf;
  const feeRwf = grossRwf * (fx.feePercent / 100);
  const netRwf = grossRwf - feeRwf;

  return {
    ok: true,
    quote: {
      usdtAmount,
      chain,
      rate: fx.usdtToRwf,
      feePercent: fx.feePercent,
      feeRwf,
      netRwf,
      expiresAt,
    },
  };
}

export function usdtForTargetRwf(
  rwfPayout: number,
  rate: number,
  feePercent: number,
): number | null {
  const factor = rate * (1 - feePercent / 100);
  if (
    !Number.isFinite(rwfPayout) ||
    rwfPayout <= 0 ||
    !Number.isFinite(factor) ||
    factor <= 0
  ) {
    return null;
  }

  return Number((rwfPayout / factor).toFixed(6));
}
