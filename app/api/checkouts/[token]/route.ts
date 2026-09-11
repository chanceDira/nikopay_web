import { jsonData, jsonError } from "@/lib/http";
import {
  allowIpRequest,
  clientIp,
  createIpRateLimiter,
} from "@/lib/ip-rate-limit";
import { loadPublicCheckout } from "@/lib/checkouts";

const checkoutLimit = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxHits: 40,
});

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  if (!allowIpRequest(checkoutLimit, clientIp(request))) {
    return jsonError("too many checkout requests", 429);
  }

  const { token } = await context.params;
  const result = await loadPublicCheckout(token);
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData({ checkout: result.checkout });
}
