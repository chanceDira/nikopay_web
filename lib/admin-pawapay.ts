import { listAdminPayouts, type AdminPayout } from "@/lib/admin-payouts";
import {
  getActiveConf,
  getAvailability,
  getPayout,
  getWalletBalances,
} from "@/lib/pawapay/client";
import {
  getPawapayConfig,
  pawapayDashboardUrl,
  pawapayEnvironment,
} from "@/lib/pawapay/config";
import {
  flattenPayoutAvailability,
  type PayoutAvailabilityRow,
} from "@/lib/pawapay/availability";
import {
  listPayoutCountries,
  listPayoutProviders,
  type CorridorProviderOption,
} from "@/lib/pawapay/corridor";
import {
  inspectPayoutLiquidity,
  type PayoutLiquidityView,
} from "@/lib/pawapay/liquidity";
import type { PayoutLookupData, WalletBalance } from "@/lib/pawapay/types";

export type PawapayAvailabilityRow = PayoutAvailabilityRow;

export type AdminPawapaySnapshot = {
  configured: boolean;
  reason?: string;
  environment?: "sandbox" | "production";
  dashboardUrl?: string;
  callbackPath?: string;
  verifyCallbacks?: boolean;
  balances: WalletBalance[];
  balancesError: string | null;
  liquidity: PayoutLiquidityView[];
  availability: PawapayAvailabilityRow[];
  availabilityError: string | null;
  corridors: CorridorProviderOption[];
  corridorsError: string | null;
  payouts: AdminPayout[];
  stalledPayouts: AdminPayout[];
};

export async function loadAdminPawapaySnapshot(): Promise<AdminPawapaySnapshot> {
  const payoutsResult = await listAdminPayouts();
  const payouts = payoutsResult.ok
    ? payoutsResult.payouts.filter((row) => row.rail === "pawapay")
    : [];

  const configured = getPawapayConfig();
  if (!configured.ok) {
    return {
      configured: false,
      reason: configured.reason,
      balances: [],
      balancesError: configured.reason,
      liquidity: [],
      availability: [],
      availabilityError: configured.reason,
      corridors: [],
      corridorsError: configured.reason,
      payouts,
      stalledPayouts: stalledAdminPayouts(payouts),
    };
  }

  const config = configured.config;
  const [balances, availability, conf] = await Promise.all([
    getWalletBalances(config),
    getAvailability(config, { operationType: "PAYOUT" }),
    getActiveConf(config, { operationType: "PAYOUT" }),
  ]);

  const balanceRows = balances.ok ? balances.data : [];
  const liquidity = await loadLiquidityViews(balanceRows);

  return {
    configured: true,
    environment: pawapayEnvironment(config.baseUrl),
    dashboardUrl: pawapayDashboardUrl(config.baseUrl),
    callbackPath: config.callbackPath,
    verifyCallbacks: config.verifyCallbacks,
    balances: balanceRows,
    balancesError: balances.ok ? null : balances.reason,
    liquidity,
    availability: availability.ok
      ? flattenPayoutAvailability(availability.data)
      : [],
    availabilityError: availability.ok ? null : availability.reason,
    corridors: conf.ok ? flattenPayoutCorridors(conf.data) : [],
    corridorsError: conf.ok ? null : conf.reason,
    payouts,
    stalledPayouts: stalledAdminPayouts(payouts),
  };
}

export async function loadLivePawapayPayout(
  payoutId: string,
): Promise<
  | { ok: true; data: PayoutLookupData | null }
  | { ok: false; reason: string; status: number }
> {
  const configured = getPawapayConfig();
  if (!configured.ok) {
    return { ok: false, reason: configured.reason, status: 503 };
  }

  const lookup = await getPayout(configured.config, payoutId);
  if (!lookup.ok) {
    return { ok: false, reason: lookup.reason, status: 503 };
  }

  if (lookup.data.status === "NOT_FOUND") {
    return { ok: true, data: null };
  }

  return { ok: true, data: lookup.data.data };
}

const STALL_MS = 15 * 60 * 1000;

function stalledAdminPayouts(payouts: AdminPayout[]): AdminPayout[] {
  const cutoff = Date.now() - STALL_MS;
  return payouts.filter((row) => {
    if (row.status !== "pending" && row.status !== "enqueued") {
      return false;
    }
    return new Date(row.createdAt).getTime() < cutoff;
  });
}

function flattenPayoutCorridors(conf: unknown): CorridorProviderOption[] {
  const countries = listPayoutCountries(conf);
  const options: CorridorProviderOption[] = [];
  for (const country of countries) {
    options.push(...listPayoutProviders(conf, country.country));
  }
  return options;
}

async function loadLiquidityViews(
  balances: WalletBalance[],
): Promise<PayoutLiquidityView[]> {
  const keys = uniqueCorridors(balances);
  if (!keys.some((row) => row.country === "RWA" && row.currency === "RWF")) {
    keys.unshift({ country: "RWA", currency: "RWF" });
  }
  return Promise.all(
    keys.map((row) =>
      inspectPayoutLiquidity({ country: row.country, currency: row.currency }),
    ),
  );
}

function uniqueCorridors(
  rows: WalletBalance[],
): Array<{ country: string; currency: string }> {
  const seen = new Set<string>();
  const out: Array<{ country: string; currency: string }> = [];
  for (const row of rows) {
    const key = `${row.country}:${row.currency}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push({ country: row.country, currency: row.currency });
  }
  return out;
}
