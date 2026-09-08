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
  const rate = fx.usdtToLocal || fx.usdtToRwf;

  if (!Number.isFinite(usdtAmount) || usdtAmount <= 0) {
    return { ok: false, reason: "usdt amount must be a positive number" };
  }

  if (usdtAmount < fx.minUsdt) {
    return {
      ok: false,
      reason: `usdt amount must be at least ${fx.minUsdt}`,
    };
  }

  if (!Number.isFinite(rate) || rate <= 0) {
    return { ok: false, reason: "exchange rate must be a positive number" };
  }

  if (!Number.isFinite(fx.feePercent) || fx.feePercent < 0) {
    return { ok: false, reason: "fee percent must be zero or positive" };
  }

  const currency = fx.currency?.trim().toUpperCase() || "RWF";
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, reason: "currency must be a 3-letter ISO code" };
  }

  const expiresAt =
    typeof input.expiresAt === "string"
      ? input.expiresAt
      : input.expiresAt.toISOString();

  if (Number.isNaN(new Date(expiresAt).getTime())) {
    return { ok: false, reason: "expiresAt must be a valid timestamp" };
  }

  const grossLocal = usdtAmount * rate;
  const feeLocal = grossLocal * (fx.feePercent / 100);
  const netLocal = grossLocal - feeLocal;

  return {
    ok: true,
    quote: {
      usdtAmount,
      chain,
      rate,
      feePercent: fx.feePercent,
      currency,
      feeLocal,
      netLocal,
      feeRwf: feeLocal,
      netRwf: netLocal,
      expiresAt,
    },
  };
}

export function usdtForTargetLocal(
  localPayout: number,
  rate: number,
  feePercent: number,
): number | null {
  const factor = rate * (1 - feePercent / 100);
  if (
    !Number.isFinite(localPayout) ||
    localPayout <= 0 ||
    !Number.isFinite(factor) ||
    factor <= 0
  ) {
    return null;
  }

  return Number((localPayout / factor).toFixed(6));
}

/** @deprecated use usdtForTargetLocal */
export function usdtForTargetRwf(
  rwfPayout: number,
  rate: number,
  feePercent: number,
): number | null {
  return usdtForTargetLocal(rwfPayout, rate, feePercent);
}

/** Net local currency the recipient receives for a given USDT sell amount. */
export function netLocalForUsdt(
  usdtAmount: number,
  rate: number,
  feePercent: number,
): number | null {
  if (
    !Number.isFinite(usdtAmount) ||
    usdtAmount <= 0 ||
    !Number.isFinite(rate) ||
    rate <= 0 ||
    !Number.isFinite(feePercent) ||
    feePercent < 0 ||
    feePercent >= 100
  ) {
    return null;
  }

  const grossLocal = usdtAmount * rate;
  const feeLocal = grossLocal * (feePercent / 100);
  return Number((grossLocal - feeLocal).toFixed(2));
}

/** @deprecated use netLocalForUsdt */
export function netRwfForUsdt(
  usdtAmount: number,
  rate: number,
  feePercent: number,
): number | null {
  return netLocalForUsdt(usdtAmount, rate, feePercent);
}

export function feeUsdtForAmount(
  usdtAmount: number,
  feePercent: number,
): number | null {
  if (
    !Number.isFinite(usdtAmount) ||
    usdtAmount <= 0 ||
    !Number.isFinite(feePercent) ||
    feePercent < 0 ||
    feePercent >= 100
  ) {
    return null;
  }

  return Number(((usdtAmount * feePercent) / 100).toFixed(6));
}
