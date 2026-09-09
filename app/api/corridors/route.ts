import { jsonData, jsonError } from "@/lib/http";
import { normalizeCorridorCountry } from "@/lib/corridor";
import {
  allowIpRequest,
  clientIp,
  createIpRateLimiter,
} from "@/lib/ip-rate-limit";
import {
  flattenPayoutAvailability,
  payoutAvailabilityStatus,
} from "@/lib/pawapay/availability";
import { getActiveConf, getAvailability } from "@/lib/pawapay/client";
import { getPawapayConfig } from "@/lib/pawapay/config";
import {
  listPayoutCountries,
  listPayoutProviders,
} from "@/lib/pawapay/corridor";

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

  const rawCountry = new URL(request.url).searchParams.get("country")?.trim();

  if (!rawCountry) {
    const conf = await getActiveConf(configured.config, {
      operationType: "PAYOUT",
    });
    if (!conf.ok) {
      return jsonError(conf.reason, 503);
    }

    const countries = listPayoutCountries(conf.data);
    if (countries.length === 0) {
      return jsonError("no payout countries configured", 404);
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
      operationType: "PAYOUT",
    }),
    getAvailability(configured.config, {
      country: country.country,
      operationType: "PAYOUT",
    }),
  ]);
  if (!conf.ok) {
    return jsonError(conf.reason, 503);
  }

  const providers = listPayoutProviders(conf.data, country.country);
  if (providers.length === 0) {
    return jsonError("no payout providers for this country", 404);
  }

  const availabilityRows = availability.ok
    ? flattenPayoutAvailability(availability.data)
    : [];

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
    })),
  });
}
