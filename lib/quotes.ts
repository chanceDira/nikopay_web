import { loadCorridorFees } from "@/lib/corridor-fees";
import { normalizeCorridorCurrency } from "@/lib/corridor";
import { DEFAULT_FX_CURRENCY } from "@/lib/fx-currencies";
import { toNumber } from "@/lib/numbers";
import { MAX_USDT, PREVIEW_MAX_USDT } from "@/lib/quote-limits";
import { defaultCountryForCurrency } from "@/lib/settlement/corridor-fee-defaults";
import { createQuote, localDecimalsForCurrency } from "@/lib/settlement/quote";
import {
  isChainId,
  type ChainId,
  type FxConfig,
  type Quote,
} from "@/lib/settlement/types";
import { createAdminClient } from "@/lib/supabase/admin";

export { MAX_USDT } from "@/lib/quote-limits";

export const QUOTE_TTL_MS = 15 * 60 * 1000;
export const DEFAULT_QUOTE_CURRENCY = DEFAULT_FX_CURRENCY;

export function quoteFxErrorStatus(reason: string): 409 | 503 {
  return reason.startsWith("no live NikoPay rate") ? 409 : 503;
}

export async function listActiveFxCurrencies(): Promise<
  { ok: true; currencies: Set<string> } | { ok: false; reason: string }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("fx_rates")
    .select("currency, effective_to");

  if (error) {
    return { ok: false, reason: "unable to load exchange rate" };
  }

  const now = Date.now();
  const currencies = new Set<string>();
  for (const row of data ?? []) {
    if (!row.effective_to || new Date(row.effective_to).getTime() > now) {
      currencies.add(row.currency);
    }
  }

  return { ok: true, currencies };
}

export async function loadActiveFx(
  currency: string = DEFAULT_QUOTE_CURRENCY,
): Promise<{ ok: true; fx: FxConfig } | { ok: false; reason: string }> {
  const normalized = normalizeCorridorCurrency(currency);
  if (!normalized.ok) {
    return { ok: false, reason: normalized.reason };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("fx_rates")
    .select(
      "currency, usdt_to_rwf, fee_percent, min_usdt, effective_from, effective_to",
    )
    .eq("currency", normalized.currency)
    .order("effective_from", { ascending: false })
    .limit(8);

  if (error) {
    return { ok: false, reason: "unable to load exchange rate" };
  }

  const now = Date.now();
  const current = (data ?? []).find((row) => {
    if (!row.effective_to) {
      return true;
    }
    return new Date(row.effective_to).getTime() > now;
  });

  if (!current) {
    return {
      ok: false,
      reason: `no live NikoPay rate for ${normalized.currency} yet`,
    };
  }

  const rate = toNumber(current.usdt_to_rwf);
  const fx: FxConfig = {
    currency: normalized.currency,
    usdtToLocal: rate,
    usdtToRwf: rate,
    feePercent: toNumber(current.fee_percent),
    minUsdt: toNumber(current.min_usdt),
  };

  return { ok: true, fx };
}

export async function createServerQuote(input: {
  chain: unknown;
  currency?: unknown;
  country?: unknown;
  provider?: unknown;
  usdtAmount?: number;
  netLocal?: number;
  /** Homepage calculator only. Raises the USDT ceiling; payments stay on MAX_USDT. */
  preview?: boolean;
}): Promise<
  { ok: true; quote: Quote } | { ok: false; reason: string; status: number }
> {
  if (!isChainId(input.chain)) {
    return {
      ok: false,
      reason: "chain must be polygon or base",
      status: 400,
    };
  }

  const currencyResult = normalizeCorridorCurrency(
    input.currency ?? DEFAULT_QUOTE_CURRENCY,
  );
  if (!currencyResult.ok) {
    return { ok: false, reason: currencyResult.reason, status: 400 };
  }

  const hasUsdt = input.usdtAmount != null;
  const hasNet = input.netLocal != null;
  if (hasUsdt === hasNet) {
    return {
      ok: false,
      reason: "quote requires either usdt amount or recipient amount",
      status: 400,
    };
  }

  const maxUsdt = input.preview ? PREVIEW_MAX_USDT : MAX_USDT;
  if (input.usdtAmount != null && input.usdtAmount > maxUsdt) {
    return {
      ok: false,
      reason: `usdt amount must be at most ${maxUsdt}`,
      status: 400,
    };
  }

  const chainReady = await assertChainActive(input.chain);
  if (!chainReady.ok) {
    return { ok: false, reason: chainReady.reason, status: 409 };
  }

  const fxResult = await loadActiveFx(currencyResult.currency);
  if (!fxResult.ok) {
    return {
      ok: false,
      reason: fxResult.reason,
      status: quoteFxErrorStatus(fxResult.reason),
    };
  }

  const country =
    typeof input.country === "string"
      ? defaultCountryForCurrency(currencyResult.currency, input.country)
      : defaultCountryForCurrency(currencyResult.currency);
  const provider =
    typeof input.provider === "string" ? input.provider : undefined;

  const fees = await loadCorridorFees({
    currency: currencyResult.currency,
    nikopayPercent: fxResult.fx.feePercent,
    country,
    provider,
  });

  const quoted = createQuote({
    chain: input.chain,
    fx: fxResult.fx,
    fees,
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS),
    usdtAmount: input.usdtAmount,
    netLocal: input.netLocal,
    decimals: localDecimalsForCurrency(currencyResult.currency),
  });

  if (!quoted.ok) {
    return { ok: false, reason: quoted.reason, status: 400 };
  }

  if (quoted.quote.usdtAmount > maxUsdt) {
    return {
      ok: false,
      reason: `usdt amount must be at most ${maxUsdt}`,
      status: 400,
    };
  }

  return { ok: true, quote: quoted.quote };
}

export async function assertChainActive(
  chain: ChainId,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chains")
    .select("is_active")
    .eq("id", chain)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "chain is not available" };
  }

  if (!data.is_active) {
    return { ok: false, reason: "chain is not available" };
  }

  return { ok: true };
}
