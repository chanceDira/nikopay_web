import { jsonData, jsonError } from "@/lib/http";
import {
  allowIpRequest,
  clientIp,
  createIpRateLimiter,
} from "@/lib/ip-rate-limit";
import { isUuid } from "@/lib/identity";
import { revokeCheckoutLink } from "@/lib/checkouts";
import { authorizeWallet } from "@/lib/wallet-auth";

const revokeLimit = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxHits: 20,
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!allowIpRequest(revokeLimit, clientIp(request))) {
    return jsonError("too many requests", 429);
  }

  const session = authorizeWallet(request);
  if (!session.ok) {
    return jsonError(session.reason, session.status);
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return jsonError("checkout not found", 404);
  }

  const result = await revokeCheckoutLink(id, { createdBy: session.address });
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData({ checkout: result.checkout });
}
