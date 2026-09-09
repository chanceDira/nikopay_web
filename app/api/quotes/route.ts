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
import { createServerQuote } from "@/lib/quotes";

const quoteLimit = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxHits: 40,
});

export async function POST(request: Request) {
  if (!allowIpRequest(quoteLimit, clientIp(request))) {
    return jsonError("too many quote requests", 429);
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

  const result = await createServerQuote(
    amount.amount,
    body.chain,
    body.currency ?? "RWF",
  );
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData(result.quote, 201);
}
