import { asRecord, jsonData, jsonError, readJsonBody } from "@/lib/http";
import { normalizeMsisdn } from "@/lib/identity";
import {
  allowIpRequest,
  clientIp,
  createIpRateLimiter,
} from "@/lib/ip-rate-limit";
import { getActiveConf } from "@/lib/pawapay/client";
import { getPawapayConfig } from "@/lib/pawapay/config";
import { pickPayoutCorridor } from "@/lib/pawapay/corridor";
import { resolvePayoutProvider } from "@/lib/pawapay/sandbox";

const corridorPredictLimit = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxHits: 30,
});

export async function POST(request: Request) {
  if (!allowIpRequest(corridorPredictLimit, clientIp(request))) {
    return jsonError("too many corridor requests", 429);
  }

  const configured = getPawapayConfig();
  if (!configured.ok) {
    return jsonError(configured.reason, 503);
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonError("invalid request body", 400);
  }

  const body = asRecord(parsed.body);
  if (!body) {
    return jsonError("invalid request body", 400);
  }

  const msisdn = normalizeMsisdn(body.phoneNumber ?? body.msisdn);
  if (!msisdn.ok) {
    return jsonError(msisdn.reason, 400);
  }

  const predicted = await resolvePayoutProvider(
    configured.config,
    msisdn.msisdn,
  );
  if (!predicted.ok) {
    return jsonError(predicted.reason, 409);
  }

  const conf = await getActiveConf(configured.config, {
    country: predicted.data.country,
    operationType: "PAYOUT",
  });
  if (!conf.ok) {
    return jsonError(conf.reason, 503);
  }

  const corridor = pickPayoutCorridor(conf.data, {
    country: predicted.data.country,
    provider: predicted.data.provider,
  });
  if (!corridor) {
    return jsonError("payout corridor is not configured", 409);
  }

  return jsonData({
    country: corridor.country,
    provider: corridor.provider,
    currency: corridor.currency,
    phoneNumber: predicted.data.phoneNumber,
    decimalsInAmount: corridor.decimalsInAmount,
    minAmount: corridor.minAmount,
    maxAmount: corridor.maxAmount,
  });
}
