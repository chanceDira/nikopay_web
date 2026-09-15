import type { AmountDecimals } from "@/lib/pawapay/amount";
import type { ChainId, FxConfig, Quote } from "@/lib/settlement/types";

/** Y PawaPay % of X, P MNO fixed in local, Q NikoPay % of X. */
export type CorridorFees = {
  pawapayPercent: number;
  mnoFixed: number;
  nikopayPercent: number;
};

export const DEFAULT_PAWAPAY_PERCENT = 1;
export const DEFAULT_MNO_FIXED = 0;

const INTEGER_LOCAL = new Set([
  "BIF",
  "GNF",
  "KMF",
  "MGA",
  "RWF",
  "UGX",
  "VND",
  "XAF",
  "XOF",
]);

export function localDecimalsForCurrency(currency: string): AmountDecimals {
  return INTEGER_LOCAL.has(currency.trim().toUpperCase())
    ? "NONE"
    : "TWO_PLACES";
}

export function roundLocalAmount(
  value: number,
  decimals: AmountDecimals,
): number {
  if (!Number.isFinite(value)) {
    return NaN;
  }
  if (decimals === "NONE") {
    return Math.round(value);
  }
  return Math.round(value * 100) / 100;
}

export function isValidCorridorFees(fees: CorridorFees): boolean {
  return (
    Number.isFinite(fees.pawapayPercent) &&
    fees.pawapayPercent >= 0 &&
    fees.pawapayPercent < 100 &&
    Number.isFinite(fees.mnoFixed) &&
    fees.mnoFixed >= 0 &&
    Number.isFinite(fees.nikopayPercent) &&
    fees.nikopayPercent >= 0 &&
    fees.nikopayPercent < 100
  );
}

export type QuoteStack = {
  netLocal: number;
  pawapayFeeLocal: number;
  mnoFeeLocal: number;
  nikopayFeeLocal: number;
  feeLocal: number;
  grossLocal: number;
  usdtAmount: number;
};

/**
 * T = X + Y + P + Q, USDT = T / rate.
 * Y = X * pawapay%, P = mno fixed, Q = X * nikopay%.
 */
export function stackFromNetLocal(
  netLocal: number,
  rate: number,
  fees: CorridorFees,
  decimals: AmountDecimals,
): QuoteStack | null {
  if (
    !Number.isFinite(netLocal) ||
    netLocal <= 0 ||
    !Number.isFinite(rate) ||
    rate <= 0 ||
    !isValidCorridorFees(fees)
  ) {
    return null;
  }

  const X = roundLocalAmount(netLocal, decimals);
  if (X <= 0) {
    return null;
  }

  const Y = roundLocalAmount(X * (fees.pawapayPercent / 100), decimals);
  const P = roundLocalAmount(fees.mnoFixed, decimals);
  const Q = roundLocalAmount(X * (fees.nikopayPercent / 100), decimals);
  const T = roundLocalAmount(X + Y + P + Q, decimals);
  if (T <= 0) {
    return null;
  }

  return {
    netLocal: X,
    pawapayFeeLocal: Y,
    mnoFeeLocal: P,
    nikopayFeeLocal: Q,
    feeLocal: roundLocalAmount(Y + P + Q, decimals),
    grossLocal: T,
    usdtAmount: Number((T / rate).toFixed(6)),
  };
}

/** Invert T = USDT * rate = X*(1+y+q) + P. */
export function stackFromUsdt(
  usdtAmount: number,
  rate: number,
  fees: CorridorFees,
  decimals: AmountDecimals,
): QuoteStack | null {
  if (
    !Number.isFinite(usdtAmount) ||
    usdtAmount <= 0 ||
    !Number.isFinite(rate) ||
    rate <= 0 ||
    !isValidCorridorFees(fees)
  ) {
    return null;
  }

  const denom = 1 + fees.pawapayPercent / 100 + fees.nikopayPercent / 100;
  if (denom <= 0) {
    return null;
  }

  const gross = usdtAmount * rate;
  const netRaw = (gross - fees.mnoFixed) / denom;
  if (!Number.isFinite(netRaw) || netRaw <= 0) {
    return null;
  }

  return stackFromNetLocal(netRaw, rate, fees, decimals);
}

export function usdtForTargetLocal(
  localPayout: number,
  rate: number,
  fees: CorridorFees,
  decimals: AmountDecimals = "TWO_PLACES",
): number | null {
  return (
    stackFromNetLocal(localPayout, rate, fees, decimals)?.usdtAmount ?? null
  );
}

/** @deprecated Q-only inverse. Prefer usdtForTargetLocal with CorridorFees. */
export function usdtForTargetRwf(
  rwfPayout: number,
  rate: number,
  feePercent: number,
): number | null {
  return usdtForTargetLocal(
    rwfPayout,
    rate,
    {
      pawapayPercent: 0,
      mnoFixed: 0,
      nikopayPercent: feePercent,
    },
    "NONE",
  );
}

export function netLocalForUsdt(
  usdtAmount: number,
  rate: number,
  fees: CorridorFees,
  decimals: AmountDecimals = "TWO_PLACES",
): number | null {
  return stackFromUsdt(usdtAmount, rate, fees, decimals)?.netLocal ?? null;
}

/** @deprecated Q-only net. Prefer netLocalForUsdt with CorridorFees. */
export function netRwfForUsdt(
  usdtAmount: number,
  rate: number,
  feePercent: number,
): number | null {
  return netLocalForUsdt(
    usdtAmount,
    rate,
    {
      pawapayPercent: 0,
      mnoFixed: 0,
      nikopayPercent: feePercent,
    },
    "NONE",
  );
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

export type CreateQuoteInput = {
  chain: ChainId;
  fx: FxConfig;
  fees: CorridorFees;
  expiresAt: Date | string;
  usdtAmount?: number;
  netLocal?: number;
  decimals?: AmountDecimals;
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

function quoteFromStack(
  input: CreateQuoteInput,
  stack: QuoteStack,
  expiresAt: string,
): Quote {
  const currency = input.fx.currency?.trim().toUpperCase() || "RWF";
  return {
    usdtAmount: stack.usdtAmount,
    chain: input.chain,
    rate: input.fx.usdtToLocal || input.fx.usdtToRwf,
    feePercent: input.fees.nikopayPercent,
    pawapayPercent: input.fees.pawapayPercent,
    mnoFixed: input.fees.mnoFixed,
    currency,
    feeLocal: stack.feeLocal,
    netLocal: stack.netLocal,
    pawapayFeeLocal: stack.pawapayFeeLocal,
    mnoFeeLocal: stack.mnoFeeLocal,
    nikopayFeeLocal: stack.nikopayFeeLocal,
    grossLocal: stack.grossLocal,
    feeRwf: stack.feeLocal,
    netRwf: stack.netLocal,
    expiresAt,
  };
}

export function createQuote(input: CreateQuoteInput): CreateQuoteResult {
  const { fx, fees } = input;
  const rate = fx.usdtToLocal || fx.usdtToRwf;
  const hasUsdt = input.usdtAmount != null;
  const hasNet = input.netLocal != null;

  if (hasUsdt === hasNet) {
    return {
      ok: false,
      reason: "quote requires either usdt amount or recipient amount",
    };
  }

  if (!Number.isFinite(rate) || rate <= 0) {
    return { ok: false, reason: "exchange rate must be a positive number" };
  }

  if (!isValidCorridorFees(fees)) {
    return { ok: false, reason: "fee schedule is invalid" };
  }

  if (input.usdtAmount != null && input.usdtAmount < fx.minUsdt) {
    return {
      ok: false,
      reason: `usdt amount must be at least ${fx.minUsdt}`,
    };
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

  const decimals = input.decimals ?? localDecimalsForCurrency(currency);
  const stack =
    input.netLocal != null
      ? stackFromNetLocal(input.netLocal, rate, fees, decimals)
      : stackFromUsdt(input.usdtAmount ?? 0, rate, fees, decimals);

  if (!stack) {
    return {
      ok: false,
      reason:
        input.netLocal != null
          ? "recipient amount is too small after fees"
          : "usdt amount must be a positive number",
    };
  }

  if (stack.usdtAmount < fx.minUsdt) {
    return {
      ok: false,
      reason: `usdt amount must be at least ${fx.minUsdt}`,
    };
  }

  return {
    ok: true,
    quote: quoteFromStack(input, stack, expiresAt),
  };
}
