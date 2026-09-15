import { toNumber } from "@/lib/numbers";
import { getWalletBalances } from "@/lib/pawapay/client";
import { getPawapayConfig, type PawapayConfig } from "@/lib/pawapay/config";
import type { WalletBalance } from "@/lib/pawapay/types";
import { formatLocalAmount } from "@/lib/rates";
import { createAdminClient } from "@/lib/supabase/admin";

export const PAYOUT_AMOUNT_UNAVAILABLE_REASON =
  "This amount is currently unavailable.";

/** @deprecated Use payoutAmountUnavailableReason. */
export const PAYOUTS_PAUSED_REASON = PAYOUT_AMOUNT_UNAVAILABLE_REASON;

const BALANCE_TTL_MS = 15_000;

/** Intents that still expect a float debit. Parked manual_review does not reserve. */
export const LIVE_RESERVE_STATUSES = [
  "detected",
  "credited",
  "payout_pending",
] as const;

export const OPEN_TRANSFER_STATUSES = ["pending", "enqueued"] as const;

const BALANCE_CACHE_KEY = "all";

export type ReservedIntentRow = {
  id: string;
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

export function sumPositiveAmounts(values: readonly number[]): number {
  let total = 0;
  for (const value of values) {
    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }
    total += value;
  }
  return total;
}

/**
 * Live intents reserve their net only when no open transfer already covers them.
 * Open transfer amounts are counted separately. manual_review is never reserved.
 */
export function reservedFromLiveIntents(
  intents: readonly ReservedIntentRow[],
  coveredByOpenTransfer: ReadonlySet<string>,
): number {
  const live = new Set<string>(LIVE_RESERVE_STATUSES);
  let total = 0;
  for (const row of intents) {
    if (!live.has(row.status)) {
      continue;
    }
    if (coveredByOpenTransfer.has(row.id)) {
      continue;
    }
    if (!Number.isFinite(row.netRwf) || row.netRwf <= 0) {
      continue;
    }
    total += row.netRwf;
  }
  return total;
}

/** @deprecated Prefer reservedFromLiveIntents + open transfers. Kept for call sites. */
export function reservedPayoutTotal(
  rows: readonly { status: string; netRwf: number }[],
): number {
  return reservedFromLiveIntents(
    rows.map((row, index) => ({
      id: `legacy-${index}`,
      status: row.status,
      netRwf: row.netRwf,
    })),
    new Set(),
  );
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

export function payoutAmountUnavailableReason(
  currency: string,
  spendable?: number | null,
): string {
  if (spendable == null || !Number.isFinite(spendable) || spendable <= 0) {
    return PAYOUT_AMOUNT_UNAVAILABLE_REASON;
  }

  const shown = floorSpendable(spendable, currency);
  if (shown <= 0) {
    return PAYOUT_AMOUNT_UNAVAILABLE_REASON;
  }

  return `${PAYOUT_AMOUNT_UNAVAILABLE_REASON} Up to ${formatLocalAmount(shown, currency)} is available now.`;
}

function floorSpendable(amount: number, currency: string): number {
  const code = currency.trim().toUpperCase();
  if (code === "RWF" || code === "UGX") {
    return Math.floor(amount);
  }
  return Math.floor(amount * 100) / 100;
}

export type PayoutLiquidityView = {
  country: string;
  currency: string;
  available: number | null;
  reserved: number | null;
  spendable: number | null;
  openTransfers: number | null;
  liveIntents: number | null;
  walletSource: "all" | "country" | "none" | "error";
  reservedOk: boolean;
};

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

  const wallets = await loadBalancesForCorridor(
    configured.config,
    input.country,
    input.currency,
  );
  if (!wallets.ok) {
    return {
      ok: false,
      reason: PAYOUT_AMOUNT_UNAVAILABLE_REASON,
      status: 503,
    };
  }

  const available = walletAvailableForCorridor(
    wallets.data,
    input.country,
    input.currency,
  );
  if (available == null) {
    return {
      ok: false,
      reason: PAYOUT_AMOUNT_UNAVAILABLE_REASON,
      status: 409,
    };
  }

  const reserved = await loadReservedPayoutTotal(input.country, input.currency);
  if (!reserved.ok) {
    return {
      ok: false,
      reason: PAYOUT_AMOUNT_UNAVAILABLE_REASON,
      status: 503,
    };
  }

  if (!canCoverPayout(available, reserved.amount, input.amount)) {
    return {
      ok: false,
      reason: payoutAmountUnavailableReason(
        input.currency,
        Math.max(0, available - reserved.amount),
      ),
      status: 409,
    };
  }

  return { ok: true };
}

export async function inspectPayoutLiquidity(input: {
  country: string;
  currency: string;
}): Promise<PayoutLiquidityView> {
  const configured = getPawapayConfig();
  if (!configured.ok) {
    return {
      country: input.country,
      currency: input.currency,
      available: null,
      reserved: null,
      spendable: null,
      openTransfers: null,
      liveIntents: null,
      walletSource: "none",
      reservedOk: false,
    };
  }

  const wallets = await loadBalancesForCorridor(
    configured.config,
    input.country,
    input.currency,
  );
  if (!wallets.ok) {
    return {
      country: input.country,
      currency: input.currency,
      available: null,
      reserved: null,
      spendable: null,
      openTransfers: null,
      liveIntents: null,
      walletSource: "error",
      reservedOk: false,
    };
  }

  const available = walletAvailableForCorridor(
    wallets.data,
    input.country,
    input.currency,
  );
  const reserved = await loadReservedPayoutTotal(input.country, input.currency);
  const reservedAmount = reserved.ok ? reserved.amount : null;
  const spendable =
    available != null && reservedAmount != null
      ? Math.max(0, available - reservedAmount)
      : null;

  return {
    country: input.country,
    currency: input.currency,
    available,
    reserved: reservedAmount,
    spendable,
    openTransfers: reserved.ok ? reserved.openTransfers : null,
    liveIntents: reserved.ok ? reserved.liveIntents : null,
    walletSource: available == null ? "none" : wallets.source,
    reservedOk: reserved.ok,
  };
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

async function loadBalancesForCorridor(
  config: PawapayConfig,
  country: string,
  currency: string,
): Promise<
  { ok: true; data: WalletBalance[]; source: "all" | "country" } | { ok: false }
> {
  const all = await loadBalances(config);
  if (
    all.ok &&
    walletAvailableForCorridor(all.data, country, currency) != null
  ) {
    return { ok: true, data: all.data, source: "all" };
  }

  // Same path as treasury: some accounts only return the corridor when filtered
  const scoped = await getWalletBalances(config, { country });
  if (scoped.ok) {
    if (
      walletAvailableForCorridor(scoped.data, country, currency) != null ||
      !all.ok
    ) {
      return { ok: true, data: scoped.data, source: "country" };
    }
  }

  if (all.ok) {
    return { ok: true, data: all.data, source: "all" };
  }

  return { ok: false };
}

async function loadReservedPayoutTotal(
  country: string,
  currency: string,
): Promise<
  | {
      ok: true;
      amount: number;
      openTransfers: number;
      liveIntents: number;
    }
  | { ok: false }
> {
  const supabase = createAdminClient();

  const [transfers, intents] = await Promise.all([
    supabase
      .from("payout_transfers")
      .select("intent_id, amount")
      .eq("country", country)
      .eq("currency", currency)
      .in("status", [...OPEN_TRANSFER_STATUSES]),
    supabase
      .from("payment_intents")
      .select("id, status, net_rwf")
      .eq("country", country)
      .eq("currency", currency)
      .in("status", [...LIVE_RESERVE_STATUSES]),
  ]);

  if (transfers.error || intents.error) {
    return { ok: false };
  }

  const openTransfers = sumPositiveAmounts(
    (transfers.data ?? []).map((row) => toNumber(row.amount)),
  );

  const covered = new Set<string>();
  for (const row of transfers.data ?? []) {
    if (row.intent_id) {
      covered.add(row.intent_id);
    }
  }

  const liveIntents = reservedFromLiveIntents(
    (intents.data ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      netRwf: toNumber(row.net_rwf),
    })),
    covered,
  );

  return {
    ok: true,
    amount: openTransfers + liveIntents,
    openTransfers,
    liveIntents,
  };
}
