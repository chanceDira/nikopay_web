import { jsonData, jsonError } from "@/lib/http";
import {
  allowIpRequest,
  clientIp,
  createIpRateLimiter,
} from "@/lib/ip-rate-limit";
import { buildWalletChallenge, getWalletHmacSecret } from "@/lib/wallet-auth";

const challengeLimit = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxHits: 30,
});

export async function GET(request: Request) {
  if (!allowIpRequest(challengeLimit, clientIp(request))) {
    return jsonError("too many requests", 429);
  }

  const secret = getWalletHmacSecret();
  if (!secret) {
    return jsonError("wallet session is not configured", 503);
  }

  return jsonData({ message: buildWalletChallenge(secret) });
}
