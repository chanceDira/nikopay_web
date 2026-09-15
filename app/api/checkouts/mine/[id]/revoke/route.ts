import { asRecord, jsonData, jsonError, readJsonBody } from "@/lib/http";
import {
  allowIpRequest,
  clientIp,
  createIpRateLimiter,
} from "@/lib/ip-rate-limit";
import { isUuid, normalizeWalletAddress } from "@/lib/identity";
import { revokeCheckoutLink } from "@/lib/checkouts";

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

  const { id } = await context.params;
  if (!isUuid(id)) {
    return jsonError("checkout not found", 404);
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonError("invalid request body", 400);
  }

  const body = asRecord(parsed.body);
  if (!body) {
    return jsonError("invalid request body", 400);
  }

  const wallet = normalizeWalletAddress(body.walletAddress);
  if (!wallet.ok) {
    return jsonError(wallet.reason, 400);
  }

  const result = await revokeCheckoutLink(id, { createdBy: wallet.address });
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData({ checkout: result.checkout });
}
