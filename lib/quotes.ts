import { normalizeCorridorCurrency } from "@/lib/corridor";
import { DEFAULT_FX_CURRENCY } from "@/lib/fx-currencies";
import { toNumber } from "@/lib/numbers";
import { createQuote } from "@/lib/settlement/quote";
import {
  isChainId,
  type ChainId,
  type FxConfig,
  type Quote,
} from "@/lib/settlement/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const QUOTE_TTL_MS = 15 * 60 * 1000;
export const MAX_USDT = 10_000;
export const DEFAULT_QUOTE_CURRENCY = DEFAULT_FX_CURRENCY;

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
      reason: `no active exchange rate for ${normalized.currency}`,
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

export async function createServerQuote(
  usdtAmount: number,
  chain: unknown,
  currency: unknown = DEFAULT_QUOTE_CURRENCY,
): Promise<
  { ok: true; quote: Quote } | { ok: false; reason: string; status: number }
> {
  if (!isChainId(chain)) {
    return {
      ok: false,
      reason: "chain must be polygon or base",
      status: 400,
    };
  }

  const currencyResult = normalizeCorridorCurrency(
    currency ?? DEFAULT_QUOTE_CURRENCY,
  );
  if (!currencyResult.ok) {
    return { ok: false, reason: currencyResult.reason, status: 400 };
  }

  if (usdtAmount > MAX_USDT) {
    return {
      ok: false,
      reason: `usdt amount must be at most ${MAX_USDT}`,
      status: 400,
    };
  }

  const chainReady = await assertChainActive(chain);
  if (!chainReady.ok) {
    return { ok: false, reason: chainReady.reason, status: 409 };
  }

  const fxResult = await loadActiveFx(currencyResult.currency);
  if (!fxResult.ok) {
    return { ok: false, reason: fxResult.reason, status: 503 };
  }

  const quoted = createQuote({
    usdtAmount,
    chain,
    fx: fxResult.fx,
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS),
  });

  if (!quoted.ok) {
    return { ok: false, reason: quoted.reason, status: 400 };
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
