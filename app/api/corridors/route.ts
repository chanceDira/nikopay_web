import { jsonData, jsonError } from "@/lib/http";
import { normalizeCorridorCountry } from "@/lib/corridor";
import { getActiveConf } from "@/lib/pawapay/client";
import { getPawapayConfig } from "@/lib/pawapay/config";
import { listPayoutProviders } from "@/lib/pawapay/corridor";

export async function GET(request: Request) {
  const configured = getPawapayConfig();
  if (!configured.ok) {
    return jsonError(configured.reason, 503);
  }

  const rawCountry =
    new URL(request.url).searchParams.get("country")?.trim() || "RWA";
  const country = normalizeCorridorCountry(rawCountry);
  if (!country.ok) {
    return jsonError(country.reason, 400);
  }

  const conf = await getActiveConf(configured.config, {
    country: country.country,
    operationType: "PAYOUT",
  });
  if (!conf.ok) {
    return jsonError(conf.reason, 503);
  }

  const providers = listPayoutProviders(conf.data, country.country);
  if (providers.length === 0) {
    return jsonError("no payout providers for this country", 404);
  }

  return jsonData({ country: country.country, providers });
}
