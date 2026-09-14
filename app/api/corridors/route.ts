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
  payoutAvailabilityStatus,
} from "@/lib/pawapay/availability";
import { getActiveConf, getAvailability } from "@/lib/pawapay/client";
import { getPawapayConfig } from "@/lib/pawapay/config";
import {
  listDepositCountries,
  listDepositProviders,
  listPayoutCountries,
  listPayoutProviders,
} from "@/lib/pawapay/corridor";
import { listActiveFxCurrencies } from "@/lib/quotes";

const corridorListLimit = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxHits: 60,
});

type CorridorOp = "PAYOUT" | "DEPOSIT";

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
    const conf = await getActiveConf(configured.config, {
      operationType: operation,
    });
    if (!conf.ok) {
      return jsonError(conf.reason, 503);
    }

    const countries =
      operation === "DEPOSIT"
        ? listDepositCountries(conf.data)
        : listPayoutCountries(conf.data);
    if (countries.length === 0) {
      return jsonError(
        operation === "DEPOSIT"
          ? "no deposit countries configured"
          : "no payout countries configured",
        404,
      );
    }

    return jsonData({ countries });
  }

  const country = normalizeCorridorCountry(rawCountry);
  if (!country.ok) {
    return jsonError(country.reason, 400);
  }

  const [conf, availability] = await Promise.all([
    getActiveConf(configured.config, {
      country: country.country,
      operationType: operation,
    }),
    getAvailability(configured.config, {
      country: country.country,
      operationType: operation,
    }),
  ]);
  if (!conf.ok) {
    return jsonError(conf.reason, 503);
  }

  const providers =
    operation === "DEPOSIT"
      ? listDepositProviders(conf.data, country.country)
      : listPayoutProviders(conf.data, country.country);
  if (providers.length === 0) {
    return jsonError(
      operation === "DEPOSIT"
        ? "no deposit providers for this country"
        : "no payout providers for this country",
      404,
    );
  }

  const availabilityRows = availability.ok
    ? operation === "DEPOSIT"
      ? flattenDepositAvailability(availability.data)
      : flattenPayoutAvailability(availability.data)
    : [];
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

function parseOperation(value: string | null): CorridorOp {
  if (value?.trim().toUpperCase() === "DEPOSIT") {
    return "DEPOSIT";
  }
  return "PAYOUT";
}
