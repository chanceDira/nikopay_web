import { jsonData, jsonError } from "@/lib/http";
import { normalizeCorridorCountry } from "@/lib/corridor";
import {
  allowIpRequest,
  clientIp,
  createIpRateLimiter,
} from "@/lib/ip-rate-limit";
import {
  flattenDepositAvailability,
  flattenPayoutAvailability,
  flattenRemittanceAvailability,
  payoutAvailabilityStatus,
  type PayoutAvailabilityRow,
} from "@/lib/pawapay/availability";
import {
  getActiveConfForOperation,
  getAvailability,
  type PawapayOperationType,
} from "@/lib/pawapay/client";
import { getPawapayConfig } from "@/lib/pawapay/config";
import {
  listDepositCountries,
  listDepositProviders,
  listPayoutCountries,
  listPayoutProviders,
  listRemittanceCountries,
  listRemittanceProviders,
} from "@/lib/pawapay/corridor";
import { listActiveFxCurrencies } from "@/lib/quotes";

const corridorListLimit = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxHits: 60,
});

export async function GET(request: Request) {
  if (!allowIpRequest(corridorListLimit, clientIp(request))) {
    return jsonError("too many corridor requests", 429);
  }

  const configured = getPawapayConfig();
  if (!configured.ok) {
    return jsonError(configured.reason, 503);
  }

  const url = new URL(request.url);
  const operation = parseOperation(url.searchParams.get("operation"));
  const rawCountry = url.searchParams.get("country")?.trim();

  if (!rawCountry) {
    const conf = await getActiveConfForOperation(configured.config, operation);
    if (!conf.ok) {
      return jsonError(conf.reason, 503);
    }

    const countries = countriesFor(conf.data, operation);
    if (countries.length === 0) {
      return jsonError(emptyCountriesReason(operation), 404);
    }

    return jsonData({ countries });
  }

  const country = normalizeCorridorCountry(rawCountry);
  if (!country.ok) {
    return jsonError(country.reason, 400);
  }

  const [conf, availability] = await Promise.all([
    getActiveConfForOperation(configured.config, operation, {
      country: country.country,
    }),
    getAvailability(configured.config, {
      country: country.country,
      operationType: operation,
    }),
  ]);
  if (!conf.ok) {
    return jsonError(conf.reason, 503);
  }

  const providers = providersFor(conf.data, country.country, operation);
  if (providers.length === 0) {
    return jsonError(emptyProvidersReason(operation), 404);
  }

  let availabilityRows = availability.ok
    ? flattenFor(availability.data, operation)
    : [];
  if (operation === "REMITTANCE" && availabilityRows.length === 0) {
    const fallback = await getAvailability(configured.config, {
      country: country.country,
      operationType: "PAYOUT",
    });
    availabilityRows = fallback.ok
      ? flattenPayoutAvailability(fallback.data)
      : [];
  }

  const fx = await listActiveFxCurrencies();
  const priced = fx.ok ? fx.currencies : null;

  return jsonData({
    country: country.country,
    providers: providers.map((provider) => ({
      ...provider,
      payoutStatus:
        payoutAvailabilityStatus(
          availabilityRows,
          provider.country,
          provider.provider,
        ) ?? undefined,
      ...(operation === "PAYOUT" && priced
        ? { rateConfigured: priced.has(provider.currency) }
        : {}),
    })),
  });
}

function parseOperation(value: string | null): PawapayOperationType {
  const raw = value?.trim().toUpperCase();
  if (raw === "DEPOSIT") {
    return "DEPOSIT";
  }
  if (raw === "REMITTANCE") {
    return "REMITTANCE";
  }
  return "PAYOUT";
}

function countriesFor(conf: unknown, operation: PawapayOperationType) {
  if (operation === "DEPOSIT") {
    return listDepositCountries(conf);
  }
  if (operation === "REMITTANCE") {
    return listRemittanceCountries(conf);
  }
  return listPayoutCountries(conf);
}

function providersFor(
  conf: unknown,
  country: string,
  operation: PawapayOperationType,
) {
  if (operation === "DEPOSIT") {
    return listDepositProviders(conf, country);
  }
  if (operation === "REMITTANCE") {
    return listRemittanceProviders(conf, country);
  }
  return listPayoutProviders(conf, country);
}

function flattenFor(
  countries: Parameters<typeof flattenPayoutAvailability>[0],
  operation: PawapayOperationType,
): PayoutAvailabilityRow[] {
  if (operation === "DEPOSIT") {
    return flattenDepositAvailability(countries);
  }
  if (operation === "REMITTANCE") {
    return flattenRemittanceAvailability(countries);
  }
  return flattenPayoutAvailability(countries);
}

function emptyCountriesReason(operation: PawapayOperationType): string {
  if (operation === "DEPOSIT") {
    return "no deposit countries configured";
  }
  if (operation === "REMITTANCE") {
    return "no remittance countries configured";
  }
  return "no payout countries configured";
}

function emptyProvidersReason(operation: PawapayOperationType): string {
  if (operation === "DEPOSIT") {
    return "no deposit providers for this country";
  }
  if (operation === "REMITTANCE") {
    return "no remittance providers for this country";
  }
  return "no payout providers for this country";
}
