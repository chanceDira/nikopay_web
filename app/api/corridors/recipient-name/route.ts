import { asRecord, jsonData, jsonError, readJsonBody } from "@/lib/http";
import { normalizeCorridorProvider } from "@/lib/corridor";
import { normalizeMsisdn } from "@/lib/identity";
import {
  allowIpRequest,
  clientIp,
  createIpRateLimiter,
} from "@/lib/ip-rate-limit";
import { previewRecipientName } from "@/lib/recipient-name";

const recipientNameLimit = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxHits: 30,
});

export async function POST(request: Request) {
  if (!allowIpRequest(recipientNameLimit, clientIp(request))) {
    return jsonError("too many name lookup requests", 429);
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonError("invalid request body", 400);
  }

  const body = asRecord(parsed.body);
  if (!body) {
    return jsonError("invalid request body", 400);
  }

  const msisdn = normalizeMsisdn(body.msisdn);
  if (!msisdn.ok) {
    return jsonError(msisdn.reason, 400);
  }

  const provider = normalizeCorridorProvider(body.provider);
  if (!provider.ok) {
    return jsonError(provider.reason, 400);
  }

  const country =
    typeof body.country === "string" ? body.country.trim().toUpperCase() : "";
  if (country !== "RWA") {
    return jsonData({
      status: "unavailable",
      displayName: null,
      source: null,
    });
  }

  const preview = await previewRecipientName({
    country,
    provider: provider.provider,
    msisdn: msisdn.msisdn,
  });

  return jsonData(preview);
}
