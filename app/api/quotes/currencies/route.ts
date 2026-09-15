import { jsonData, jsonError } from "@/lib/http";
import { DEFAULT_FX_CURRENCY } from "@/lib/fx-currencies";
import {
  allowIpRequest,
  clientIp,
  createIpRateLimiter,
} from "@/lib/ip-rate-limit";
import { listActiveFxCurrencies } from "@/lib/quotes";

const currenciesLimit = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxHits: 60,
});

/** Public list of currencies with a live NikoPay FX rate (landing preview + pay). */
export async function GET(request: Request) {
  if (!allowIpRequest(currenciesLimit, clientIp(request))) {
    return jsonError("too many currency list requests", 429);
  }

  const result = await listActiveFxCurrencies();
  if (!result.ok) {
    return jsonError(result.reason, 503);
  }

  const preferred = DEFAULT_FX_CURRENCY;
  const rest = [...result.currencies]
    .filter((code) => code !== preferred)
    .sort();
  const currencies = result.currencies.has(preferred)
    ? [preferred, ...rest]
    : rest;

  return jsonData({ currencies });
}
