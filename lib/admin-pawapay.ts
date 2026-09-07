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
  listPayoutCountries,
  listPayoutProviders,
  type CorridorProviderOption,
} from "@/lib/pawapay/corridor";
import type {
  AvailabilityCountry,
  PayoutLookupData,
  WalletBalance,
} from "@/lib/pawapay/types";

export type PawapayAvailabilityRow = {
  country: string;
  provider: string;
  status: string;
};

export type AdminPawapaySnapshot = {
  configured: boolean;
  reason?: string;
  environment?: "sandbox" | "production";
  dashboardUrl?: string;
  callbackPath?: string;
  verifyCallbacks?: boolean;
  balances: WalletBalance[];
  balancesError: string | null;
  availability: PawapayAvailabilityRow[];
  availabilityError: string | null;
  corridors: CorridorProviderOption[];
  corridorsError: string | null;
  payouts: AdminPayout[];
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
      availability: [],
      availabilityError: configured.reason,
      corridors: [],
      corridorsError: configured.reason,
      payouts,
    };
  }

  const config = configured.config;
  const [balances, availability, conf] = await Promise.all([
    getWalletBalances(config),
    getAvailability(config, { operationType: "PAYOUT" }),
    getActiveConf(config, { operationType: "PAYOUT" }),
  ]);

  return {
    configured: true,
    environment: pawapayEnvironment(config.baseUrl),
    dashboardUrl: pawapayDashboardUrl(config.baseUrl),
    callbackPath: config.callbackPath,
    verifyCallbacks: config.verifyCallbacks,
    balances: balances.ok ? balances.data : [],
    balancesError: balances.ok ? null : balances.reason,
    availability: availability.ok
      ? flattenPayoutAvailability(availability.data)
      : [],
    availabilityError: availability.ok ? null : availability.reason,
    corridors: conf.ok ? flattenPayoutCorridors(conf.data) : [],
    corridorsError: conf.ok ? null : conf.reason,
    payouts,
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

function flattenPayoutAvailability(
  countries: AvailabilityCountry[],
): PawapayAvailabilityRow[] {
  const rows: PawapayAvailabilityRow[] = [];
  for (const country of countries) {
    for (const provider of country.providers) {
      for (const op of provider.operationTypes) {
        if (op.operationType.toUpperCase() !== "PAYOUT") {
          continue;
        }
        rows.push({
          country: country.country,
          provider: provider.provider,
          status: op.status,
        });
      }
    }
  }
  return rows.sort((a, b) =>
    `${a.country}${a.provider}`.localeCompare(`${b.country}${b.provider}`),
  );
}

function flattenPayoutCorridors(conf: unknown): CorridorProviderOption[] {
  const countries = listPayoutCountries(conf);
  const options: CorridorProviderOption[] = [];
  for (const country of countries) {
    options.push(...listPayoutProviders(conf, country.country));
  }
  return options;
}
