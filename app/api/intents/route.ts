import {
  asRecord,
  jsonData,
  jsonError,
  parseUsdtAmount,
  readJsonBody,
} from "@/lib/http";
import {
  allowIpRequest,
  clientIp,
  createIpRateLimiter,
} from "@/lib/ip-rate-limit";
import { createPaymentIntent, listPaymentIntents } from "@/lib/intents";

const intentWriteLimit = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxHits: 20,
});

const intentListLimit = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxHits: 30,
});

export async function POST(request: Request) {
  if (!allowIpRequest(intentWriteLimit, clientIp(request))) {
    return jsonError("too many payment requests", 429);
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonError("invalid request body", 400);
  }

  const body = asRecord(parsed.body);
  if (!body) {
    return jsonError("invalid request body", 400);
  }

  const amount = parseUsdtAmount(body.usdtAmount);
  if (!amount.ok) {
    return jsonError(amount.reason, 400);
  }

  const netLocal =
    body.netLocal == null
      ? undefined
      : typeof body.netLocal === "number" &&
          Number.isFinite(body.netLocal) &&
          body.netLocal > 0
        ? body.netLocal
        : null;
  if (netLocal === null) {
    return jsonError("recipient amount must be a positive number", 400);
  }

  const result = await createPaymentIntent({
    usdtAmount: amount.amount,
    netLocal,
    chain: body.chain,
    msisdn: body.msisdn,
    walletAddress: body.walletAddress,
    country: body.country,
    currency: body.currency,
    provider: body.provider,
    notifyEmail: body.notifyEmail,
    checkoutToken: body.checkoutToken,
  });

  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData(result.intent, 201);
}

export async function GET(request: Request) {
  if (!allowIpRequest(intentListLimit, clientIp(request))) {
    return jsonError("too many payment requests", 429);
  }

  const walletAddress = new URL(request.url).searchParams.get("wallet");
  const result = await listPaymentIntents(walletAddress);

  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  const masked = result.intents.map((intent) => {
    const rest = { ...intent } as Record<string, unknown>;
    delete rest.msisdn;
    delete rest.notifyEmail;
    return rest;
  });

  return jsonData(masked);
}
