import { toNumber } from "@/lib/numbers";
import { getWalletBalances } from "@/lib/pawapay/client";
import { getPawapayConfig, type PawapayConfig } from "@/lib/pawapay/config";
import type { WalletBalance } from "@/lib/pawapay/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const PAYOUTS_PAUSED_REASON = "Payouts are paused. Try again shortly.";

const BALANCE_TTL_MS = 15_000;

const COMMITTED_PAYOUT_STATUSES = [
  "detected",
  "credited",
  "payout_pending",
  "manual_review",
] as const;

const BALANCE_CACHE_KEY = "all";

export type ReservedIntentRow = {
  status: string;
  netRwf: number;
};

type BalanceCache = {
  key: string;
  at: number;
  data: WalletBalance[];
};

let balanceCache: BalanceCache | null = null;

export function clearPayoutLiquidityCache(): void {
  balanceCache = null;
}

export function walletAvailableForCorridor(
  balances: readonly WalletBalance[],
  country: string,
  currency: string,
): number | null {
  const countryCode = country.trim().toUpperCase();
  const currencyCode = currency.trim().toUpperCase();
  let best: number | null = null;
  for (const row of balances) {
    if (
      row.country.trim().toUpperCase() !== countryCode ||
      row.currency.trim().toUpperCase() !== currencyCode
    ) {
      continue;
    }
    const amount = toNumber(row.balance);
    if (!Number.isFinite(amount)) {
      continue;
    }
    if (best == null || amount > best) {
      best = amount;
    }
  }
  return best;
}

export function reservedPayoutTotal(
  rows: readonly ReservedIntentRow[],
): number {
  const committed = new Set<string>(COMMITTED_PAYOUT_STATUSES);
  let total = 0;
  for (const row of rows) {
    if (!committed.has(row.status)) {
      continue;
    }
    if (!Number.isFinite(row.netRwf) || row.netRwf <= 0) {
      continue;
    }
    total += row.netRwf;
  }
  return total;
}

export function canCoverPayout(
  available: number,
  reserved: number,
  amount: number,
): boolean {
  return (
    Number.isFinite(available) &&
    Number.isFinite(reserved) &&
    Number.isFinite(amount) &&
    amount > 0 &&
    amount + reserved <= available
  );
}

export async function assertPayoutFunds(input: {
  country: string;
  currency: string;
  amount: number;
}): Promise<{ ok: true } | { ok: false; reason: string; status: number }> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, reason: "payout amount is invalid", status: 400 };
  }

  const configured = getPawapayConfig();
  if (!configured.ok) {
    return { ok: true };
  }

  const wallets = await loadBalances(configured.config);
  if (!wallets.ok) {
    return { ok: false, reason: PAYOUTS_PAUSED_REASON, status: 503 };
  }

  const available = walletAvailableForCorridor(
    wallets.data,
    input.country,
    input.currency,
  );
  if (available == null) {
    return { ok: false, reason: PAYOUTS_PAUSED_REASON, status: 409 };
  }

  const reserved = await loadReservedPayoutTotal(input.country, input.currency);
  if (!reserved.ok) {
    return { ok: false, reason: PAYOUTS_PAUSED_REASON, status: 503 };
  }

  if (!canCoverPayout(available, reserved.amount, input.amount)) {
    return { ok: false, reason: PAYOUTS_PAUSED_REASON, status: 409 };
  }

  return { ok: true };
}

async function loadBalances(
  config: PawapayConfig,
): Promise<{ ok: true; data: WalletBalance[] } | { ok: false }> {
  if (
    balanceCache &&
    balanceCache.key === BALANCE_CACHE_KEY &&
    Date.now() - balanceCache.at < BALANCE_TTL_MS
  ) {
    return { ok: true, data: balanceCache.data };
  }

  const loaded = await getWalletBalances(config);
  if (!loaded.ok) {
    return { ok: false };
  }

  balanceCache = {
    key: BALANCE_CACHE_KEY,
    at: Date.now(),
    data: loaded.data,
  };
  return { ok: true, data: loaded.data };
}

async function loadReservedPayoutTotal(
  country: string,
  currency: string,
): Promise<{ ok: true; amount: number } | { ok: false }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_intents")
    .select("status, net_rwf")
    .eq("country", country)
    .eq("currency", currency)
    .in("status", [...COMMITTED_PAYOUT_STATUSES]);

  if (error) {
    return { ok: false };
  }

  const rows: ReservedIntentRow[] = (data ?? []).map((row) => ({
    status: row.status,
    netRwf: toNumber(row.net_rwf),
  }));

  return { ok: true, amount: reservedPayoutTotal(rows) };
}
