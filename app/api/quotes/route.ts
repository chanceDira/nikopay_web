import {
  asRecord,
  jsonData,
  jsonError,
  parsePositiveAmount,
  parseUsdtAmount,
  readJsonBody,
} from "@/lib/http";
import {
  normalizeCorridorCountry,
  normalizeCorridorProvider,
} from "@/lib/corridor";
import {
  allowIpRequest,
  clientIp,
  createIpRateLimiter,
} from "@/lib/ip-rate-limit";
import { assertPayoutFunds } from "@/lib/pawapay/liquidity";
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

  const hasUsdt = body.usdtAmount != null;
  const hasNet = body.netLocal != null;
  if (hasUsdt === hasNet) {
    return jsonError(
      "quote requires either usdt amount or recipient amount",
      400,
    );
  }

  let usdtAmount: number | undefined;
  let netLocal: number | undefined;
  if (hasUsdt) {
    const amount = parseUsdtAmount(body.usdtAmount);
    if (!amount.ok) {
      return jsonError(amount.reason, 400);
    }
    usdtAmount = amount.amount;
  } else {
    const amount = parsePositiveAmount(body.netLocal, "recipient amount");
    if (!amount.ok) {
      return jsonError(amount.reason, 400);
    }
    netLocal = amount.amount;
  }

  const country = normalizeCorridorCountry(body.country);
  const provider = normalizeCorridorProvider(body.provider);

  const result = await createServerQuote({
    usdtAmount,
    netLocal,
    chain: body.chain,
    currency: body.currency ?? "RWF",
    country: country.ok ? country.country : undefined,
    provider: provider.ok ? provider.provider : undefined,
  });
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  if (country.ok) {
    const funds = await assertPayoutFunds({
      country: country.country,
      currency: result.quote.currency,
      amount: result.quote.netRwf,
    });
    if (!funds.ok) {
      return jsonError(funds.reason, funds.status);
    }
  }

  return jsonData(result.quote, 201);
}
