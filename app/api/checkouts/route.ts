import { asRecord, jsonData, jsonError, readJsonBody } from "@/lib/http";
import {
  allowIpRequest,
  clientIp,
  createIpRateLimiter,
} from "@/lib/ip-rate-limit";
import { normalizeWalletAddress } from "@/lib/identity";
import { createCheckoutLink, listCheckoutLinks } from "@/lib/checkouts";

const listLimit = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxHits: 40,
});

const writeLimit = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxHits: 15,
});

export async function GET(request: Request) {
  if (!allowIpRequest(listLimit, clientIp(request))) {
    return jsonError("too many requests", 429);
  }

  const wallet = normalizeWalletAddress(
    new URL(request.url).searchParams.get("wallet"),
  );
  if (!wallet.ok) {
    return jsonError(wallet.reason, 400);
  }

  const result = await listCheckoutLinks({ createdBy: wallet.address });
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData({ checkouts: result.checkouts });
}

export async function POST(request: Request) {
  if (!allowIpRequest(writeLimit, clientIp(request))) {
    return jsonError("too many requests", 429);
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

  const result = await createCheckoutLink({
    label: body.label,
    usdtAmount: body.usdtAmount,
    country: body.country,
    currency: body.currency,
    provider: body.provider,
    msisdn: body.msisdn,
    expiresHours: body.expiresHours,
    createdBy: wallet.address,
  });

  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData({ checkout: result.checkout }, 201);
}
